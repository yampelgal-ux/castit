"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, ArrowRight, AlertCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export default function ProLoginPage() {
  const router = useRouter();
  const { t } = useT();
  const { setProfile, signIn } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const valid = email.includes("@") && password.length >= 6;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || loading) return;
    setLoading(true);
    setError("");

    const configured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("YOUR_");

    if (configured) {
      const { data, error: signErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signErr) { setError(signErr.message); setLoading(false); return; }
      if (data.user) {
        const { data: prof } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
        if (prof) {
          setProfile({
            name: prof.name || "",
            email,
            role: "Casting Pro",
            username: prof.username || "",
            avatarSeed: prof.name || "pro",
          });
          signIn(data.user.id);
        }
      }
    } else {
      // Demo fallback
      setProfile({ name: email.split("@")[0], email, role: "Casting Pro", username: email.split("@")[0], avatarSeed: "demo" });
      signIn();
    }

    router.push("/pro/dashboard");
  }

  return (
    <div className="min-h-dvh bg-bg">
      <Header back title={t("proAuth.loginHeader")} />
      <form onSubmit={submit} className="px-6 pt-6 space-y-5">
        <h2 className="font-display text-3xl leading-tight">{t("proAuth.loginTitle")}</h2>
        <p className="text-text-muted text-sm -mt-3">{t("proAuth.loginSub")}</p>

        <div className="space-y-3 pt-2">
          <label className="flex items-center gap-3 h-14 px-4 rounded-2xl bg-bg-elevated border border-border focus-within:border-gold/50">
            <Mail className="w-4 h-4 text-text-subtle" />
            <input
              type="email"
              placeholder={t("proAuth.workEmail")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm"
            />
          </label>
          <label className="flex items-center gap-3 h-14 px-4 rounded-2xl bg-bg-elevated border border-border focus-within:border-gold/50">
            <Lock className="w-4 h-4 text-text-subtle" />
            <input
              type="password"
              placeholder={t("proAuth.passwordPlain")}
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

        <button
          type="submit"
          disabled={!valid || loading}
          className={cn(
            "flex items-center justify-center gap-2 w-full h-14 rounded-2xl font-semibold",
            valid && !loading ? "bg-gold text-bg" : "bg-bg-elevated text-text-subtle"
          )}
        >
          {loading ? t("proAuth.signingIn") : t("proAuth.signInBtn")}
          {!loading && <ArrowRight className="w-4 h-4" />}
        </button>

        <p className="text-center text-[11px] text-text-subtle">
          {t("proAuth.newHere")} <Link href="/pro/signup" className="text-gold font-semibold">{t("proAuth.openAccount")}</Link>
        </p>
      </form>
    </div>
  );
}
