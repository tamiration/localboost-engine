import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import type { Plugin } from "vite";

// Vite plugin: serves /api/clone-page directly on the Vite dev server using Playwright
function clonePagePlugin(): Plugin {
  return {
    name: "clone-page-api",
    configureServer(server) {
      // Handle both GET (with ?url=...) and POST
      server.middlewares.use("/api/clone-page", async (req, res) => {
        console.log("[clone-page] request received:", req.method, req.url);

        let targetUrl = "";

        if (req.method === "GET" || req.method === "HEAD") {
          // Parse ?url= from query string
          const qs = req.url?.includes("?") ? req.url.split("?")[1] : "";
          const params = new URLSearchParams(qs);
          targetUrl = params.get("url") || "";
        } else if (req.method === "POST") {
          const chunks: Buffer[] = [];
          req.on("data", (c: Buffer) => chunks.push(c));
          await new Promise<void>((r) => req.on("end", r));
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString());
            targetUrl = body.url;
          } catch { /* fall through */ }
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

        console.log("[clone-page] cloning:", targetUrl);

        const deadline = setTimeout(() => {
          console.log("[clone-page] TIMEOUT");
          if (!res.writableEnded) {
            res.writeHead(504, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Clone timed out (90s)." }));
          }
        }, 90_000);

        try {
          const { runClone } = await import("./server/clone-engine.ts");
          const result = await runClone(targetUrl);
          console.log("[clone-page] done, sections:", result.sections.length);
          clearTimeout(deadline);
          if (!res.writableEnded) {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(result));
          }
        } catch (err: any) {
          console.error("[clone-page] error:", err.message);
          clearTimeout(deadline);
          if (!res.writableEnded) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: err.message || "Clone failed" }));
          }
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8081,
    hmr: {
      overlay: false,
    },
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
