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
      server.middlewares.use("/api/clone-page", async (req, res) => {
        if (req.method !== "POST") {
          res.writeHead(405);
          res.end("Method Not Allowed");
          return;
        }

        // Collect body
        const chunks: Buffer[] = [];
        req.on("data", (c: Buffer) => chunks.push(c));
        await new Promise<void>((r) => req.on("end", r));
        const body = JSON.parse(Buffer.concat(chunks).toString());
        const { url } = body as { url: string };

        if (!url) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "url is required" }));
          return;
        }

        // Hard 90s response timeout
        const deadline = setTimeout(() => {
          if (!res.writableEnded) {
            res.writeHead(504, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Clone timed out (90s). The page may be too slow or blocked." }));
          }
        }, 90_000);

        try {
          // Dynamically import the clone engine (keeps cold-start out of Vite startup)
          const { runClone } = await import("./server/clone-engine.ts");
          const result = await runClone(url);
          clearTimeout(deadline);
          if (!res.writableEnded) {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(result));
          }
        } catch (err: any) {
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
