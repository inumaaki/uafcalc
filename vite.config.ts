import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api/uaf": {
        target: "https://lms.uaf.edu.pk",
        changeOrigin: true,
        secure: false,
        timeout: 60000,
        proxyTimeout: 60000,
        autoRewrite: true,
        cookieDomainRewrite: "",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Connection": "keep-alive"
        },
        rewrite: (path) => path.replace(/^\/api\/uaf/, ""),
        configure: (proxy, options) => {
          proxy.on("proxyRes", (proxyRes, req, res) => {
            const cookies = proxyRes.headers["set-cookie"];
            if (cookies) {
              const newCookies = cookies.map(cookie =>
                cookie.replace(/; Secure/gi, "").replace(/; SameSite=None/gi, "; SameSite=Lax")
              );
              proxyRes.headers["set-cookie"] = newCookies;
            }
          });
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
        },
      },
      "/api/legacy": {
        target: "http://121.52.152.24",
        changeOrigin: true,
        secure: false,
        timeout: 60000,
        proxyTimeout: 60000,
        autoRewrite: true,
        cookieDomainRewrite: "",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Connection": "keep-alive",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache"
        },
        rewrite: (path) => path.replace(/^\/api\/legacy/, ""),
        configure: (proxy, options) => {
          proxy.on("proxyRes", (proxyRes, req, res) => {
            const cookies = proxyRes.headers["set-cookie"];
            if (cookies) {
              const newCookies = cookies.map(cookie =>
                cookie.replace(/; Secure/gi, "").replace(/; SameSite=None/gi, "; SameSite=Lax")
              );
              proxyRes.headers["set-cookie"] = newCookies;
            }
          });
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
        },
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
