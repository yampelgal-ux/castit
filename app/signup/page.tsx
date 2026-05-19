"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Lock, User as UserIcon, Drama, Briefcase, ArrowRight, AlertCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
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

  const valid = name.length >= 2 && email.includes("@") && password.length >= 6;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || loading) return;
    setLoading(true);
    setError("");

    const username = name.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");

    const supabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("YOUR_");

    // Supabase auth is best-effort — if it fails (rate limit, existing email,
    // unreachable backend, etc.) we still let the user into the local demo flow.
    if (supabaseConfigured) {
      try {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) {
          // Don't block — show a soft warning, proceed locally.
          console.warn("Supabase signup:", signUpError.message);
        } else if (data.user) {
          try {
            await supabase.from("profiles").insert({
              id: data.user.id,
              username,
              name,
              role: role === "Talent" ? "talent" : "casting_pro",
            });
          } catch (e) {
            console.warn("Profile insert failed:", e);
          }
          signIn(data.user.id);
        }
      } catch (e) {
        console.warn("Supabase unreachable:", e);
      }
    }

    // Always proceed with local profile + onboarding.
    setProfile({ name, email, role, username, avatarSeed: name });
    signIn();
    router.push("/onboarding");
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
            valid && !loading ? "bg-gold text-bg hover:bg-gold-light" : "bg-bg-elevated text-text-subtle"
          )}
        >
          {loading ? "Creating account…" : "Continue"}
          {!loading && <ArrowRight className="w-4 h-4" />}
        </button>
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
