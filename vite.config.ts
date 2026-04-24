import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  base: "./",
  logLevel: "warn",

  plugins: [react()],

  server: {
    host: "::",
    port: 5173,
    hmr: {
      overlay: false,
    },
  },

  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    brotliSize: false,
    target: "es2020",
    minify: "esbuild" as const,
    cssCodeSplit: true,
    assetsInlineLimit: 4096,

    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react") || id.includes("react-dom") || id.includes("react-router-dom") || id.includes("@tanstack/react-query")) {
              return "vendor-react";
            }
            if (id.includes("@radix-ui") || id.includes("lucide-react") || id.includes("framer-motion") || id.includes("recharts") || id.includes("date-fns")) {
              return "vendor-ui";
            }
            return "vendor";
          }
        },
      },
    },
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
