import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";

// Serve company.html for all /company/* routes (admin SPA)
// Serve vendor.html for all /vendor/* routes (vendor SPA)
function spaHistoryFallback(): Plugin {
  return {
    name: "spa-history-fallback",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url && (req.url === "/company" || req.url.startsWith("/company/"))) {
          req.url = "/company.html";
        } else if (req.url && (req.url === "/vendor" || req.url.startsWith("/vendor/"))) {
          req.url = "/vendor.html";
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), spaHistoryFallback()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        company: path.resolve(__dirname, "company.html"),
        vendor: path.resolve(__dirname, "vendor.html"),
      },
    },
  },
  server: {
    port: 3000,
    host: true,
    allowedHosts: [".trycloudflare.com","all"],
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
        secure: false,
      },
      "/health": {
        target: "http://localhost:4000",
        changeOrigin: true,
        secure: false,
      },
    },
  }
});
