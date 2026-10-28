"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { Header } from "@/components/Header";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { isCloudConfigured } from "@/lib/cloud/config";
import { loadAccountIntoStore, sendPasswordReset, signInWithEmail } from "@/lib/cloud/auth";
import { startSync } from "@/lib/cloud/sync";

// Shared sign-in for talents and casting pros. The account's role (stored in
// Supabase) decides where you land — not which door you came in through.
export function LoginForm({ variant = "any" }: { variant?: "any" | "pro" }) {
  const router = useRouter();
  const { setProfile, signIn } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const valid = email.includes("@") && password.length >= 6;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || loading) return;
    setLoading(true);
    setError("");
    setInfo("");

    if (!isCloudConfigured()) {
      // Local demo mode (no Supabase project configured)
      const name = email.split("@")[0];
      setProfile({ name, email, role: variant === "pro" ? "Casting Pro" : "Talent", username: name, avatarSeed: "demo" });
      signIn();
      router.push(variant === "pro" ? "/pro/dashboard" : "/feed");
      return;
    }

    try {
      const user = await signInWithEmail(email.trim(), password);
      if (!user) throw new Error("Sign-in failed");
      // Pull this account's data onto the device before showing any screen.
      await startSync(user.id);
      const role = await loadAccountIntoStore(user);
      const st = useStore.getState();
      if (role === "Casting Pro") router.push("/pro/dashboard");
      else router.push(st.onboarded ? "/feed" : "/onboarding");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(/confirm/i.test(msg) ? "צריך לאשר את המייל קודם — בדוק/י את תיבת הדואר." : msg);
      setLoading(false);
    }
  }

  async function forgot() {
    setError("");
    if (!email.includes("@")) { setError("הקלד/י קודם את כתובת המייל"); return; }
    try {
      await sendPasswordReset(email.trim());
      setInfo("שלחנו קישור לאיפוס סיסמה למייל.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="min-h-dvh bg-bg">
      <Header back title={variant === "pro" ? "Pro sign in" : "Sign in"} />
      <form onSubmit={submit} className="px-6 pt-6 space-y-5">
        <h2 className="font-display text-3xl leading-tight">Welcome back.</h2>
        <p className="text-text-muted text-sm -mt-3">Pick up where you left off — on any device.</p>

        <div className="space-y-3 pt-2">
          <label className="flex items-center gap-3 h-14 px-4 rounded-2xl bg-bg-elevated border border-border focus-within:border-gold/50">
            <Mail className="w-4 h-4 text-text-subtle" />
            <input
              type="email"
              autoComplete="email"
              placeholder={variant === "pro" ? "Work email" : "Email"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm"
            />
          </label>
          <label className="flex items-center gap-3 h-14 px-4 rounded-2xl bg-bg-elevated border border-border focus-within:border-gold/50">
            <Lock className="w-4 h-4 text-text-subtle" />
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm"
            />
          </label>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-terra text-sm px-1">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}
        {info && (
          <div className="flex items-center gap-2 text-gold text-sm px-1">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {info}
          </div>
        )}

        <button
          type="submit"
          disabled={!valid || loading}
          className={cn(
            "flex items-center justify-center gap-2 w-full h-14 rounded-2xl font-semibold",
            valid && !loading ? "bg-gold text-on-accent" : "bg-bg-elevated text-text-subtle"
          )}
        >
          {loading ? "Signing in…" : "Sign in"}
          {!loading && <ArrowRight className="w-4 h-4" />}
        </button>

        {isCloudConfigured() && (
          <button type="button" onClick={forgot} className="block mx-auto text-[0.6875rem] text-text-muted underline underline-offset-2">
            Forgot password?
          </button>
        )}

        <p className="text-center text-[0.6875rem] text-text-subtle">
          New here?{" "}
          <Link href={variant === "pro" ? "/pro/signup" : "/signup"} className="text-gold font-semibold">
            Open an account
          </Link>
        </p>
      </form>
    </div>
  );
}
