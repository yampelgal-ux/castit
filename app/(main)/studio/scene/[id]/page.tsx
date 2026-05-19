"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, Mic, RotateCcw, Settings2, Pause, Play, X } from "lucide-react";
import { SCENES } from "@/lib/mock-data";
import { Header } from "@/components/Header";
import {
  speak, stopSpeaking, isSpeaking, detectLang,
  VOICE_LABELS, TONE_LABELS,
  type VoiceType, type ToneType,
} from "@/lib/voice";
import { cn } from "@/lib/utils";

type CharVoice = { voice: VoiceType; tone: ToneType };

export default function ScenePage() {
  const { id } = useParams<{ id: string }>();
  const scene = SCENES.find((s) => s.id === id) ?? SCENES[0];
  const [activeLine, setActiveLine] = useState(-1);
  const [recording, setRecording] = useState(false);
  const [playingAll, setPlayingAll] = useState(false);
  const [showVoicePicker, setShowVoicePicker] = useState<string | null>(null);

  // Default voice for each character (you=female neutral, others=male neutral)
  const [voiceMap, setVoiceMap] = useState<Record<string, CharVoice>>(() => {
    const map: Record<string, CharVoice> = {};
    scene.characters.forEach((c, i) => {
      map[c.name] = {
        voice: i === 0 ? "female" : i === 1 ? "male" : "neutral",
        tone: "neutral",
      };
    });
    return map;
  });

  // Flatten lines in alternating order
  const allLines: { speaker: string; text: string; isYou: boolean }[] = [];
  const maxLen = Math.max(...scene.characters.map((c) => c.lines.length));
  for (let i = 0; i < maxLen; i++) {
    scene.characters.forEach((c, ci) => {
      if (c.lines[i]) {
        allLines.push({ speaker: c.name, text: c.lines[i], isYou: ci === 0 });
      }
    });
  }

  function speakLine(text: string, speaker: string, idx: number) {
    if (isSpeaking()) {
      stopSpeaking();
      setActiveLine(-1);
      return;
    }
    const cv = voiceMap[speaker] ?? { voice: "neutral" as VoiceType, tone: "neutral" as ToneType };
    setActiveLine(idx);
    speak({
      text,
      voice: cv.voice,
      tone: cv.tone,
      lang: detectLang(text),
      onEnd: () => setActiveLine(-1),
      onError: () => setActiveLine(-1),
    });
  }

  async function playAll() {
    setPlayingAll(true);
    for (let i = 0; i < allLines.length; i++) {
      if (!playingAll && i > 0) break;
      const line = allLines[i];
      if (line.isYou) {
        // pause briefly to "give space" for the user
        setActiveLine(i);
        await new Promise((r) => setTimeout(r, 1800));
        continue;
      }
      const cv = voiceMap[line.speaker];
      setActiveLine(i);
      await new Promise<void>((resolve) => {
        speak({
          text: line.text,
          voice: cv.voice,
          tone: cv.tone,
          lang: detectLang(line.text),
          onEnd: () => resolve(),
          onError: () => resolve(),
        });
      });
    }
    setActiveLine(-1);
    setPlayingAll(false);
  }

  function stopAll() {
    stopSpeaking();
    setPlayingAll(false);
    setActiveLine(-1);
  }

  useEffect(() => stopSpeaking, []);

  return (
    <div className="min-h-dvh flex flex-col bg-bg">
      <Header
        back
        title={scene.title}
        right={
          <button
            onClick={() => setShowVoicePicker("__all__")}
            className="text-text-muted hover:text-gold p-1"
            aria-label="Voice settings"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        }
      />

      {/* Hero — editorial cover */}
      <div className="relative h-44 overflow-hidden spotlight">
        <img src={scene.thumbnail} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/50 to-transparent" />
        <div className="absolute bottom-4 left-5 right-5">
          <div className="text-[10px] uppercase tracking-[0.25em] text-gold mb-1">{scene.source}</div>
          <h2 className="font-display text-3xl leading-[0.95] tracking-editorial">{scene.title}</h2>
        </div>
      </div>

      {/* Character voice chips bar */}
      <div className="px-5 pt-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
        {scene.characters.map((c, i) => {
          const cv = voiceMap[c.name];
          const voiceLabel = VOICE_LABELS[cv.voice];
          const toneLabel = TONE_LABELS[cv.tone];
          return (
            <button
              key={c.name}
              onClick={() => setShowVoicePicker(c.name)}
              className={cn(
                "shrink-0 flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border transition-colors",
                i === 0
                  ? "bg-plum/15 border-plum/40 text-plum-light"
                  : "bg-gold/10 border-gold/30 text-gold"
              )}
            >
              <span className="text-base leading-none">{voiceLabel.emoji}</span>
              <span className="text-xs font-medium">{c.name}{i === 0 && " (you)"}</span>
              <span className="text-[10px] opacity-70">·</span>
              <span className="text-[10px]">{toneLabel.emoji}</span>
            </button>
          );
        })}
      </div>

      {/* Script — editorial reading layout */}
      <div className="flex-1 px-5 pt-3 pb-44 overflow-y-auto space-y-2.5">
        {allLines.map((line, i) => {
          const cv = voiceMap[line.speaker];
          const tone = TONE_LABELS[cv.tone];
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className={cn(
                "px-4 py-3 rounded-2xl border transition-all",
                activeLine === i
                  ? "border-gold/60 bg-gold/8 ring-1 ring-gold/20"
                  : line.isYou
                  ? "border-plum/30 bg-plum/5"
                  : "border-border bg-bg-elevated"
              )}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-[10px] uppercase tracking-[0.2em] font-semibold",
                      line.isYou ? "text-plum-light" : "text-gold"
                    )}
                  >
                    {line.speaker}
                  </span>
                  {line.isYou && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-plum/20 text-plum-light font-semibold">
                      YOU
                    </span>
                  )}
                  {!line.isYou && (
                    <span className={cn("text-[10px] font-medium", tone.color)}>
                      {tone.emoji} {tone.en}
                    </span>
                  )}
                </div>
                {!line.isYou && (
                  <button
                    onClick={() => speakLine(line.text, line.speaker, i)}
                    className={cn(
                      "p-1.5 rounded-full transition-colors",
                      activeLine === i
                        ? "bg-gold text-bg"
                        : "text-text-muted hover:text-gold hover:bg-bg-muted"
                    )}
                  >
                    {activeLine === i ? <Pause className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
              <p className={cn(
                "text-[15px] leading-relaxed",
                line.isYou ? "font-display italic text-text" : "text-text"
              )}>
                {line.text}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Bottom bar — play all + record */}
      <div className="fixed bottom-20 inset-x-0 max-w-[440px] mx-auto px-4 pb-2">
        <div className="flex gap-2">
          <button
            onClick={playingAll ? stopAll : playAll}
            className={cn(
              "h-14 px-5 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all bg-bg-elevated border border-border text-text",
              playingAll && "border-gold/40 text-gold"
            )}
          >
            {playingAll ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span className="text-xs">{playingAll ? "Stop" : "Play scene"}</span>
          </button>
          <button
            onClick={() => setRecording(!recording)}
            className={cn(
              "flex-1 h-14 rounded-2xl font-semibold flex items-center justify-center gap-3 transition-all",
              recording
                ? "bg-terra text-text recording-pulse"
                : "bg-gold text-bg hover:bg-gold-light"
            )}
          >
            <Mic className="w-5 h-5" />
            <span className="text-sm">{recording ? "Recording…" : "Hold to read your part"}</span>
          </button>
        </div>
      </div>

      {/* Voice picker sheet */}
      <AnimatePresence>
        {showVoicePicker && (
          <VoicePickerSheet
            target={showVoicePicker}
            characters={scene.characters}
            voiceMap={voiceMap}
            onChange={(name, v) => setVoiceMap((m) => ({ ...m, [name]: v }))}
            onClose={() => setShowVoicePicker(null)}
            onPreview={(text, voice, tone) =>
              speak({ text, voice, tone, lang: detectLang(text) })
            }
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function VoicePickerSheet({
  target, characters, voiceMap, onChange, onClose, onPreview,
}: {
  target: string;
  characters: { name: string; lines: string[] }[];
  voiceMap: Record<string, CharVoice>;
  onChange: (name: string, v: CharVoice) => void;
  onClose: () => void;
  onPreview: (text: string, voice: VoiceType, tone: ToneType) => void;
}) {
  const showAll = target === "__all__";
  const targets = showAll ? characters : characters.filter((c) => c.name === target);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 z-40"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 32 }}
        className="fixed bottom-0 inset-x-0 z-50 max-w-[440px] mx-auto bg-bg-elevated border-t border-border rounded-t-3xl max-h-[85dvh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-bg-elevated p-5 pb-3 border-b border-border z-10">
          <div className="w-10 h-1 rounded-full bg-border mx-auto mb-3" />
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-xl">Character voices</h3>
              <p className="text-[11px] text-text-muted">Pick the voice and tone for each character</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-bg-muted">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-6">
          {targets.map((char, idx) => {
            const cv = voiceMap[char.name];
            const sampleLine = char.lines[0] ?? "Hello, this is a sample line.";
            return (
              <div key={char.name}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-gold font-semibold">
                      {char.name}{idx === 0 && characters.indexOf(char) === 0 && " (you)"}
                    </div>
                    <div className="text-[10px] text-text-subtle mt-0.5">{char.lines.length} lines</div>
                  </div>
                  <button
                    onClick={() => onPreview(sampleLine, cv.voice, cv.tone)}
                    className="text-[11px] text-gold font-semibold inline-flex items-center gap-1"
                  >
                    <Volume2 className="w-3 h-3" /> Preview
                  </button>
                </div>

                {/* Voice type */}
                <div className="text-[10px] uppercase tracking-wider text-text-muted mb-1.5">Voice</div>
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {(Object.keys(VOICE_LABELS) as VoiceType[]).map((v) => (
                    <button
                      key={v}
                      onClick={() => onChange(char.name, { ...cv, voice: v })}
                      className={cn(
                        "h-14 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all",
                        cv.voice === v
                          ? "border-gold bg-gold/10"
                          : "border-border bg-bg hover:border-border-strong"
                      )}
                    >
                      <span className="text-lg leading-none">{VOICE_LABELS[v].emoji}</span>
                      <span className="text-[10px] font-medium">{VOICE_LABELS[v].en}</span>
                    </button>
                  ))}
                </div>

                {/* Tone */}
                <div className="text-[10px] uppercase tracking-wider text-text-muted mb-1.5">Tone</div>
                <div className="grid grid-cols-4 gap-2">
                  {(Object.keys(TONE_LABELS) as ToneType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => onChange(char.name, { ...cv, tone: t })}
                      className={cn(
                        "h-14 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all",
                        cv.tone === t
                          ? "border-gold bg-gold/10"
                          : "border-border bg-bg hover:border-border-strong"
                      )}
                    >
                      <span className="text-lg leading-none">{TONE_LABELS[t].emoji}</span>
                      <span className="text-[9px] font-medium">{TONE_LABELS[t].en}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="sticky bottom-0 bg-bg-elevated p-5 pt-3 border-t border-border">
          <button
            onClick={onClose}
            className="w-full h-12 rounded-2xl bg-gold text-bg font-semibold"
          >
            Done
          </button>
        </div>
      </motion.div>
    </>
  );
}
