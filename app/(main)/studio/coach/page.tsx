"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Image as ImageIcon, FileText, Sparkles, Loader2,
  Mic, Volume2, VolumeX, RotateCcw, Play,
  Send, AlertCircle, Wand2,
} from "lucide-react";
import { Header } from "@/components/Header";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";

type ScriptLine = { character: string; text: string; direction?: string };
type ParsedScene = {
  title: string;
  summary?: string;
  characters: string[];
  lines: ScriptLine[];
};

type VoiceProfile =
  | "man" | "woman" | "boy" | "girl"
  | "old_man" | "old_woman"
  | "teen_male" | "teen_female";

type Tone =
  | "neutral" | "excited" | "happy" | "sad" | "scared"
  | "worried" | "angry" | "tender" | "sarcastic"
  | "tense" | "flirtatious" | "cold";

const VOICE_OPTIONS: { key: VoiceProfile; label: string; emoji: string }[] = [
  { key: "man",         label: "גבר",     emoji: "👨" },
  { key: "woman",       label: "אישה",    emoji: "👩" },
  { key: "teen_male",   label: "נער",     emoji: "🧑" },
  { key: "teen_female", label: "נערה",    emoji: "👧" },
  { key: "boy",         label: "ילד",     emoji: "👦" },
  { key: "girl",        label: "ילדה",    emoji: "👧" },
  { key: "old_man",     label: "זקן",     emoji: "👴" },
  { key: "old_woman",   label: "זקנה",    emoji: "👵" },
];

const TONE_OPTIONS: { key: Tone; label: string; color: string }[] = [
  { key: "neutral",      label: "נייטרלי",   color: "text-text-muted" },
  { key: "excited",      label: "נרגש",       color: "text-gold" },
  { key: "happy",        label: "שמח",        color: "text-success" },
  { key: "sad",          label: "עצוב",       color: "text-plum-light" },
  { key: "scared",       label: "מפוחד",      color: "text-violet" },
  { key: "worried",      label: "מודאג",      color: "text-amber" },
  { key: "angry",        label: "כועס",       color: "text-danger" },
  { key: "tender",       label: "רך",         color: "text-pink-light" },
  { key: "sarcastic",    label: "ציני",       color: "text-text" },
  { key: "tense",        label: "מתוח",       color: "text-amber" },
  { key: "flirtatious",  label: "מפלרטט",     color: "text-pink-light" },
  { key: "cold",         label: "קר",         color: "text-text-muted" },
];

const INTENSITY_OPTIONS = [
  { key: "subtle", label: "מאופק" },
  { key: "moderate", label: "ברור" },
  { key: "strong", label: "עוצמתי" },
] as const;

type Step = "upload" | "configure" | "practice";

type Turn = {
  role: "user" | "assistant";
  text: string;
  scriptLineIdx?: number;
};

type CoachHint = {
  lineIdx: number;
  intent: string;
  physicality: string;
  note: string;
};

// SpeechRecognition cross-browser typing
type AnyRecognition = {
  start: () => void;
  stop: () => void;
  abort: () => void;
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { results: { [k: number]: { [k: number]: { transcript: string } }; length: number; isFinal?: boolean }, resultIndex: number }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
};

