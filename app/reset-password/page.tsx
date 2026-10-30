"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, ArrowRight, AlertCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

// Landing page for the "reset password" email link (Supabase recovery session).
export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data: d }) => { if (d.session) setReady(true); });
    return () => data.subscription.unsubscribe();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6 || saving) return;
    setSaving(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) { setError(err.message); setSaving(false); return; }
    router.push("/login");
  }

  return (
    <div className="min-h-dvh bg-bg">
      <Header back title="New password" />
      <form onSubmit={save} className="px-6 pt-6 space-y-5">
        <h2 className="font-display text-3xl leading-tight">Choose a new password.</h2>
        {!ready && <p className="text-text-muted text-sm">Opening your reset link…</p>}
        <label className="flex items-center gap-3 h-14 px-4 rounded-2xl bg-bg-elevated border border-border focus-within:border-gold/50">
          <Lock className="w-4 h-4 text-text-subtle" />
          <input
            type="password"
            autoComplete="new-password"
            placeholder="New password (min 6 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm"
          />
        </label>
        {error && (
          <div className="flex items-center gap-2 text-terra text-sm px-1">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}
        <button
          type="submit"
          disabled={!ready || password.length < 6 || saving}
          className={cn(
            "flex items-center justify-center gap-2 w-full h-14 rounded-2xl font-semibold",
            ready && password.length >= 6 ? "bg-gold text-on-accent" : "bg-bg-elevated text-text-subtle"
          )}
        >
          {saving ? "Saving…" : "Save password"} {!saving && <ArrowRight className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
}
