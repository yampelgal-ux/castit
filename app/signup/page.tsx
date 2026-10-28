"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Lock, User as UserIcon, Drama, Briefcase, ArrowRight, AlertCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { isCloudConfigured } from "@/lib/cloud/config";
import { claimDeviceForNewAccount } from "@/lib/cloud/auth";
import { cn } from "@/lib/utils";

export default function SignupPage() {
  const router = useRouter();
  const { setProfile, signIn } = useStore();
  const [role, setRole] = useState<"Talent" | "Casting Pro">("Talent");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [needsConfirm, setNeedsConfirm] = useState(false);

  const valid = name.length >= 2 && email.includes("@") && password.length >= 6;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || loading) return;
    setLoading(true);
    setError("");

    const username = name.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");

    // Real account when Supabase is configured; otherwise local demo mode.
    if (isCloudConfigured()) {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, role: role === "Talent" ? "talent" : "casting_pro" },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });
      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }
      if (data.user) {
        claimDeviceForNewAccount(data.user.id);
        setProfile({ name, email, role, username, avatarSeed: name });
        signIn(data.user.id);
        if (data.session) {
          await supabase.from("profiles").upsert({
            id: data.user.id,
            username,
            name,
            role: role === "Talent" ? "talent" : "casting_pro",
          }, { onConflict: "id" });
        } else {
          // Email confirmation is on: let them finish onboarding now; everything
          // is pushed to the account automatically after they confirm + sign in.
          setNeedsConfirm(true);
          setLoading(false);
          return;
        }
      }
    } else {
      setProfile({ name, email, role, username, avatarSeed: name });
      signIn();
    }

    router.push("/onboarding");
  }

  if (needsConfirm) {
    return (
      <div className="min-h-dvh">
        <Header back title="Confirm your email" />
        <div className="px-6 pt-10 space-y-5 text-center">
          <Mail className="w-10 h-10 text-gold mx-auto" />
          <h2 className="font-display text-3xl leading-tight">Check your inbox.</h2>
          <p className="text-text-muted text-sm" dir="rtl">
            שלחנו קישור אימות ל-<b className="text-text">{email}</b>. אפשר להמשיך להגדיר את הפרופיל כבר עכשיו —
            הכל יישמר בחשבון ברגע שתאשר/י את המייל ותתחבר/י.
          </p>
          <button
            onClick={() => router.push("/onboarding")}
            className="flex items-center justify-center gap-2 w-full h-14 rounded-2xl font-semibold bg-gold text-on-accent"
          >
            Continue setting up <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      <Header back title="Create account" />
      <form onSubmit={handleSubmit} className="px-6 pt-6 space-y-6">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="font-display text-3xl leading-tight">Tell us who you are.</h2>
          <p className="text-text-muted text-sm mt-1">Two seconds. Then we get to the good part.</p>
        </motion.div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { id: "Talent", icon: Drama, title: "Talent", sub: "Actor · Model · Creator" },
            { id: "Casting Pro", icon: Briefcase, title: "Casting Pro", sub: "Director · Casting · Studio" },
          ].map((r) => {
            const Icon = r.icon;
            const active = role === r.id;
            return (
              <button
                type="button"
                key={r.id}
                onClick={() => setRole(r.id as any)}
                className={cn(
                  "p-4 rounded-2xl text-left border transition-all",
                  active ? "border-gold bg-gold/5 ring-1 ring-gold/40" : "border-border bg-bg-elevated"
                )}
              >
                <Icon className={cn("w-5 h-5 mb-3", active ? "text-gold" : "text-text-muted")} />
                <div className="text-sm font-semibold">{r.title}</div>
                <div className="text-[11px] text-text-muted mt-0.5">{r.sub}</div>
              </button>
            );
          })}
        </div>

        <div className="space-y-3">
          <Field icon={UserIcon} placeholder="Full name" value={name} onChange={setName} />
          <Field icon={Mail} placeholder="Email" type="email" value={email} onChange={setEmail} />
          <Field icon={Lock} placeholder="Password (min 6 chars)" type="password" value={password} onChange={setPassword} />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-danger text-sm px-1">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!valid || loading}
          className={cn(
            "flex items-center justify-center gap-2 w-full h-14 rounded-2xl font-semibold transition-all",
            valid && !loading ? "bg-gold text-on-accent hover:bg-gold-light" : "bg-bg-elevated text-text-subtle"
          )}
        >
          {loading ? "Creating account…" : "Continue"}
          {!loading && <ArrowRight className="w-4 h-4" />}
        </button>

        <p className="text-center text-[11px] text-text-subtle">
          Already have an account? <Link href="/login" className="text-gold font-semibold">Sign in</Link>
        </p>
      </form>
    </div>
  );
}

function Field({
  icon: Icon, placeholder, value, onChange, type = "text",
}: {
  icon: any; placeholder: string; value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <label className="flex items-center gap-3 h-14 px-4 rounded-2xl bg-bg-elevated border border-border focus-within:border-gold/50 transition-colors">
      <Icon className="w-4 h-4 text-text-subtle shrink-0" />
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-transparent outline-none text-sm placeholder:text-text-subtle"
      />
    </label>
  );
}