export default function CoachPage() {
  const [step, setStep] = useState<Step>("upload");

  // Upload step
  const [textInput, setTextInput] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parsed scene
  const [scene, setScene] = useState<ParsedScene | null>(null);

  // Configure step
  const [yourCharacter, setYourCharacter] = useState<string>("");
  const [voiceProfile, setVoiceProfile] = useState<VoiceProfile>("woman");
  const [tone, setTone] = useState<Tone>("neutral");
  const [intensity, setIntensity] = useState<"subtle" | "moderate" | "strong">("moderate");
  const [context, setContext] = useState<string>("");

  // Practice step
  const [turns, setTurns] = useState<Turn[]>([]);
  const [currentLineIdx, setCurrentLineIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [speakEnabled, setSpeakEnabled] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [usePremiumVoice, setUsePremiumVoice] = useState(false);
  const [hints, setHints] = useState<Record<number, CoachHint>>({});
  const [hintsLoading, setHintsLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<AnyRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Voice synthesis voices
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  // Pick best voice for profile
  const ttsVoice = useMemo(() => {
    if (!voices.length) return null;
    const isMale = voiceProfile === "man" || voiceProfile === "boy" || voiceProfile === "old_man" || voiceProfile === "teen_male";
    const isHebrew = scene?.lines.some((l) => /[א-ת]/.test(l.text)) ?? true;
    const langPref = isHebrew ? "he" : "en";
    // Pick first voice matching lang & gender heuristic
    const candidates = voices.filter((v) => v.lang.startsWith(langPref));
    const pool = candidates.length ? candidates : voices;
    const maleNames = /(male|david|alex|fred|daniel|tom|jorge|jacques|carlos|raanan|amir)/i;
    const femaleNames = /(female|samantha|karen|moira|tessa|carmit|paulina|amelie|monica|alice)/i;
    const matcher = isMale ? maleNames : femaleNames;
    return pool.find((v) => matcher.test(v.name)) ?? pool[0] ?? voices[0];
  }, [voices, voiceProfile, scene]);

  // Detect script language (he vs en) for STT
  const scriptLang = useMemo(() => {
    const sample = scene?.lines.slice(0, 3).map((l) => l.text).join(" ") ?? "";
    return /[א-ת]/.test(sample) ? "he-IL" : "en-US";
  }, [scene]);

  // ── Speech-to-Text ──────────────────────────────────
  function startListening() {
    if (typeof window === "undefined") return;
    const w = window as unknown as { webkitSpeechRecognition?: new () => AnyRecognition; SpeechRecognition?: new () => AnyRecognition };
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) {
      alert("הדפדפן לא תומך בזיהוי קול. נסה Safari או Chrome.");
      return;
    }
    stopSpeaking();
    const r = new SR();
    r.lang = scriptLang;
    r.continuous = false;
    r.interimResults = true;
    let finalText = "";
    r.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if ((e.results[i] as { isFinal?: boolean }).isFinal) finalText += transcript;
        else interim += transcript;
      }
      setUserInput((finalText + " " + interim).trim());
    };
    r.onerror = () => { setListening(false); };
    r.onend = () => { setListening(false); };
    recognitionRef.current = r;
    setListening(true);
    haptic("light");
    try { r.start(); } catch { setListening(false); }
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  // ── ElevenLabs playback ─────────────────────────────
  async function speakViaElevenLabs(text: string): Promise<void> {
    const clean = text.replace(/^\[[^\]]+\]\s*/, "").trim();
    if (!clean) return;
    try {
      const res = await fetch("/api/aria/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: clean, voiceProfile, tone, intensity }),
      });
      if (!res.ok) {
        // Fall back to device voice silently
        return new Promise((resolve) => speakDevice(clean, resolve));
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      setSpeaking(true);
      return new Promise<void>((resolve) => {
        audio.onended = () => { setSpeaking(false); URL.revokeObjectURL(url); resolve(); };
        audio.onerror = () => { setSpeaking(false); URL.revokeObjectURL(url); resolve(); };
        audio.play().catch(() => { setSpeaking(false); resolve(); });
      });
    } catch {
      return new Promise((resolve) => speakDevice(clean, resolve));
    }
  }

  // ── Device SpeechSynthesis (fallback) ───────────────
  function speakDevice(text: string, onEnd?: () => void) {
    if (!speakEnabled || typeof window === "undefined") { onEnd?.(); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (ttsVoice) u.voice = ttsVoice;
    const toneMap: Record<Tone, { rate: number; pitch: number }> = {
      neutral: { rate: 1.0, pitch: 1.0 },
      excited: { rate: 1.15, pitch: 1.2 },
      happy: { rate: 1.05, pitch: 1.15 },
      sad: { rate: 0.85, pitch: 0.85 },
      scared: { rate: 1.1, pitch: 1.25 },
      worried: { rate: 0.95, pitch: 1.05 },
      angry: { rate: 1.1, pitch: 0.95 },
      tender: { rate: 0.9, pitch: 1.05 },
      sarcastic: { rate: 1.0, pitch: 0.95 },
      tense: { rate: 0.95, pitch: 0.95 },
      flirtatious: { rate: 0.95, pitch: 1.1 },
      cold: { rate: 0.95, pitch: 0.9 },
    };
    if (voiceProfile === "boy" || voiceProfile === "girl") u.pitch = toneMap[tone].pitch + 0.4;
    else if (voiceProfile === "old_man" || voiceProfile === "old_woman") u.rate = toneMap[tone].rate - 0.15;
    else { u.rate = toneMap[tone].rate; u.pitch = toneMap[tone].pitch; }
    u.onstart = () => setSpeaking(true);
    u.onend = () => { setSpeaking(false); onEnd?.(); };
    u.onerror = () => { setSpeaking(false); onEnd?.(); };
    window.speechSynthesis.speak(u);
  }

  // Wraps the right TTS source based on usePremiumVoice toggle
  async function speakLine(text: string): Promise<void> {
    if (!speakEnabled) return;
    if (usePremiumVoice) return speakViaElevenLabs(text);
    return new Promise<void>((resolve) => speakDevice(text, resolve));
  }

  // ── Fetch coach hints for user lines ────────────────
  async function loadHints(forScene: ParsedScene, character: string) {
    setHintsLoading(true);
    try {
      const res = await fetch("/api/aria/coach-directions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scene: {
            title: forScene.title,
            summary: forScene.summary,
            context,
            yourCharacter: character,
            lines: forScene.lines.map((l) => ({ character: l.character, text: l.text })),
          },
        }),
      });
      if (!res.ok) return;
      const data: { hints: CoachHint[] } = await res.json();
      const byIdx: Record<number, CoachHint> = {};
      for (const h of data.hints) byIdx[h.lineIdx] = h;
      setHints(byIdx);
    } finally {
      setHintsLoading(false);
    }
  }

  // Legacy device-only speak (kept for note-only "cut" replies)
  function speak(text: string) {
    if (!speakEnabled || typeof window === "undefined") return;
    const clean = text.replace(/^\[[^\]]+\]\s*/, "").trim();
    if (!clean) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(clean);
    if (ttsVoice) u.voice = ttsVoice;
    // Map tone to pitch/rate roughly
    const toneMap: Record<Tone, { rate: number; pitch: number }> = {
      neutral:     { rate: 1.0, pitch: 1.0 },
      excited:     { rate: 1.15, pitch: 1.2 },
      happy:       { rate: 1.05, pitch: 1.15 },
      sad:         { rate: 0.85, pitch: 0.85 },
      scared:      { rate: 1.1, pitch: 1.25 },
      worried:     { rate: 0.95, pitch: 1.05 },
      angry:       { rate: 1.1, pitch: 0.95 },
      tender:      { rate: 0.9, pitch: 1.05 },
      sarcastic:   { rate: 1.0, pitch: 0.95 },
      tense:       { rate: 0.95, pitch: 0.95 },
      flirtatious: { rate: 0.95, pitch: 1.1 },
      cold:        { rate: 0.95, pitch: 0.9 },
    };
    // Age-based pitch tweak
    if (voiceProfile === "boy" || voiceProfile === "girl") u.pitch = (toneMap[tone].pitch + 0.4);
    else if (voiceProfile === "old_man" || voiceProfile === "old_woman") u.rate = toneMap[tone].rate - 0.15;
    else { u.rate = toneMap[tone].rate; u.pitch = toneMap[tone].pitch; }
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  }

  function stopSpeaking() {
    if (typeof window !== "undefined") window.speechSynthesis.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setSpeaking(false);
  }

  // Parse scene from text or image
  async function parseScene(payload: { text?: string; imageBase64?: string; imageMediaType?: string }) {
    setParsing(true);
    setParseError(null);
    try {
      const res = await fetch("/api/aria/parse-scene", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to parse scene");
      }
      const data: ParsedScene = await res.json();
      if (!data.lines?.length || !data.characters?.length) {
        throw new Error("לא הצלחתי לזהות דיאלוג. נסה להעלות תמונה ברורה יותר או להדביק טקסט בפורמט: שם: שורה.");
      }
      setScene(data);
      setYourCharacter(data.characters[0]);
      setStep("configure");
      haptic("light");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to parse";
      setParseError(msg);
    } finally {
      setParsing(false);
    }
  }

  async function handleFile(file: File) {
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        const mediaType = (file.type === "image/png" || file.type === "image/webp")
          ? file.type as "image/png" | "image/webp"
          : "image/jpeg";
        parseScene({ imageBase64: base64, imageMediaType: mediaType });
      };
      reader.readAsDataURL(file);
    } else if (file.type === "text/plain" || file.name.endsWith(".txt")) {
      const text = await file.text();
      setTextInput(text);
      parseScene({ text });
    } else {
      setParseError("פורמט לא נתמך — העלה תמונה (JPG/PNG) או קובץ טקסט.");
    }
  }

  // Practice flow
  const partnerCharacter = useMemo(() => {
    if (!scene) return "";
    return scene.characters.filter((c) => c !== yourCharacter).join(", ") || scene.characters[0];
  }, [scene, yourCharacter]);

  // Find consecutive partner lines starting at `from`, until we hit a user line or scene end.
  function getPartnerBlock(from: number): ScriptLine[] {
    if (!scene) return [];
    const block: ScriptLine[] = [];
    for (let i = from; i < scene.lines.length; i++) {
      if (scene.lines[i].character === yourCharacter) break;
      block.push(scene.lines[i]);
    }
    return block;
  }

  // Sequentially display + speak a list of partner lines.
  async function performPartnerBlock(lines: { character: string; text: string }[], baseTurns: Turn[]) {
    let acc = baseTurns;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      const display = scene && scene.characters.length > 2 ? `[${l.character}] ${l.text}` : l.text;
      acc = [...acc, { role: "assistant", text: display }];
      setTurns(acc);
      await speakLine(l.text);
      await new Promise((r) => setTimeout(r, 220));
    }
    return acc;
  }

  // Parse AI response: "[CHAR] line ||| [CHAR] line" → array of lines
  function parseAILines(text: string): { character: string; text: string }[] {
    const segments = text.split(/\s*\|\|\|\s*/).map((s) => s.trim()).filter(Boolean);
    return segments.map((seg) => {
      const m = seg.match(/^\[([^\]]+)\]\s*(.+)$/);
      if (m) return { character: m[1].trim(), text: m[2].trim() };
      return { character: partnerCharacter, text: seg };
    });
  }

  async function startPractice() {
    if (!scene) return;
    setTurns([]);
    setCurrentLineIdx(0);
    setStep("practice");
    // Fetch coach hints in parallel (non-blocking for UX)
    loadHints(scene, yourCharacter);
    // If the very first lines are the partner's, play ALL of them
    const opening = getPartnerBlock(0);
    if (opening.length > 0) {
      setTimeout(async () => {
        const acc = await performPartnerBlock(opening, []);
        setTurns(acc);
        setCurrentLineIdx(opening.length);
      }, 400);
    }
  }

  async function sendUserLine(text: string) {
    if (!text.trim() || !scene) return;
    stopSpeaking();
    setUserInput("");

    // Where does the user's line sit? The next user-line idx ≥ currentLineIdx
    let userLineIdx = currentLineIdx;
    while (userLineIdx < scene.lines.length && scene.lines[userLineIdx].character !== yourCharacter) {
      userLineIdx++;
    }
    const expectedUserLine = scene.lines[userLineIdx]?.text;

    const userTurn: Turn = { role: "user", text, scriptLineIdx: userLineIdx };
    let acc: Turn[] = [...turns, userTurn];
    setTurns(acc);

    // Find the next partner block (after the user's line)
    const nextPartnerStart = userLineIdx + 1;
    const upcoming = getPartnerBlock(nextPartnerStart);

    if (upcoming.length === 0) {
      // End of scene
      setCurrentLineIdx(scene.lines.length);
      return;
    }

    setLoading(true);
    try {
      const messages = acc.map((t) => ({
        role: t.role,
        content: t.text.replace(/^\[[^\]]+\]\s*/, ""),
      }));
      const res = await fetch("/api/aria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages,
          mode: "custom_scene",
          scene: {
            title: scene.title,
            yourCharacter,
            partnerCharacter,
            context: context || scene.summary,
            script: scene.lines.map((l) => `${l.character}: ${l.text}`).join("\n"),
            voiceProfile,
            tone,
            intensity,
            upcomingLines: upcoming,
            expectedUserLine,
          },
        }),
      });
      if (!res.ok) throw new Error("Aria error");
      const data: { text: string } = await res.json();
      const aiText = data.text || "...";

      // Detect if Aria broke character (no [CHAR] format, contains "cut/stop/break" feedback)
      const looksLikeNote = !/\[/.test(aiText) && aiText.length < 400;
      if (looksLikeNote) {
        acc = [...acc, { role: "assistant", text: aiText }];
        setTurns(acc);
        speakSimple(aiText);
        setLoading(false);
        return;
      }

      const aiLines = parseAILines(aiText);
      setLoading(false);
      acc = await performPartnerBlock(aiLines, acc);
      setTurns(acc);
      setCurrentLineIdx(nextPartnerStart + upcoming.length);
    } catch {
      setTurns([...acc, { role: "assistant", text: "(Aria לא זמינה כרגע — נסה שוב)" }]);
      setLoading(false);
    }
  }

  // Simple single-line TTS (for acting notes)
  function speakSimple(text: string) {
    if (!speakEnabled || typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (ttsVoice) u.voice = ttsVoice;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  }

  function restart() {
    stopSpeaking();
    setTurns([]);
    setCurrentLineIdx(0);
    startPractice();
  }

  // Auto-scroll on new turns
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns, loading]);

  // Current script hint (your next line)
  const nextUserLine = useMemo(() => {
    if (!scene) return null;
    for (let i = currentLineIdx; i < scene.lines.length; i++) {
      if (scene.lines[i].character === yourCharacter) return scene.lines[i];
    }
    return null;
  }, [scene, yourCharacter, currentLineIdx]);

  return (
    <div className="min-h-dvh bg-bg pb-24">
      <Header
        back
        title="מאמן AI"
        right={step !== "upload" && (
          <button
            onClick={() => {
              stopSpeaking();
              setStep("upload");
              setScene(null);
              setTurns([]);
              setCurrentLineIdx(0);
            }}
            className="text-[11px] text-text-muted"
          >סצנה חדשה</button>
        )}
      />

      {/* Step indicator */}
      <div className="px-4 mt-2 flex items-center gap-1.5">
        {(["upload", "configure", "practice"] as Step[]).map((s, i) => (
          <div
            key={s}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              step === s ? "bg-gold" :
              (["upload", "configure", "practice"].indexOf(step) > i) ? "bg-gold/40" : "bg-border"
            )}
          />
        ))}
      </div>

      {/* ─────────── STEP 1: UPLOAD ─────────── */}
      {step === "upload" && (
        <div className="px-4 mt-6">
          <div className="text-[10px] uppercase tracking-widest text-gold font-semibold">
            שלב 1 · העלאת סצנה
          </div>
          <h2 className="font-display text-2xl mt-1 tracking-editorial">
            הוסף את הסצנה שלך
          </h2>
          <p className="text-sm text-text-muted mt-1.5">
            תמונה של הסיידס, קובץ טקסט, או להדביק ידנית. אני אזהה את כל הדיאלוג.
          </p>

          {/* Upload buttons */}
          <div className="grid grid-cols-2 gap-2 mt-5">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="h-24 rounded-2xl bg-bg-elevated border border-border flex flex-col items-center justify-center gap-1 hover:border-gold/40 transition"
            >
              <ImageIcon className="w-5 h-5 text-gold" />
              <span className="text-xs font-semibold">תמונה</span>
              <span className="text-[9px] text-text-subtle">צילום מסך / סיידס</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="h-24 rounded-2xl bg-bg-elevated border border-border flex flex-col items-center justify-center gap-1 hover:border-gold/40 transition"
            >
              <FileText className="w-5 h-5 text-gold" />
              <span className="text-xs font-semibold">קובץ טקסט</span>
              <span className="text-[9px] text-text-subtle">.txt</span>
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.txt,text/plain"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />

          <div className="mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border"></div>
            <span className="text-[10px] uppercase tracking-widest text-text-subtle">או הדבק טקסט</span>
            <div className="h-px flex-1 bg-border"></div>
          </div>

          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={`SARAH: I've been thinking about what you said.\nMARK: And?`}
            className="w-full mt-4 min-h-[140px] p-3 rounded-2xl bg-bg-elevated border border-border text-sm leading-relaxed resize-y"
            dir="auto"
          />

          {parseError && (
            <div className="mt-3 p-3 rounded-xl bg-danger/10 border border-danger/30 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
              <span className="text-xs text-danger">{parseError}</span>
            </div>
          )}

          <button
            disabled={!textInput.trim() || parsing}
            onClick={() => parseScene({ text: textInput })}
            className="w-full mt-5 h-12 rounded-full bg-gold text-bg font-semibold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {parsing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> מנתח את הסצנה...</>
            ) : (
              <><Sparkles className="w-4 h-4" /> נתח את הסצנה</>
            )}
          </button>
        </div>
      )}

      {/* ─────────── STEP 2: CONFIGURE ─────────── */}
      {step === "configure" && scene && (
        <div className="px-4 mt-6 space-y-5">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-gold font-semibold">
              שלב 2 · הגדרת התפקיד
            </div>
            <h2 className="font-display text-2xl mt-1 tracking-editorial">
              {scene.title}
            </h2>
            {scene.summary && (
              <p className="text-xs text-text-muted mt-1.5 leading-relaxed">
                {scene.summary}
              </p>
            )}
            <div className="text-[10px] text-text-subtle mt-2 tnum">
              {scene.lines.length} שורות · {scene.characters.length} דמויות
            </div>
          </div>

          {/* Your character */}
          <div>
            <div className="text-[11px] text-text-muted mb-2 font-semibold">איזו דמות אני משחק?</div>
            <div className="flex flex-wrap gap-1.5">
              {scene.characters.map((c) => (
                <button
                  key={c}
                  onClick={() => { setYourCharacter(c); haptic("light"); }}
                  className={cn(
                    "px-3 h-8 rounded-full text-xs font-semibold transition",
                    yourCharacter === c
                      ? "bg-gold text-bg"
                      : "bg-bg-elevated border border-border text-text"
                  )}
                >{c}</button>
              ))}
            </div>
          </div>

          {/* Partner voice */}
          <div>
            <div className="text-[11px] text-text-muted mb-2 font-semibold">
              איך נשמע השותף ({partnerCharacter || "—"})
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {VOICE_OPTIONS.map((v) => (
                <button
                  key={v.key}
                  onClick={() => { setVoiceProfile(v.key); haptic("light"); }}
                  className={cn(
                    "h-16 rounded-xl flex flex-col items-center justify-center gap-0.5 transition",
                    voiceProfile === v.key
                      ? "bg-gold/15 border-2 border-gold"
                      : "bg-bg-elevated border border-border"
                  )}
                >
                  <span className="text-lg leading-none">{v.emoji}</span>
                  <span className="text-[10px] font-semibold">{v.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tone */}
          <div>
            <div className="text-[11px] text-text-muted mb-2 font-semibold">טונציה רגשית</div>
            <div className="flex flex-wrap gap-1.5">
              {TONE_OPTIONS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => { setTone(t.key); haptic("light"); }}
                  className={cn(
                    "px-3 h-8 rounded-full text-xs font-semibold transition",
                    tone === t.key
                      ? "bg-gold text-bg"
                      : "bg-bg-elevated border border-border text-text"
                  )}
                >{t.label}</button>
              ))}
            </div>
          </div>

          {/* Intensity */}
          <div>
            <div className="text-[11px] text-text-muted mb-2 font-semibold">עוצמה</div>
            <div className="grid grid-cols-3 gap-1.5">
              {INTENSITY_OPTIONS.map((i) => (
                <button
                  key={i.key}
                  onClick={() => { setIntensity(i.key); haptic("light"); }}
                  className={cn(
                    "h-9 rounded-full text-xs font-semibold transition",
                    intensity === i.key
                      ? "bg-gold text-bg"
                      : "bg-bg-elevated border border-border text-text"
                  )}
                >{i.label}</button>
              ))}
            </div>
          </div>

          {/* Optional context */}
          <div>
            <div className="text-[11px] text-text-muted mb-2 font-semibold">הקשר נוסף (אופציונלי)</div>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="למשל: זוג שנפרד אתמול, היא חוזרת לקחת דברים..."
              className="w-full min-h-[60px] p-3 rounded-2xl bg-bg-elevated border border-border text-xs leading-relaxed resize-y"
              dir="auto"
            />
          </div>

          <button
            onClick={startPractice}
            disabled={!yourCharacter}
            className="w-full h-12 rounded-full bg-gold text-bg font-semibold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <Play className="w-4 h-4" /> התחל אימון
          </button>
        </div>
      )}

      {/* ─────────── STEP 3: PRACTICE ─────────── */}
      {step === "practice" && scene && (
        <div className="flex flex-col" style={{ minHeight: "calc(100dvh - 120px)" }}>
          {/* Scene header */}
          <div className="px-4 pt-3 pb-3 border-b border-border bg-bg-elevated/40 sticky top-12 z-10 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-gold font-semibold">
                  אימון
                </div>
                <div className="text-sm font-semibold truncate">{scene.title}</div>
                <div className="text-[10px] text-text-muted truncate">
                  אני: {yourCharacter} · שותף: {partnerCharacter}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setUsePremiumVoice((v) => !v); haptic("light"); }}
                  className={cn(
                    "h-8 px-2.5 rounded-full grid place-items-center text-[9px] font-bold uppercase tracking-wider transition",
                    usePremiumVoice
                      ? "bg-gold text-bg"
                      : "bg-bg-elevated border border-border text-text-muted"
                  )}
                  title={usePremiumVoice ? "קול AI פרימיום" : "קול מכשיר"}
                >
                  {usePremiumVoice ? "AI ✓" : "AI"}
                </button>
                <button
                  onClick={() => setSpeakEnabled((v) => !v)}
                  className={cn(
                    "w-8 h-8 rounded-full grid place-items-center",
                    speakEnabled ? "bg-gold/15 text-gold" : "bg-bg-elevated border border-border text-text-muted"
                  )}
                  title={speakEnabled ? "כיבוי קול" : "הפעלת קול"}
                >
                  {speakEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
                <button
                  onClick={restart}
                  className="w-8 h-8 rounded-full bg-bg-elevated border border-border grid place-items-center text-text-muted"
                  title="התחל מחדש"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Dialogue scroll area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
            {turns.length === 0 && (
              <div className="text-center py-8">
                <div className="text-[10px] text-text-subtle uppercase tracking-widest">מוכן</div>
                <p className="text-sm text-text-muted mt-2">התחל את הסצנה — תכתוב את השורה שלך למטה</p>
              </div>
            )}

            <AnimatePresence initial={false}>
              {turns.map((t, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn("flex", t.role === "user" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                      t.role === "user"
                        ? "bg-gold text-bg"
                        : "bg-bg-elevated border border-border text-text"
                    )}
                  >
                    <div className={cn(
                      "text-[9px] uppercase tracking-widest mb-1 font-semibold",
                      t.role === "user" ? "text-bg/60" : "text-gold"
                    )}>
                      {t.role === "user" ? yourCharacter : (partnerCharacter || "Partner")}
                    </div>
                    {t.text.replace(/^\[[^\]]+\]\s*/, "")}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {loading && (
              <div className="flex justify-start">
                <div className="bg-bg-elevated border border-border rounded-2xl px-4 py-2.5">
                  <Loader2 className="w-4 h-4 animate-spin text-gold" />
                </div>
              </div>
            )}

            {speaking && (
              <div className="flex justify-start">
                <div className="text-[10px] text-gold inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-gold rounded-full animate-pulse" /> מדבר...
                  <button onClick={stopSpeaking} className="underline">עצור</button>
                </div>
              </div>
            )}
          </div>

          {/* Next line hint + coach direction */}
          {nextUserLine && (() => {
            const idx = scene.lines.indexOf(nextUserLine);
            const hint = hints[idx];
            return (
              <div className="px-4 py-3 border-t border-border bg-gold/5">
                <div className="text-[9px] text-gold uppercase tracking-widest font-semibold mb-1.5">
                  השורה הבאה שלך · {yourCharacter}
                </div>

                {hint && (
                  <div className="mb-2.5 space-y-1.5">
                    <div className="flex items-start gap-2">
                      <Wand2 className="w-3 h-3 text-gold shrink-0 mt-0.5" />
                      <div className="text-[10px] leading-snug">
                        <span className="text-gold font-semibold">כוונה:</span>{" "}
                        <span className="text-text">{hint.intent}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Wand2 className="w-3 h-3 text-plum-light shrink-0 mt-0.5" />
                      <div className="text-[10px] leading-snug">
                        <span className="text-plum-light font-semibold">גוף:</span>{" "}
                        <span className="text-text">{hint.physicality}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Wand2 className="w-3 h-3 text-sage shrink-0 mt-0.5" />
                      <div className="text-[10px] leading-snug">
                        <span className="text-sage font-semibold">טיפ:</span>{" "}
                        <span className="text-text">{hint.note}</span>
                      </div>
                    </div>
                  </div>
                )}
                {!hint && hintsLoading && (
                  <div className="text-[10px] text-text-subtle inline-flex items-center gap-1.5 mb-2">
                    <Loader2 className="w-3 h-3 animate-spin" /> מכין הוראות בימוי...
                  </div>
                )}

                <p className="text-xs text-text-muted leading-relaxed">
                  {nextUserLine.direction && (
                    <span className="text-text-subtle italic">({nextUserLine.direction}) </span>
                  )}
                  {nextUserLine.text}
                </p>
              </div>
            );
          })()}

          {/* Input */}
          <div className="px-4 py-3 border-t border-border bg-bg">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendUserLine(userInput);
              }}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                onClick={() => listening ? stopListening() : startListening()}
                className={cn(
                  "w-11 h-11 rounded-full grid place-items-center shrink-0 transition",
                  listening
                    ? "bg-danger text-white animate-pulse"
                    : "bg-bg-elevated border border-border text-text-muted"
                )}
                aria-label={listening ? "עצור הקלטה" : "התחל הקלטה"}
                title={listening ? "עצור" : "דבר את השורה שלך"}
              >
                <Mic className="w-4 h-4" />
              </button>
              <input
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder={listening ? "מקליט..." : "דבר או הקלד את השורה שלך..."}
                className="flex-1 h-11 px-4 rounded-full bg-bg-elevated border border-border text-sm"
                dir="auto"
              />
              <button
                type="submit"
                disabled={!userInput.trim() || loading}
                className="w-11 h-11 rounded-full bg-gold text-bg grid place-items-center disabled:opacity-40"
                aria-label="שלח"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            {nextUserLine && (
              <button
                type="button"
                onClick={() => sendUserLine(nextUserLine.text)}
                className="mt-2 text-[10px] text-gold font-semibold"
              >
                ↑ השתמש בשורה מהסקריפט
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
