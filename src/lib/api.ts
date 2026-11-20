// Ponte tipada entre a interface e o backend em Rust.
// Toda chamada ao backend passa por aqui: um lugar só para tipos e erros.
//
// Se a interface for aberta fora do app (npm run dev no navegador),
// usa um "backend falso" em memória para dar para desenhar as telas.

import { invoke } from "@tauri-apps/api/core";

export type Theme = "system" | "dark" | "light";
export type Accent = "violet" | "blue" | "green" | "orange";

export interface AppSettings {
  theme: Theme;
  accent: Accent;
  minimizeToTray: boolean;
  startWithWindows: boolean;
  startMinimized: boolean;
  animations: boolean;
}

export interface VaultEntry {
  id: string;
  provider: string;
  label: string;
  hint: string;
  createdAt: number;
}

export interface Diagnostics {
  version: string;
  startupMs: number | null;
  memoryMb: number;
  processCount: number;
  cpuCores: number;
  os: string;
  dataDir: string;
  logDir: string;
  dbSchema: number;
  uptimeS: number;
}

export const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

async function call<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri) return mock(cmd, args) as T;
  try {
    return await invoke<T>(cmd, args);
  } catch (e) {
    // O backend sempre devolve texto legível.
    throw new Error(typeof e === "string" ? e : String(e));
  }
}

export const api = {
  appReady: () => call<number>("app_ready"),
  getSettings: () => call<AppSettings>("get_settings"),
  saveSettings: (settings: AppSettings) => call<AppSettings>("save_settings", { settings }),
  vaultList: () => call<VaultEntry[]>("vault_list"),
  vaultAdd: (key: string, label: string) => call<VaultEntry>("vault_add", { key, label }),
  vaultRemove: (id: string) => call<void>("vault_remove", { id }),
  vaultDetect: (key: string) => call<string | null>("vault_detect", { key }),
  diagnostics: () => call<Diagnostics>("get_diagnostics"),
  log: (level: "info" | "warn" | "error", message: string) =>
    call<void>("log_from_ui", { level, message }).catch(() => undefined),
  openFolder: (which: "data" | "logs") => call<void>("open_folder", { which }),
};

export const PROVIDER_NAMES: Record<string, string> = {
  anthropic: "Anthropic (Claude)",
  openai: "OpenAI (ChatGPT)",
  google: "Google (Gemini)",
  xai: "xAI (Grok)",
  openrouter: "OpenRouter",
  groq: "Groq",
  perplexity: "Perplexity",
  desconhecido: "Desconhecido",
};

// ---------------- backend falso (apenas navegador) ----------------

const mockState = {
  settings: {
    theme: "system",
    accent: "violet",
    minimizeToTray: true,
    startWithWindows: false,
    startMinimized: true,
    animations: true,
  } as AppSettings,
  vault: [] as VaultEntry[],
};

function mockDetect(key: string): string | null {
  const k = key.trim();
  const rules: [string, string][] = [
    ["sk-ant-", "anthropic"], ["sk-or-", "openrouter"], ["sk-proj-", "openai"], ["xai-", "xai"],
    ["gsk_", "groq"], ["pplx-", "perplexity"], ["AIza", "google"], ["sk-", "openai"],
  ];
  return rules.find(([p]) => k.startsWith(p))?.[1] ?? null;
}

function mock(cmd: string, args: Record<string, unknown> = {}): unknown {
  switch (cmd) {
    case "app_ready": return Math.round(performance.now());
    case "get_settings": return { ...mockState.settings };
    case "save_settings": mockState.settings = args.settings as AppSettings; return { ...mockState.settings };
    case "vault_list": return [...mockState.vault];
    case "vault_detect": return mockDetect(String(args.key));
    case "vault_add": {
      const key = String(args.key).trim();
      if (key.length < 12) throw new Error("Essa API key parece incompleta ou tem espaços.");
      const provider = mockDetect(key) ?? "desconhecido";
      const e: VaultEntry = {
        id: `${provider}-${Date.now()}`, provider,
        label: String(args.label).trim() || provider,
        hint: `${key.slice(0, 4)}…${key.slice(-4)}`, createdAt: Math.floor(Date.now() / 1000),
      };
      mockState.vault.push(e);
      return e;
    }
    case "vault_remove": mockState.vault = mockState.vault.filter((v) => v.id !== args.id); return;
    case "get_diagnostics": return {
      version: "0.1.0 (navegador)", startupMs: Math.round(performance.now()), memoryMb: 0, processCount: 0,
      cpuCores: navigator.hardwareConcurrency, os: navigator.platform, dataDir: "—", logDir: "—", dbSchema: 1,
      uptimeS: Math.round(performance.now() / 1000),
    } satisfies Diagnostics;
    default: return undefined;
  }
}
