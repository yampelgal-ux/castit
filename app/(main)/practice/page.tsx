"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Volume2, VolumeX, Sparkles, Send, Square, RotateCcw, Award, Pause } from "lucide-react";
import { Header } from "@/components/Header";
import { SCENES } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import {
  speak, stopSpeaking, startListening, hasSpeechRecognition,
  detectLang, type RecognitionHandle,
} from "@/lib/voice";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";

type Line = { from: "me" | "partner" | "coach"; text: string; time: string };

const PRESETS = [
  {
    id: "p1",
    title: "Job Interview Cold Read",
    yourCharacter: "Applicant",
    partnerCharacter: "Interviewer",
    context: "A demanding hiring manager probes for weaknesses. The applicant needs the job badly but cannot show desperation.",
    difficulty: "Intermediate",
  },
  {
    id: "p2",
    title: "Breakup at the Diner",
    yourCharacter: "The one being left",
    partnerCharacter: "The one leaving",
    context: "Late night, fluorescent light. One of you has decided this is over. The other doesn't know yet.",
    difficulty: "Advanced",
  },
  {
    id: "p3",
    title: "Detective Interrogation",
    yourCharacter: "Suspect",
    partnerCharacter: "Detective",
    context: "You're holding a secret. The detective knows you're holding it.",
    difficulty: "Advanced",
  },
  {
    id: "p4",
    title: "Sibling Reconciliation",
    yourCharacter: "Younger sibling",
    partnerCharacter: "Older sibling",
    context: "First conversation in three years. There's affection underneath, and unspoken hurt.",
    difficulty: "Intermediate",
  },
];

