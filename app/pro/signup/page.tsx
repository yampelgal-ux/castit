"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Lock, User as UserIcon, Building2, ArrowRight, AlertCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const ROLES = ["Casting Director", "Casting Associate", "Agent", "Manager", "Producer", "Director"] as const;

export default function ProSignupPage() {
  const router = useRouter();
  const { setProfile, signIn, completeOnboarding } = useStore();
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [proRole, setProRole] = useState<typeof ROLES[number]>("Casting Director");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const valid = name.length >= 2 && company.length >= 2 && email.includes("@") && password.length >= 6;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || loading) return;
    setLoading(true);
    setError("");

    const username = name.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");
    const configured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("YOUR_");

    if (configured) {
      const { data, error: signErr } = await supabase.auth.signUp({ email, password });
      if (signErr) { setError(signErr.message); setLoading(false); return; }
      if (data.user) {
        await supabase.from("profiles").insert({
          id: data.user.id,
          username,
          name,
          role: "casting_pro",
          bio: `${proRole} at ${company}`,
        });
        signIn(data.user.id);
      }
    }

    setProfile({ name, email, role: "Casting Pro", username, avatarSeed: name });
    completeOnboarding();
    router.push("/pro/dashboard");
  }

  return (
    <div className="min-h-dvh bg-bg">
      <Header back title="Open Pro account" />
      <form onSubmit={submit} className="px-6 pt-4 space-y-5">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="font-display text-3xl leading-tight">
            Welcome to <em className="text-gold-gradient not-italic">CastIt Pro</em>.
          </h2>
          <p className="text-text-muted text-sm mt-1.5">Tell us where you cast from.</p>
        </motion.div>

        <div className="space-y-3">
          <Field icon={UserIcon} placeholder="Your full name" value={name} onChange={setName} />
          <Field icon={Building2} placeholder="Company or studio" value={company} onChange={setCompany} />

          <div>
            <label className="text-[10px] uppercase tracking-wider text-text-muted px-1">Role</label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setProRole(r)}
                  className={cn(
                    "h-11 px-3 rounded-xl text-xs font-medium transition-all border",
                    proRole === r
                      ? "border-gold bg-gold/10 text-gold"
                      : "border-border bg-bg-elevated text-text-muted"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <Field icon={Mail} placeholder="Work email" type="email" value={email} onChange={setEmail} />
          <Field icon={Lock} placeholder="Password (min 6 chars)" type="password" value={password} onChange={setPassword} />
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
            "flex items-center justify-center gap-2 w-full h-14 rounded-2xl font-semibold transition-all",
            valid && !loading ? "bg-gold text-bg" : "bg-bg-elevated text-text-subtle"
          )}
        >
          {loading ? "Creating account…" : "Continue"}
          {!loading && <ArrowRight className="w-4 h-4" />}
        </button>

        <p className="text-center text-[11px] text-text-subtle">
          Already a Pro? <Link href="/pro/login" className="text-gold font-semibold">Sign in</Link>
        </p>
      </form>
    </div>
  );
}

function Field({ icon: Icon, placeholder, value, onChange, type = "text" }: {
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
