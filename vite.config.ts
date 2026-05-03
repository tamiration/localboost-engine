import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import type { Plugin, ViteDevServer } from "vite";
import type { IncomingMessage, ServerResponse } from "http";

// ---------------------------------------------------------------------------
// Clone-page Vite plugin — runs Playwright server-side on the Vite dev server
// ---------------------------------------------------------------------------
function clonePagePlugin(): Plugin {
  // Pre-load runClone at plugin init time so it's never imported inside a request
  let runClone: ((url: string) => Promise<unknown>) | null = null;

  return {
    name: "clone-page-api",

    // buildStart fires when Vite starts — load the engine here
    async buildStart() {
      try {
        // Use createRequire to load the compiled clone engine as CJS
        // This avoids Vite's own module graph interfering
        const { createRequire } = await import("module");
        const req = createRequire(import.meta.url);
        // We load clone-engine via tsx's runtime register
        // tsx is already patching require() since we started with tsx
        runClone = req("./server/clone-engine.ts").runClone;
        console.log("[clone-page] engine loaded at buildStart");
      } catch (e: any) {
        console.warn("[clone-page] engine load failed at buildStart:", e.message);
      }
    },

    configureServer(server: ViteDevServer) {
      server.middlewares.use(
        "/api/clone-page",
        async (req: IncomingMessage, res: ServerResponse) => {
          console.log("[clone-page] hit:", req.method, req.url);

          // Parse target URL from GET query or POST body
          let targetUrl = "";
          if (req.method === "GET") {
            const qs = (req.url ?? "").split("?")[1] ?? "";
            targetUrl = new URLSearchParams(qs).get("url") ?? "";
          } else if (req.method === "POST") {
            const chunks: Buffer[] = [];
            req.on("data", (c: Buffer) => chunks.push(c));
            await new Promise<void>((done) => req.on("end", done));
            try { targetUrl = JSON.parse(Buffer.concat(chunks).toString()).url ?? ""; } catch { /* noop */ }
          } else {
            res.writeHead(405, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Method Not Allowed" }));
            return;
          }

          if (!targetUrl) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "url is required" }));
            return;
          }

          // Lazy-load engine if buildStart didn't succeed
          if (!runClone) {
            try {
              const { createRequire } = await import("module");
              const r = createRequire(import.meta.url);
              runClone = r("./server/clone-engine.ts").runClone;
            } catch (e: any) {
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Clone engine failed to load: " + e.message }));
              return;
            }
          }

        const timer = setTimeout(() => {
          if (!res.writableEnded) {
            res.writeHead(504, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Clone timed out (120s). Try a faster/simpler page." }));
          }
        }, 120_000);

          try {
            const result = await runClone!(targetUrl);
            clearTimeout(timer);
            if (!res.writableEnded) {
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify(result));
            }
          } catch (err: any) {
            clearTimeout(timer);
            console.error("[clone-page] runClone error:", err.message);
            if (!res.writableEnded) {
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: err.message || "Clone failed" }));
            }
          }
        }
      );
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8081,
    hmr: { overlay: false },
    fs: { strict: false },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    mode === "development" && clonePagePlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
