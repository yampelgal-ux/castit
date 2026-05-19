"use client";

// ─── Voice Types ──────────────────────────────────────────────────────────

export type VoiceType = "female" | "male" | "child" | "neutral";
export type ToneType = "neutral" | "angry" | "sad" | "happy" | "excited" | "whisper" | "powerful" | "romantic";

export const VOICE_LABELS: Record<VoiceType, { en: string; he: string; emoji: string }> = {
  female: { en: "Female", he: "אישה", emoji: "👩" },
  male: { en: "Male", he: "גבר", emoji: "👨" },
  child: { en: "Child", he: "ילד/ה", emoji: "🧒" },
  neutral: { en: "Neutral", he: "נייטרלי", emoji: "🗣️" },
};

export const TONE_LABELS: Record<ToneType, { en: string; he: string; emoji: string; color: string }> = {
  neutral: { en: "Neutral", he: "רגיל", emoji: "😐", color: "text-text-muted" },
  angry: { en: "Angry", he: "כועס", emoji: "😠", color: "text-terra" },
  sad: { en: "Sad", he: "עצוב", emoji: "😢", color: "text-plum-light" },
  happy: { en: "Happy", he: "שמח", emoji: "😊", color: "text-gold" },
  excited: { en: "Excited", he: "נרגש", emoji: "🤩", color: "text-gold-light" },
  whisper: { en: "Whisper", he: "לוחש", emoji: "🤫", color: "text-sage" },
  powerful: { en: "Powerful", he: "עוצמתי", emoji: "💪", color: "text-wine-light" },
  romantic: { en: "Romantic", he: "רומנטי", emoji: "💕", color: "text-terra-light" },
};

// ─── Tone → Speech params mapping ─────────────────────────────────────────

type SpeechParams = { pitch: number; rate: number; volume: number };

const TONE_PARAMS: Record<ToneType, SpeechParams> = {
  neutral: { pitch: 1.0, rate: 1.0, volume: 1.0 },
  angry: { pitch: 0.85, rate: 1.2, volume: 1.0 },
  sad: { pitch: 0.8, rate: 0.8, volume: 0.8 },
  happy: { pitch: 1.2, rate: 1.1, volume: 1.0 },
  excited: { pitch: 1.35, rate: 1.25, volume: 1.0 },
  whisper: { pitch: 1.0, rate: 0.85, volume: 0.35 },
  powerful: { pitch: 0.75, rate: 0.9, volume: 1.0 },
  romantic: { pitch: 1.0, rate: 0.85, volume: 0.85 },
};

// Voice type → base pitch modifier
const VOICE_PITCH_MOD: Record<VoiceType, number> = {
  female: 0.0,
  male: -0.25,
  child: 0.4,
  neutral: 0.0,
};

// ─── Voice selection from browser ─────────────────────────────────────────

let cachedVoices: SpeechSynthesisVoice[] = [];

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve([]);
    const voices = window.speechSynthesis.getVoices();
    if (voices.length) {
      cachedVoices = voices;
      return resolve(voices);
    }
    window.speechSynthesis.onvoiceschanged = () => {
      cachedVoices = window.speechSynthesis.getVoices();
      resolve(cachedVoices);
    };
  });
}

async function pickVoice(voiceType: VoiceType, lang = "en"): Promise<SpeechSynthesisVoice | null> {
  const voices = cachedVoices.length ? cachedVoices : await loadVoices();
  if (!voices.length) return null;

  const langVoices = voices.filter((v) => v.lang.toLowerCase().startsWith(lang));
  const pool = langVoices.length ? langVoices : voices;

  // Heuristic: match female/male by name keywords
  const FEMALE_HINTS = ["female", "samantha", "victoria", "karen", "moira", "tessa", "fiona", "kate", "serena", "allison", "ava", "susan", "carmit", "אישה"];
  const MALE_HINTS = ["male", "daniel", "alex", "fred", "tom", "aaron", "oliver", "george", "arthur", "carmit"];

  function score(v: SpeechSynthesisVoice, hints: string[]) {
    const n = v.name.toLowerCase();
    return hints.some((h) => n.includes(h)) ? 1 : 0;
  }

  if (voiceType === "female" || voiceType === "child") {
    const sorted = [...pool].sort((a, b) => score(b, FEMALE_HINTS) - score(a, FEMALE_HINTS));
    return sorted[0] ?? pool[0];
  }
  if (voiceType === "male") {
    const sorted = [...pool].sort((a, b) => score(b, MALE_HINTS) - score(a, MALE_HINTS));
    return sorted[0] ?? pool[0];
  }
  return pool[0];
}

// ─── TTS: Speak ───────────────────────────────────────────────────────────

export type SpeakOptions = {
  text: string;
  voice?: VoiceType;
  tone?: ToneType;
  lang?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (e: any) => void;
};

export async function speak({
  text, voice = "neutral", tone = "neutral", lang = "en", onStart, onEnd, onError,
}: SpeakOptions): Promise<void> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onError?.(new Error("Speech synthesis not supported"));
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  const params = TONE_PARAMS[tone];
  const voiceObj = await pickVoice(voice, lang);

  if (voiceObj) utterance.voice = voiceObj;
  utterance.pitch = Math.max(0, Math.min(2, params.pitch + VOICE_PITCH_MOD[voice]));
  utterance.rate = params.rate;
  utterance.volume = params.volume;
  utterance.lang = lang;

  if (onStart) utterance.onstart = onStart;
  if (onEnd) utterance.onend = onEnd;
  if (onError) utterance.onerror = onError;

  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

export function isSpeaking(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && window.speechSynthesis.speaking;
}

// ─── STT: Speech Recognition (browser) ────────────────────────────────────

export type RecognitionHandle = {
  stop: () => void;
};

export type StartListeningOptions = {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onResult: (transcript: string, isFinal: boolean) => void;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
};

export function startListening({
  lang = "en-US", continuous = false, interimResults = true,
  onResult, onStart, onEnd, onError,
}: StartListeningOptions): RecognitionHandle | null {
  if (typeof window === "undefined") return null;
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) {
    onError?.("Speech recognition not supported in this browser");
    return null;
  }

  const recognition = new SR();
  recognition.lang = lang;
  recognition.continuous = continuous;
  recognition.interimResults = interimResults;

  recognition.onresult = (event: any) => {
    let final = "";
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) final += transcript;
      else interim += transcript;
    }
    if (final) onResult(final, true);
    else if (interim) onResult(interim, false);
  };

  if (onStart) recognition.onstart = onStart;
  if (onEnd) recognition.onend = onEnd;
  recognition.onerror = (e: any) => onError?.(e.error || "unknown error");

  recognition.start();
  return { stop: () => recognition.stop() };
}

// ─── Helpers ──────────────────────────────────────────────────────────────

export function hasSpeechSynthesis(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function hasSpeechRecognition(): boolean {
  if (typeof window === "undefined") return false;
  return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}

// Detect Hebrew text → use Hebrew lang for TTS
export function detectLang(text: string): string {
  return /[֐-׿]/.test(text) ? "he-IL" : "en-US";
}
