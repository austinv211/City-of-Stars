import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src/frontend"),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["**/src/tauri/**"],
    },
  },
  // Plain string prefixes, matched with startsWith: not globs. "TAURI_ENV_*"
  // matched nothing, so packaged builds thought they were in a browser.
  envPrefix: ["VITE_", "TAURI_ENV_"],
  build: {
    target: "chrome105",
    minify: !process.env.TAURI_ENV_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
    outDir: "dist",
  },
});
