"use client";
import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-6 text-center bg-bg">
        <div className="w-14 h-14 rounded-full bg-terra/15 grid place-items-center mb-4">
          <AlertTriangle className="w-6 h-6 text-terra" />
        </div>
        <h2 className="font-display text-2xl tracking-editorial mb-2">Something went off-script</h2>
        <p className="text-sm text-text-muted max-w-xs mb-6">
          A scene failed to render. Try again — usually it works on the second take.
        </p>
        <button
          onClick={this.reset}
          className="inline-flex items-center gap-2 px-4 h-11 rounded-full bg-gold text-bg font-semibold text-sm"
        >
          <RefreshCw className="w-4 h-4" /> Retake
        </button>
      </div>
    );
  }
}
