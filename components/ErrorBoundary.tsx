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
    // After a new version is deployed, an app left open still asks for the old
    // code files, which no longer exist. Reload once to pick up the new version.
    if (/ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module/i.test(`${error?.name} ${error?.message}`)) {
      try {
        const last = Number(sessionStorage.getItem("castit_chunk_reload") || 0);
        if (Date.now() - last > 30000) {
          sessionStorage.setItem("castit_chunk_reload", String(Date.now()));
          window.location.reload();
        }
      } catch {}
    }
  }

  reset = () => {
    // A plain re-render rarely fixes anything; a reload loads fresh code.
    if (typeof window !== "undefined") window.location.reload();
    else this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-6 text-center bg-bg">
        <div className="w-14 h-14 rounded-full bg-terra/15 grid place-items-center mb-4">
          <AlertTriangle className="w-6 h-6 text-terra" />
        </div>
        <h2 className="font-display text-2xl tracking-editorial mb-2" dir="auto">משהו השתבש</h2>
        <p className="text-sm text-text-muted max-w-xs mb-6" dir="auto">
          המסך לא נטען כמו שצריך. נסו שוב, בדרך כלל זה מסתדר בטייק השני.
        </p>
        <button
          onClick={this.reset}
          className="inline-flex items-center gap-2 px-4 h-11 rounded-full bg-gold text-on-accent font-semibold text-sm"
        >
          <RefreshCw className="w-4 h-4" /> לנסות שוב
        </button>
      </div>
    );
  }
}
