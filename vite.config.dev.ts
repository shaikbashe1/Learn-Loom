/**
 * vite.config.dev.ts — Development-only overrides
 *
 * This file is NOT used in production builds.
 * Run `vite --config vite.config.dev.ts` to use it.
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        icon: true,
        exportType: "named",
        namedExport: "ReactComponent",
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    warmup: { clientFiles: ["./src/main.tsx"] },
  },
});