export default function PracticePage() {
  const [scene, setScene] = useState<typeof PRESETS[number] | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [voiceMode, setVoiceMode] = useState(true);
  const [partnerSpeaking, setPartnerSpeaking] = useState(false);
  const [showCoach, setShowCoach] = useState(false);
  const recognitionRef = useRef<RecognitionHandle | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { profile } = useStore();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines, interim]);

  useEffect(() => () => {
    recognitionRef.current?.stop();
    stopSpeaking();
  }, []);

  function reset() {
    stopSpeaking();
    recognitionRef.current?.stop();
    setLines([]);
    setText("");
    setInterim("");
    setListening(false);
    setPartnerSpeaking(false);
  }

  async function send(t: string, opts: { coach?: boolean } = {}) {
    if (!t.trim() || loading || !scene) return;
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const me: Line = { from: "me", text: t, time };
    const next = [...lines, me];
    setLines(next);
    setText("");
    setInterim("");
    setLoading(true);

    try {
      const apiMessages = next
        .filter((l) => l.from !== "coach")
        .map((l) => ({
          role: l.from === "me" ? "user" : "assistant",
          content: l.text,
        }));

      const res = await fetch("/api/aria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          userName: profile.name || "talent",
          userTypecast: profile.typecast,
          mode: opts.coach ? "coach" : "scene_partner",
          scene: opts.coach ? undefined : {
            title: scene.title,
            yourCharacter: scene.yourCharacter,
            partnerCharacter: scene.partnerCharacter,
            context: scene.context,
          },
        }),
      });

      const { text: reply } = await res.json();
      const replyMsg: Line = {
        from: opts.coach ? "coach" : "partner",
        text: reply || "…",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setLines((l) => [...l, replyMsg]);

      if (voiceMode && !opts.coach) {
        setPartnerSpeaking(true);
        speak({
          text: reply,
          voice: scene.partnerCharacter.toLowerCase().includes("interviewer") ? "male" : "female",
          tone: "powerful",
          lang: detectLang(reply),
          onEnd: () => setPartnerSpeaking(false),
          onError: () => setPartnerSpeaking(false),
        });
      }
    } catch {
      setLines((l) => [...l, {
        from: "partner", text: "…", time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }]);
    } finally {
      setLoading(false);
    }
  }

  function toggleListen() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      if (interim.trim()) send(interim);
      return;
    }
    if (!hasSpeechRecognition()) {
      alert("Voice input requires Chrome or Edge.");
      return;
    }
    stopSpeaking();
    setPartnerSpeaking(false);
    setListening(true);
    setInterim("");
    recognitionRef.current = startListening({
      lang: "en-US",
      continuous: false,
      interimResults: true,
      onResult: (transcript, isFinal) => {
        setInterim(transcript);
        if (isFinal) {
          setListening(false);
          send(transcript);
        }
      },
      onEnd: () => setListening(false),
      onError: (err) => {
        setListening(false);
        if (err !== "no-speech" && err !== "aborted") alert(`Voice error: ${err}`);
      },
    });
  }

  function askCoach() {
    if (lines.length === 0) return;
    setShowCoach(true);
    const transcript = lines.map((l) =>
      `${l.from === "me" ? "ACTOR" : "PARTNER"}: ${l.text}`
    ).join("\n");
    send(`Give me a 3-bullet coaching note on the scene so far. Be specific.\n\nScene transcript:\n${transcript}`, { coach: true });
  }

  // Scene picker view
  if (!scene) {
    return (
      <div className="min-h-dvh bg-bg pb-24">
        <Header back title="Practice with Aria" />
        <div className="px-5 pt-3 space-y-5">
          <div>
            <h1 className="font-display text-3xl tracking-editorial">
              Rehearse <em className="text-gold-gradient not-italic">live</em>.
            </h1>
            <p className="text-text-muted text-sm mt-1.5 leading-relaxed">
              Aria becomes your scene partner. Speak your lines — she stays in character and responds in real time.
            </p>
          </div>

          <div className="rounded-3xl p-5 bg-gradient-to-br from-gold/15 via-wine/15 to-bg-elevated border border-gold/25">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gold/20 grid place-items-center">
                <Sparkles className="w-6 h-6 text-gold" />
              </div>
              <div className="flex-1">
                <div className="text-[10px] uppercase tracking-widest text-gold font-semibold">How it works</div>
                <div className="font-display text-lg leading-tight mt-0.5">Pick a scene → press mic → act</div>
              </div>
            </div>
            <ul className="mt-3 space-y-1.5 text-[12px] text-text-muted">
              <li>· Aria reads the OTHER role — you stay in your character</li>
              <li>· She responds emotionally to your delivery</li>
              <li>· Tap "Coach me" anytime for a craft note</li>
            </ul>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-widest text-text-muted mb-3 px-1">Quick scenarios</div>
            <div className="space-y-2.5">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setScene(p); haptic("medium"); }}
                  className="w-full text-left rounded-2xl bg-bg-elevated border border-border p-4 hover:border-gold/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-display text-base leading-tight">{p.title}</div>
                      <div className="text-[11px] text-text-muted mt-1">
                        You: <span className="text-text">{p.yourCharacter}</span>
                        <span className="mx-1.5 text-text-subtle">·</span>
                        Aria: <span className="text-text">{p.partnerCharacter}</span>
                      </div>
                      <p className="text-[11px] text-text-subtle mt-1.5 line-clamp-2">{p.context}</p>
                    </div>
                    <span className={cn(
                      "text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider shrink-0",
                      p.difficulty === "Advanced" ? "bg-danger/15 text-danger" : "bg-gold/15 text-gold"
                    )}>
                      {p.difficulty}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-widest text-text-muted mb-3 px-1">From the library</div>
            <div className="space-y-2">
              {SCENES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setScene({
                    id: s.id,
                    title: s.title,
                    yourCharacter: s.characters[0]?.name || "Character A",
                    partnerCharacter: s.characters[1]?.name || "Character B",
                    context: `Scene from ${s.source}.`,
                    difficulty: s.difficulty,
                  })}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-bg-elevated border border-border hover:border-gold/40"
                >
                  <img src={s.thumbnail} alt="" className="w-12 h-12 rounded-xl object-cover" />
                  <div className="flex-1 text-left">
                    <div className="text-sm font-semibold">{s.title}</div>
                    <div className="text-[11px] text-text-muted">{s.source} · {s.difficulty}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active scene view
  return (
    <div className="flex flex-col min-h-dvh bg-bg">
      <Header
        back
        title={
          <div className="flex flex-col items-start leading-tight">
            <span className="font-display text-sm tracking-editorial truncate max-w-[180px]">{scene.title}</span>
            <span className="text-[9px] text-text-muted">
              Aria plays {scene.partnerCharacter}
              {partnerSpeaking && <span className="text-gold ml-1.5">● speaking</span>}
              {listening && <span className="text-terra ml-1.5">● you</span>}
            </span>
          </div>
        }
        right={
          <div className="flex items-center gap-1">
            <button
              onClick={() => setVoiceMode((v) => { if (v) stopSpeaking(); return !v; })}
              className={cn("p-1.5 rounded-full", voiceMode ? "text-gold bg-gold/10" : "text-text-muted")}
              title={voiceMode ? "Voice on" : "Voice off"}
            >
              {voiceMode ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={reset}
              className="p-1.5 rounded-full text-text-muted hover:text-text"
              title="Restart scene"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setScene(null); reset(); }}
              className="text-[10px] text-text-muted px-2"
            >
              Switch
            </button>
          </div>
        }
      />

      {/* Context strip */}
      <div className="mx-4 mt-2 px-3 py-2 rounded-xl bg-gold/8 border border-gold/20">
        <p className="text-[11px] text-gold leading-snug italic">"{scene.context}"</p>
      </div>

      {/* Dialogue */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {lines.length === 0 && (
          <div className="text-center py-12 px-4">
            <div className="w-16 h-16 rounded-full bg-gold/15 grid place-items-center mx-auto">
              <Mic className="w-7 h-7 text-gold" />
            </div>
            <p className="font-display text-lg mt-4">Start the scene</p>
            <p className="text-[12px] text-text-muted mt-1.5 max-w-xs mx-auto">
              You're {scene.yourCharacter}. Say your opening line — Aria will respond as {scene.partnerCharacter}.
            </p>
          </div>
        )}

        {lines.map((l, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("flex", l.from === "me" ? "justify-end" : "justify-start")}
          >
            <div className={cn(
              "max-w-[82%] rounded-2xl",
              l.from === "me" && "bg-gold text-bg rounded-br-md px-4 py-2.5",
              l.from === "partner" && "bg-bg-elevated border border-border rounded-bl-md px-4 py-2.5",
              l.from === "coach" && "bg-violet/15 border border-violet/30 text-text px-4 py-3 w-full max-w-full"
            )}>
              {l.from === "coach" && (
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Award className="w-3.5 h-3.5 text-violet" />
                  <span className="text-[10px] uppercase tracking-widest text-violet font-semibold">Coach note</span>
                </div>
              )}
              {l.from === "partner" && (
                <div className="text-[9px] uppercase tracking-widest text-text-subtle mb-1">{scene.partnerCharacter}</div>
              )}
              <p className={cn("text-sm leading-snug", l.from === "coach" && "whitespace-pre-line")}>{l.text}</p>
              <div className={cn("text-[10px] mt-1", l.from === "me" ? "text-bg/60" : "text-text-subtle")}>{l.time}</div>
            </div>
          </motion.div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl bg-bg-elevated border border-border text-text-muted text-sm flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
                <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" style={{ animationDelay: "0.15s" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" style={{ animationDelay: "0.3s" }} />
              </div>
            </div>
          </div>
        )}

        {listening && interim && (
          <div className="flex justify-end">
            <div className="max-w-[82%] px-4 py-2.5 rounded-2xl text-sm bg-gold/20 text-gold border border-gold/40 italic">
              {interim}…
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Coach + controls */}
      {lines.length >= 2 && (
        <div className="px-4 pb-2">
          <button
            onClick={askCoach}
            className="w-full h-9 rounded-full bg-violet/15 border border-violet/30 text-violet text-xs font-semibold inline-flex items-center justify-center gap-1.5"
          >
            <Award className="w-3.5 h-3.5" /> Coach me on this scene
          </button>
        </div>
      )}

      {/* Input bar */}
      <div className="p-3 border-t border-border glass">
        <form
          onSubmit={(e) => { e.preventDefault(); send(text); }}
          className="flex items-center gap-2"
        >
          <button
            type="button"
            onClick={toggleListen}
            className={cn(
              "w-12 h-12 rounded-full grid place-items-center transition-all shrink-0",
              listening ? "bg-terra text-text recording-pulse" : "bg-gold text-bg"
            )}
            aria-label={listening ? "Stop" : "Speak"}
          >
            {listening ? <Square className="w-4 h-4 fill-current" /> : <Mic className="w-5 h-5" />}
          </button>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={listening ? "Listening…" : "Or type your line"}
            disabled={listening}
            className="flex-1 h-11 px-4 rounded-full bg-bg-elevated border border-border outline-none text-sm placeholder:text-text-subtle disabled:opacity-50 focus:border-gold/40"
          />
          <button
            type="submit"
            className="w-11 h-11 rounded-full bg-bg-elevated border border-border grid place-items-center disabled:opacity-50"
            disabled={!text.trim() || loading}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
