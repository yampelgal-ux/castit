"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Camera, IdCard, Check, ShieldCheck, ArrowRight } from "lucide-react";
import { Header } from "@/components/Header";

type Step = "selfie" | "id" | "verifying" | "done";

export default function VerifyPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("selfie");
  const [selfie, setSelfie] = useState(false);
  const [id, setId] = useState(false);

  useEffect(() => {
    if (step === "verifying") {
      const t = setTimeout(() => setStep("done"), 2200);
      return () => clearTimeout(t);
    }
  }, [step]);

  return (
    <div className="min-h-dvh">
      <Header back title="Get verified" />
      <div className="px-6 pt-4">
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <ShieldCheck className="w-4 h-4 text-violet" />
          Verification helps casting pros trust your profile.
        </div>

        <div className="mt-8 space-y-4">
          <UploadCard
            icon={Camera}
            title="Selfie"
            description="A clear photo of your face, no filters."
            done={selfie}
            onClick={() => setSelfie(true)}
          />
          <UploadCard
            icon={IdCard}
            title="Government ID"
            description="Driver's license or passport."
            done={id}
            onClick={() => setId(true)}
          />
        </div>

        {step === "selfie" && (
          <button
            disabled={!selfie || !id}
            onClick={() => setStep("verifying")}
            className={`mt-8 w-full h-14 rounded-2xl font-semibold transition-all flex items-center justify-center gap-2 ${
              selfie && id
                ? "bg-gold text-bg hover:bg-gold-light"
                : "bg-bg-elevated text-text-subtle"
            }`}
          >
            Submit for review <ArrowRight className="w-4 h-4" />
          </button>
        )}

        {step === "verifying" && (
          <div className="mt-12 flex flex-col items-center text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="w-14 h-14 rounded-full border-2 border-gold border-t-transparent"
            />
            <p className="mt-6 font-display text-xl">Reviewing your details</p>
            <p className="text-text-muted text-sm mt-1">Usually takes under a minute.</p>
          </div>
        )}

        {step === "done" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-12 text-center"
          >
            <div className="mx-auto w-16 h-16 rounded-full bg-violet/15 grid place-items-center">
              <Check className="w-8 h-8 text-violet" strokeWidth={3} />
            </div>
            <p className="mt-5 font-display text-2xl">You're verified ✓</p>
            <p className="text-text-muted text-sm mt-1 max-w-xs mx-auto">
              Casting pros will see the blue badge on your profile.
            </p>
            <button
              onClick={() => router.push("/typecast")}
              className="mt-10 w-full h-14 rounded-2xl bg-gold text-bg font-semibold hover:bg-gold-light flex items-center justify-center gap-2"
            >
              Build your Typecast <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function UploadCard({
  icon: Icon,
  title,
  description,
  done,
  onClick,
}: {
  icon: any;
  title: string;
  description: string;
  done: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full p-4 rounded-2xl border flex items-center gap-4 text-left transition-all ${
        done ? "border-violet/50 bg-violet/5" : "border-border bg-bg-elevated hover:border-border-strong"
      }`}
    >
      <div
        className={`w-12 h-12 rounded-xl grid place-items-center ${
          done ? "bg-violet text-white" : "bg-bg-muted text-text-muted"
        }`}
      >
        {done ? <Check className="w-5 h-5" strokeWidth={3} /> : <Icon className="w-5 h-5" />}
      </div>
      <div className="flex-1">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-text-muted">{description}</div>
      </div>
    </button>
  );
}
