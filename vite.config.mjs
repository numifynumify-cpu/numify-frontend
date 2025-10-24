import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// ✅ Correct Vite config for React on Vercel
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist", // Vercel expects the built files here
  },
  server: {
    port: 5173, // local dev
    host: true,
  },
});


