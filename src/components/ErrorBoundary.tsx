import { Component, type ErrorInfo, type ReactNode } from "react";
import { api } from "../lib/api";

interface Props { children: ReactNode; compact?: boolean }
interface State { error: Error | null }

// Se uma tela quebrar, só ela mostra o erro: o resto do app continua funcionando.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    void api.log("error", `${error.message}\n${info.componentStack ?? ""}`);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className={this.props.compact ? "crash crash--compact" : "crash"}>
        <h2>Algo deu errado nesta tela</h2>
        <p className="muted">{this.state.error.message}</p>
        <p className="muted small">O erro foi registrado no log.</p>
        <button className="btn" onClick={() => this.setState({ error: null })}>Tentar de novo</button>
      </div>
    );
  }
}
