"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveProApplication } from "@/lib/cloud/trust";
import { motion } from "framer-motion";
import { Mail, Lock, User as UserIcon, Building2, ArrowRight, AlertCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { isCloudConfigured } from "@/lib/cloud/config";
import { claimDeviceForNewAccount } from "@/lib/cloud/auth";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

const ROLES = ["Casting Director", "Casting Associate", "Agent", "Manager", "Producer", "Director"] as const;
const ROLE_HE: Record<string, string> = {
  "Casting Director": "מלהק/ת", "Casting Associate": "עוזר/ת ליהוק", Agent: "סוכן/ת", Manager: "מנהל/ת אישי/ת", Producer: "מפיק/ה", Director: "במאי/ת",
};

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
  const { lang } = useT();
  const L = (he: string, en: string) => (lang === "he" ? he : en);

  const valid = name.length >= 2 && company.length >= 2 && email.includes("@") && password.length >= 6;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || loading) return;
    setLoading(true);
    setError("");

    // Hebrew names have no Latin letters, so they get a generated handle (editable later).
    const latin = name.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");
    const username = (latin.length >= 3 ? latin : `user${latin}`) + Math.random().toString(36).slice(2, 6);
    if (isCloudConfigured()) {
      const { data, error: signErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, role: "casting_pro" },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });
      if (signErr) {
        setError(/already registered|already exists/i.test(signErr.message) ? L("כבר יש חשבון עם המייל הזה. אפשר להתחבר.", "An account with this email already exists. Sign in instead.") : signErr.message);
        setLoading(false); return;
      }
      if (data.user && !data.session) {
        // Email confirmation is on: the account isn't usable until confirmed.
        setError(L("שלחנו מייל לאישור החשבון. אשרו אותו ואז התחברו.", "Check your email to confirm, then sign in."));
        setLoading(false);
        return;
      }
      if (data.user) {
        claimDeviceForNewAccount(data.user.id);
        if (data.session) {
          await supabase.from("profiles").upsert({
            id: data.user.id,
            username,
            name,
            role: "casting_pro",
            bio: `${proRole} at ${company}`,
          }, { onConflict: "id" });
        }
        signIn(data.user.id);
        if (data.session) await saveProApplication({ company, job_title: proRole });
      }
    } else {
      signIn();
    }

    setProfile({ name, email, role: "Casting Pro", username, avatarSeed: name, studio: company });
    completeOnboarding();
    router.push("/pro/dashboard");
  }

  return (
    <div className="min-h-dvh bg-bg">
      <Header back title={L("חשבון מלהקים", "Open Pro account")} />
      <form onSubmit={submit} className="px-6 pt-4 space-y-5">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="font-display text-3xl leading-tight">
            {L("ברוכים הבאים ל-", "Welcome to ")}<em className="text-gold-gradient not-italic">CastIt Pro</em>.
          </h2>
          <p className="text-text-muted text-sm mt-1.5">{L("ספרו לנו איפה אתם מלהקים.", "Tell us where you cast from.")}</p>
        </motion.div>

        <div className="space-y-3">
          <Field icon={UserIcon} placeholder={L("שם מלא", "Your full name")} value={name} onChange={setName} />
          <Field icon={Building2} placeholder={L("חברה או משרד ליהוק", "Company or studio")} value={company} onChange={setCompany} />

          <div>
            <label className="text-[0.6875rem] uppercase tracking-wider text-text-muted px-1">{L("תפקיד", "Role")}</label>
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
                  {L(ROLE_HE[r] ?? r, r)}
                </button>
              ))}
            </div>
          </div>

          <Field icon={Mail} placeholder={L("מייל עבודה", "Work email")} type="email" value={email} onChange={setEmail} />
          <Field icon={Lock} placeholder={L("סיסמה (לפחות 6 תווים)", "Password (min 6 chars)")} type="password" value={password} onChange={setPassword} />
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
            valid && !loading ? "bg-gold text-on-accent" : "bg-bg-elevated text-text-subtle"
          )}
        >
          {loading ? L("פותחים חשבון…", "Creating account…") : L("המשך", "Continue")}
          {!loading && <ArrowRight className="w-4 h-4" />}
        </button>

        <p className="text-center text-[0.6875rem] text-text-subtle leading-relaxed">
          {L("בפתיחת חשבון את/ה מסכים/ה ל", "By creating an account you agree to the ")}
          <Link href="/terms" className="underline">{L("תנאי השימוש", "Terms of Use")}</Link>
          {L(" ול", " and ")}
          <Link href="/privacy" className="underline">{L("מדיניות הפרטיות", "Privacy Policy")}</Link>.
        </p>

        <p className="text-center text-[0.6875rem] text-text-subtle">
          {L("כבר יש לך חשבון?", "Already a Pro?")} <Link href="/pro/login" className="text-gold font-semibold">{L("כניסה", "Sign in")}</Link>
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
