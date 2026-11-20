import { lazy, Suspense, useCallback, useState } from "react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import {
  IconChat, IconCouncil, IconGamepad, IconHome, IconLogo, IconServer, IconSettings,
} from "./components/Icons";
import { api, type AppSettings } from "./lib/api";
import { applyAppearance } from "./lib/theme";
import Home from "./pages/Home";

// Telas carregadas sob demanda: o app abre só com o necessário.
const Settings = lazy(() => import("./pages/Settings"));
const ComingSoon = lazy(() => import("./pages/ComingSoon"));

export type PageId = "home" | "chat" | "council" | "homelab" | "gaming" | "settings";

const NAV: { id: PageId; label: string; icon: JSX.Element; group: string }[] = [
  { id: "home", label: "Início", icon: <IconHome />, group: "geral" },
  { id: "chat", label: "Chat", icon: <IconChat />, group: "ia" },
  { id: "council", label: "Conselho", icon: <IconCouncil />, group: "ia" },
  { id: "homelab", label: "Home Lab", icon: <IconServer />, group: "lab" },
  { id: "gaming", label: "Modo eFootball", icon: <IconGamepad />, group: "lab" },
];

const GROUP_LABEL: Record<string, string> = { geral: "", ia: "Orquestrador de IAs", lab: "Home Lab" };

const SOON: Record<string, { title: string; stage: number; items: string[] }> = {
  chat: { title: "Chat com IAs", stage: 1, items: ["Reconhecimento da IA pela API key", "Respostas em tempo real", "Histórico com busca"] },
  council: { title: "Conselho das IAs", stage: 2, items: ["Várias IAs respondendo juntas", "IA juíza que sintetiza", "Tempo de pensamento ajustável", "Crie suas próprias IAs"] },
  homelab: { title: "Home Lab", stage: 3, items: ["Dispositivos do Tailscale", "Home Assistant", "Wake on LAN e testes de rede"] },
  gaming: { title: "Modo eFootball", stage: 5, items: ["Perfil de jogo com um clique", "Checagem de rede e NAT", "Presets do Lossless Scaling"] },
};

export default function App({ initialSettings }: { initialSettings: AppSettings | null }) {
  const [page, setPage] = useState<PageId>("home");
  const [settings, setSettings] = useState<AppSettings | null>(initialSettings);

  const updateSettings = useCallback(async (next: AppSettings) => {
    applyAppearance(next); // resposta visual imediata
    const saved = await api.saveSettings(next);
    setSettings(saved);
    return saved;
  }, []);

  let lastGroup = "";
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <IconLogo />
          <div>
            <strong>IAS Nexus</strong>
            <span className="muted small">IA + Home Lab</span>
          </div>
        </div>

        <nav className="nav">
          {NAV.map((item) => {
            const header = item.group !== lastGroup && GROUP_LABEL[item.group];
            lastGroup = item.group;
            return (
              <div key={item.id}>
                {header && <div className="nav__group">{header}</div>}
                <button
                  className={`nav__item ${page === item.id ? "is-active" : ""}`}
                  onClick={() => setPage(item.id)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {SOON[item.id] && <span className="badge">E{SOON[item.id].stage}</span>}
                </button>
              </div>
            );
          })}
        </nav>

        <button
          className={`nav__item nav__bottom ${page === "settings" ? "is-active" : ""}`}
          onClick={() => setPage("settings")}
        >
          <IconSettings />
          <span>Configurações</span>
        </button>
      </aside>

      <main className="content">
        <ErrorBoundary key={page} compact>
          <Suspense fallback={<div className="loading" />}>
            {page === "home" && <Home onNavigate={setPage} />}
            {page === "settings" && settings && <Settings settings={settings} onChange={updateSettings} />}
            {SOON[page] && <ComingSoon {...SOON[page]} />}
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
}
