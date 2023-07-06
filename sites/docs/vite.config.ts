import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// const mdPlugin = require("vite-plugin-markdown");

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
});
