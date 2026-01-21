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
        autoRewrite: true,
        cookieDomainRewrite: "",
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
        },
      },
      "/api/legacy": {
        target: "http://121.52.152.24",
        changeOrigin: true,
        secure: false,
        autoRewrite: true,
        cookieDomainRewrite: "",
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
