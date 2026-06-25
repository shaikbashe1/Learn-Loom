import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import path from "path";

// https://vite.dev/config/
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
    proxy: {
      '/api/piston': {
        target: process.env.PISTON_URL || 'http://localhost:2000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/piston/, '/api/v2'),
      },
    },
  },
});
