import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { IconFolder, IconKey, IconRefresh, IconTrash } from "../components/Icons";
import {
  api, PROVIDER_NAMES, type Accent, type AppSettings, type Diagnostics, type Theme, type VaultEntry,
} from "../lib/api";

interface Props {
  settings: AppSettings;
  onChange: (s: AppSettings) => Promise<AppSettings>;
}

export default function Settings({ settings, onChange }: Props) {
  const [error, setError] = useState<string | null>(null);

  const set = async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setError(null);
    try {
      await onChange({ ...settings, [key]: value });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="page">
      <header className="page__header">
        <h1>Configurações</h1>
        {error && <p className="alert">{error}</p>}
      </header>

      <Section title="Aparência">
        <Row label="Tema">
          <Segmented<Theme>
            value={settings.theme}
            options={[["system", "Sistema"], ["dark", "Escuro"], ["light", "Claro"]]}
            onChange={(v) => set("theme", v)}
          />
        </Row>
        <Row label="Cor de destaque">
          <div className="swatches">
            {(["violet", "blue", "green", "orange"] as Accent[]).map((a) => (
              <button
                key={a}
                aria-label={a}
                className={`swatch swatch--${a} ${settings.accent === a ? "is-active" : ""}`}
                onClick={() => set("accent", a)}
              />
            ))}
          </div>
        </Row>
        <Row label="Animações" hint="Desligar deixa a interface ainda mais leve.">
          <Toggle checked={settings.animations} onChange={(v) => set("animations", v)} />
        </Row>
      </Section>

      <Section title="Comportamento">
        <Row label="Fechar vai para a bandeja" hint="O X esconde o app perto do relógio em vez de fechar.">
          <Toggle checked={settings.minimizeToTray} onChange={(v) => set("minimizeToTray", v)} />
        </Row>
        <Row label="Iniciar com o Windows">
          <Toggle checked={settings.startWithWindows} onChange={(v) => set("startWithWindows", v)} />
        </Row>
        <Row label="Começar escondido" hint="Ao iniciar com o Windows, abre direto na bandeja.">
          <Toggle
            checked={settings.startMinimized}
            disabled={!settings.startWithWindows}
            onChange={(v) => set("startMinimized", v)}
          />
        </Row>
      </Section>

      <VaultSection />
      <DiagnosticsSection />
    </div>
  );
}

// ---------------- Cofre de API keys ----------------

function VaultSection() {
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [detected, setDetected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => { void api.vaultList().then(setEntries).catch(() => undefined); }, []);

  useEffect(() => {
    if (key.trim().length < 4) { setDetected(null); return; }
    const t = setTimeout(() => void api.vaultDetect(key).then(setDetected), 120);
    return () => clearTimeout(t);
  }, [key]);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const entry = await api.vaultAdd(key, label);
      setEntries((list) => [...list, entry]);
      setKey(""); setLabel("");
      setMsg({ ok: true, text: `Chave de ${PROVIDER_NAMES[entry.provider] ?? entry.provider} guardada no cofre do Windows.` });
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await api.vaultRemove(id);
      setEntries((list) => list.filter((x) => x.id !== id));
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    }
  };

  return (
    <Section title="Cofre de API keys" subtitle="As chaves ficam no Gerenciador de Credenciais do Windows. O app nunca mostra a chave completa de novo.">
      <form className="vault-form" onSubmit={add}>
        <div className="field">
          <input
            type="password"
            placeholder="Cole aqui a API key"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          {key && (
            <span className={`detect ${detected ? "detect--ok" : ""}`}>
              {detected ? PROVIDER_NAMES[detected] : "Provedor não reconhecido"}
            </span>
          )}
        </div>
        <input placeholder="Apelido (opcional)" value={label} onChange={(e) => setLabel(e.target.value)} />
        <button className="btn btn--primary" disabled={busy || key.trim().length < 12}>
          <IconKey width={16} height={16} /> Guardar
        </button>
      </form>
      {msg && <p className={msg.ok ? "note note--ok" : "alert"}>{msg.text}</p>}

      {entries.length === 0 ? (
        <p className="muted small empty">Nenhuma chave guardada ainda.</p>
      ) : (
        <ul className="vault-list">
          {entries.map((e) => (
            <li key={e.id}>
              <span className={`dot dot--${e.provider}`} />
              <div className="grow">
                <strong>{e.label}</strong>
                <span className="muted small">{PROVIDER_NAMES[e.provider] ?? e.provider} · <code>{e.hint}</code></span>
              </div>
              <button className="icon-btn" title="Remover" onClick={() => remove(e.id)}>
                <IconTrash width={16} height={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

// ---------------- Diagnóstico ----------------

function DiagnosticsSection() {
  const [d, setD] = useState<Diagnostics | null>(null);

  const load = () => void api.diagnostics().then(setD).catch(() => undefined);

  useEffect(() => {
    load();
    const t = setInterval(load, 3000); // só atualiza enquanto esta tela está aberta
    return () => clearInterval(t);
  }, []);

  return (
    <Section
      title="Diagnóstico"
      subtitle="Metas da Etapa 0: abrir em menos de 1,5 s e usar menos de 150 MB parado."
      action={<button className="icon-btn" title="Atualizar" onClick={load}><IconRefresh width={16} height={16} /></button>}
    >
      {!d ? <div className="loading" /> : (
        <>
          <div className="stats">
            <Stat label="Abertura" value={d.startupMs != null ? `${d.startupMs} ms` : "—"} ok={d.startupMs != null && d.startupMs <= 1500} />
            <Stat label="Memória (app + janela)" value={d.memoryMb ? `${d.memoryMb.toFixed(0)} MB` : "—"} ok={d.memoryMb > 0 && d.memoryMb <= 150} />
            <Stat label="Processos" value={String(d.processCount || "—")} />
            <Stat label="Aberto há" value={formatUptime(d.uptimeS)} />
          </div>
          <dl className="details">
            <dt>Versão</dt><dd>{d.version}</dd>
            <dt>Sistema</dt><dd>{d.os} · {d.cpuCores} núcleos</dd>
            <dt>Banco de dados</dt><dd>esquema v{d.dbSchema}</dd>
            <dt>Dados</dt><dd className="path">{d.dataDir}</dd>
            <dt>Logs</dt><dd className="path">{d.logDir}</dd>
          </dl>
          <div className="actions">
            <button className="btn" onClick={() => void api.openFolder("data")}><IconFolder width={16} height={16} /> Abrir pasta de dados</button>
            <button className="btn" onClick={() => void api.openFolder("logs")}><IconFolder width={16} height={16} /> Abrir logs</button>
          </div>
        </>
      )}
    </Section>
  );
}

function formatUptime(s: number) {
  if (s < 60) return `${s} s`;
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  return `${Math.floor(s / 3600)} h ${Math.floor((s % 3600) / 60)} min`;
}

// ---------------- peças reutilizáveis ----------------

function Section({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="card section">
      <div className="section__head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p className="muted small">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="row">
      <div>
        <div>{label}</div>
        {hint && <div className="muted small">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={`toggle ${checked ? "is-on" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="segmented">
      {options.map(([v, l]) => (
        <button key={v} className={v === value ? "is-active" : ""} onClick={() => onChange(v)}>{l}</button>
      ))}
    </div>
  );
}

function Stat({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="stat">
      <span className="muted small">{label}</span>
      <strong>{value}</strong>
      {ok !== undefined && <span className={`pill ${ok ? "pill--ok" : "pill--warn"}`}>{ok ? "dentro da meta" : "acima da meta"}</span>}
    </div>
  );
}
