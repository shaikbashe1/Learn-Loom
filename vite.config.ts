import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        icon: true,
        exportType: "named",
        namedExport: "ReactComponent",
      },
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['images/logo/logo-icon.png'],
      manifest: {
        name: 'Quovexi',
        short_name: 'Quovexi',
        description: 'Engineer your potential with AI-driven learning.',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        icons: [
          {
            src: '/images/logo/logo-icon.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/images/logo/logo-icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
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
