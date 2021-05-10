import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:44444/",
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  build: {
    outDir: "../dashboard",
  },
  resolve: {
    alias: {
      "node-fetch": resolve("node_modules", "node-fetch", "browser.js"),
    },
  },
  publicDir: "/dashboard/",
  base: "/dashboard/",
});
