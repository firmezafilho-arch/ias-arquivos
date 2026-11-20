import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Configuração do Vite pensada para o Tauri:
// - porta fixa (o Tauri espera o servidor de dev em 1420)
// - build mirando o WebView2 do Windows 10/11 (Chromium moderno)
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: { ignored: ["**/src-tauri/**"] },
  },
  build: {
    target: "chrome110",
    minify: "esbuild",
    sourcemap: false,
    cssCodeSplit: true,
    chunkSizeWarningLimit: 600,
  },
});
