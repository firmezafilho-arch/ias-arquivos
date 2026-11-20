// Aplica tema (claro/escuro/sistema), cor de destaque e animações
// trocando atributos no <html>. Todo o visual vem de variáveis CSS,
// então trocar de tema é instantâneo e não redesenha componentes.

import type { AppSettings } from "./api";

const media = window.matchMedia("(prefers-color-scheme: dark)");
let current: AppSettings | null = null;

function resolve(theme: AppSettings["theme"]): "dark" | "light" {
  if (theme === "system") return media.matches ? "dark" : "light";
  return theme;
}

export function applyAppearance(s: AppSettings) {
  current = s;
  const root = document.documentElement;
  root.dataset.theme = resolve(s.theme);
  root.dataset.accent = s.accent;
  root.dataset.motion = s.animations ? "on" : "off";
}

// Se o tema for "sistema", acompanha o Windows ao vivo.
media.addEventListener("change", () => {
  if (current?.theme === "system") applyAppearance(current);
});
