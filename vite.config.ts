import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// Retain prior hashed assets during local rebuilds so open tabs stay usable. CI builds start clean.
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: { target: "es2022", emptyOutDir: false, manifest: true },
});
