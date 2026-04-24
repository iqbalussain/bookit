import { defineConfig, splitVendorChunkPlugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  base: "./",
  logLevel: "warn",

  plugins: [react(), splitVendorChunkPlugin()],

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
    target: "es2020",
    minify: "esbuild" as const,
    cssCodeSplit: true,
    assetsInlineLimit: 4096,
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

