export default function ComingSoon({ title, stage, items }: { title: string; stage: number; items: string[] }) {
  return (
    <div className="page page--center">
      <div className="card soon">
        <span className="badge badge--lg">Etapa {stage}</span>
        <h1>{title}</h1>
        <p className="muted">Esta área chega na Etapa {stage}. O espaço já está reservado na estrutura do app.</p>
        <ul className="checklist">
          {items.map((i) => <li key={i}>{i}</li>)}
        </ul>
      </div>
    </div>
  );
}
