import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { api } from "./lib/api";
import { applyAppearance } from "./lib/theme";
import "./styles.css";

// Qualquer erro da interface vai para o arquivo de log.
window.addEventListener("error", (e) => api.log("error", `${e.message} @ ${e.filename}:${e.lineno}`));
window.addEventListener("unhandledrejection", (e) => api.log("error", `Promise: ${String(e.reason)}`));

async function boot() {
  // 1) Aplica o tema ANTES de desenhar (sem piscar a cor errada)
  const settings = await api.getSettings().catch(() => null);
  if (settings) applyAppearance(settings);

  // 2) Desenha a interface
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App initialSettings={settings} />
      </ErrorBoundary>
    </React.StrictMode>,
  );

  // 3) Depois do primeiro quadro pintado, mostra a janela
  requestAnimationFrame(() => requestAnimationFrame(() => void api.appReady()));
}

void boot();
