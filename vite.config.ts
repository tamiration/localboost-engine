import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { spawn } from "child_process";
import type { Plugin, ViteDevServer } from "vite";
import type { IncomingMessage, ServerResponse } from "http";

// ---------------------------------------------------------------------------
// Clone-page Vite plugin
// Spawns server/clone-runner.mjs as a child process per-request so Playwright
// is fully isolated from Vite's module graph — no deadlocks, no import issues.
// ---------------------------------------------------------------------------
function clonePagePlugin(): Plugin {
  const RUNNER = path.resolve(__dirname, "server/clone-runner.mjs");

  return {
    name: "clone-page-api",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(
        "/api/clone-page",
        async (req: IncomingMessage, res: ServerResponse) => {

          // Parse target URL from GET ?url= or POST body
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

          console.log("[clone-page] spawning runner for:", targetUrl);

          // Spawn clone-runner.mjs as a completely separate Node process
          const child = spawn(process.execPath, [RUNNER, targetUrl], {
            stdio: ["ignore", "pipe", "pipe"],
            env: { ...process.env },
          });

          // Hard 110s kill
          const killer = setTimeout(() => {
            child.kill("SIGKILL");
            if (!res.writableEnded) {
              res.writeHead(504, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Clone timed out (110s). Page may be too slow." }));
            }
          }, 110_000);

          const stdout: Buffer[] = [];
          const stderr: Buffer[] = [];
          child.stdout.on("data", (d: Buffer) => stdout.push(d));
          child.stderr.on("data", (d: Buffer) => stderr.push(d));

          child.on("close", (code) => {
            clearTimeout(killer);
            if (res.writableEnded) return;

            const raw = Buffer.concat(stdout).toString();
            if (stderr.length) console.error("[clone-page] stderr:", Buffer.concat(stderr).toString().slice(0, 500));

            if (!raw) {
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: `Runner exited (code ${code}) with no output` }));
              return;
            }

            try {
              JSON.parse(raw); // validate
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(raw);
            } catch {
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Runner returned invalid JSON" }));
            }
          });

          child.on("error", (err) => {
            clearTimeout(killer);
            if (!res.writableEnded) {
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: err.message }));
            }
          });
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
