import type { PageId } from "../App";

const STAGES = [
  { n: 0, title: "Fundação", desc: "Estrutura, interface, cofre de chaves, logs e bandeja", done: true },
  { n: 1, title: "Núcleo de IA", desc: "Chat com reconhecimento automático da IA pela key", done: false },
  { n: 2, title: "Orquestração", desc: "Conselho, pipeline, tempo de pensamento, IAs próprias", done: false },
  { n: 3, title: "Home Lab básico", desc: "Tailscale, Home Assistant, Wake on LAN, rede", done: false },
  { n: 4, title: "Home Lab avançado", desc: "SSH, compartilhamentos, rclone, alertas", done: false },
  { n: 5, title: "Modo eFootball", desc: "Perfil de jogo e Lossless Scaling", done: false },
  { n: 6, title: "Ponte IA ↔ Home Lab", desc: "A IA controla o Home Lab, com sua confirmação", done: false },
  { n: 7, title: "Entrega", desc: "Instalador, atualização automática, ajuste fino", done: false },
];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

export default function Home({ onNavigate }: { onNavigate: (p: PageId) => void }) {
  return (
    <div className="page">
      <header className="page__header">
        <h1>{greeting()}, Douglas</h1>
        <p className="muted">Fundação do IAS Nexus pronta. Próximo passo: conectar as IAs.</p>
      </header>

      <section className="grid-2">
        <button className="card card--action" onClick={() => onNavigate("settings")}>
          <strong>Adicionar API keys</strong>
          <span className="muted">Guarde suas chaves no cofre do Windows. O app reconhece a IA sozinho.</span>
        </button>
        <button className="card card--action" onClick={() => onNavigate("settings")}>
          <strong>Ver desempenho</strong>
          <span className="muted">Tempo de abertura e memória em uso, ao vivo.</span>
        </button>
      </section>

      <section className="card">
        <h2>Plano de construção</h2>
        <ol className="roadmap">
          {STAGES.map((s) => (
            <li key={s.n} className={s.done ? "is-done" : ""}>
              <span className="roadmap__dot">{s.done ? "✓" : s.n}</span>
              <div>
                <strong>Etapa {s.n} – {s.title}</strong>
                <span className="muted small">{s.desc}</span>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
