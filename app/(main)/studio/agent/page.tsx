"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, Mic, MicOff, Volume2, VolumeX, Square, Check, X, Wrench } from "lucide-react";
import { AGENT_CHAT, type AgentMessage } from "@/lib/mock-data";
import { Header } from "@/components/Header";
import { Avatar } from "@/components/Avatar";
import { useStore } from "@/lib/store";
import {
  speak, stopSpeaking, isSpeaking,
  startListening, hasSpeechRecognition,
  detectLang, type RecognitionHandle,
} from "@/lib/voice";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "Any new callbacks?",
  "Block Tuesday for self-tapes",
  "Pass on anything unpaid",
];

type ToolCall = { id: string; name: string; input: any };

export default function AgentChatPage() {
  const [msgs, setMsgs] = useState<AgentMessage[]>(AGENT_CHAT);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [voiceOutput, setVoiceOutput] = useState(false); // auto-speak Aria's replies
  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [ariaSpeaking, setAriaSpeaking] = useState(false);
  const [pendingTool, setPendingTool] = useState<ToolCall | null>(null);
  const recognitionRef = useRef<RecognitionHandle | null>(null);
  const { profile } = useStore();
  const seed = profile.avatarSeed || "Aria";
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, interimText]);

  useEffect(() => () => {
    recognitionRef.current?.stop();
    stopSpeaking();
  }, []);

  async function send(t: string) {
    if (!t.trim() || loading) return;
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg: AgentMessage = { from: "user", text: t, time };
    const newMsgs = [...msgs, userMsg];
    setMsgs(newMsgs);
    setText("");
    setInterimText("");
    setLoading(true);

    try {
      const apiMessages = newMsgs.map((m) => ({
        role: m.from === "user" ? "user" : "assistant",
        content: m.text,
      }));

      const res = await fetch("/api/aria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          userName: profile.name || "talent",
          userTypecast: profile.typecast,
          mode: "agent",
        }),
      });

      const { text: reply, toolCalls } = await res.json();
      const replyMsg: AgentMessage = {
        from: "agent",
        text: reply || "Working on it…",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMsgs((m) => [...m, replyMsg]);

      // Surface the first tool call for confirmation (skip auto-execution)
      if (toolCalls?.length) {
        setPendingTool(toolCalls[0]);
      }

      // Auto-speak the reply if voice output is on
      if (voiceOutput) {
        setAriaSpeaking(true);
        speak({
          text: reply,
          voice: "female",
          tone: "neutral",
          lang: detectLang(reply),
          onEnd: () => setAriaSpeaking(false),
          onError: () => setAriaSpeaking(false),
        });
      }
    } catch {
      const errMsg: AgentMessage = {
        from: "agent",
        text: "On it. I'll update you the moment something changes.",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMsgs((m) => [...m, errMsg]);
    } finally {
      setLoading(false);
    }
  }

  function toggleListening() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      if (interimText.trim()) send(interimText);
      return;
    }

    if (!hasSpeechRecognition()) {
      alert("Voice input is not supported in this browser. Try Chrome or Edge.");
      return;
    }

    // Stop Aria mid-sentence if user starts talking
    stopSpeaking();
    setAriaSpeaking(false);

    setListening(true);
    setInterimText("");
    recognitionRef.current = startListening({
      lang: "en-US",
      continuous: false,
      interimResults: true,
      onResult: (transcript, isFinal) => {
        setInterimText(transcript);
        if (isFinal) {
          setListening(false);
          send(transcript);
        }
      },
      onEnd: () => setListening(false),
      onError: (err) => {
        console.error("STT error:", err);
        setListening(false);
        if (err !== "no-speech" && err !== "aborted") {
          alert(`Voice error: ${err}`);
        }
      },
    });
  }

  function toggleVoiceOutput() {
    setVoiceOutput((v) => {
      if (v) {
        stopSpeaking();
        setAriaSpeaking(false);
      }
      return !v;
    });
  }

  function stopAriaSpeaking() {
    stopSpeaking();
    setAriaSpeaking(false);
  }

  return (
    <div className="flex flex-col min-h-dvh bg-bg">
      <Header
        back
        title={
          <span className="flex items-center gap-2">
            <div className="relative">
              <Avatar seed={seed} size={28} />
              {(ariaSpeaking || listening) && (
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-gold ring-2 ring-bg animate-pulse" />
              )}
            </div>
            <span className="font-display tracking-editorial">Aria</span>
            <span className={cn(
              "text-[10px]",
              ariaSpeaking ? "text-gold" : listening ? "text-terra" : "text-sage"
            )}>
              ● {ariaSpeaking ? "speaking" : listening ? "listening" : "online"}
            </span>
          </span>
        }
        right={
          <div className="flex items-center gap-1">
            <button
              onClick={toggleVoiceOutput}
              className={cn(
                "p-1.5 rounded-full transition-colors",
                voiceOutput ? "text-gold bg-gold/10" : "text-text-muted"
              )}
              aria-label="Toggle voice output"
              title={voiceOutput ? "Voice mode ON" : "Voice mode OFF"}
            >
              {voiceOutput ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <Sparkles className="w-4 h-4 text-gold" />
          </div>
        }
      />

      {/* Voice mode banner */}
      {voiceOutput && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mt-3 px-3 py-2 rounded-xl bg-gold/8 border border-gold/20 flex items-center gap-2"
        >
          <Volume2 className="w-3.5 h-3.5 text-gold shrink-0" />
          <p className="text-[11px] text-gold flex-1">
            Voice mode is on — Aria will speak her replies aloud
          </p>
          {ariaSpeaking && (
            <button
              onClick={stopAriaSpeaking}
              className="text-[10px] px-2 py-1 rounded-full bg-gold/20 text-gold font-semibold inline-flex items-center gap-1"
            >
              <Square className="w-2.5 h-2.5 fill-current" /> Stop
            </button>
          )}
        </motion.div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {msgs.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("flex", m.from === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-snug",
                m.from === "user"
                  ? "bg-gold text-bg rounded-br-md"
                  : "bg-bg-elevated border border-border rounded-bl-md"
              )}
            >
              {m.text}
              <div className={cn("text-[10px] mt-1", m.from === "user" ? "text-bg/60" : "text-text-subtle")}>
                {m.time}
              </div>
            </div>
          </motion.div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl bg-bg-elevated border border-border rounded-bl-md text-text-muted text-sm flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
                <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" style={{ animationDelay: "0.2s" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" style={{ animationDelay: "0.4s" }} />
              </div>
              <span>Aria is thinking…</span>
            </div>
          </div>
        )}

        {/* Live transcription bubble */}
        {listening && interimText && (
          <div className="flex justify-end">
            <div className="max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-snug bg-gold/20 text-gold border border-gold/40 italic">
              {interimText}…
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {!listening && (
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="shrink-0 px-3 h-8 rounded-full bg-bg-elevated border border-border text-xs text-text-muted whitespace-nowrap hover:text-text hover:border-border-strong transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Listening waveform */}
      {listening && !interimText && (
        <div className="px-4 pb-2 flex items-center justify-center gap-4">
          <span className="text-xs text-terra animate-pulse">● Listening…</span>
          <div className="flex items-end gap-1 h-6">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <span
                key={i}
                className="wave-bar"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tool-call confirmation */}
      <AnimatePresence>
        {pendingTool && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="mx-3 mb-2 rounded-2xl border border-gold/30 bg-gold/8 p-3"
          >
            <div className="flex items-start gap-2 mb-2">
              <Wrench className="w-4 h-4 text-gold shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] uppercase tracking-widest text-gold font-semibold">
                  Aria wants to act
                </p>
                <p className="text-sm mt-0.5">
                  {pendingTool.name === "get_castings" && "Fetch open castings"}
                  {pendingTool.name === "apply_to_casting" && "Submit an application"}
                  {pendingTool.name === "block_calendar" && "Block dates on your calendar"}
                  {!["get_castings","apply_to_casting","block_calendar"].includes(pendingTool.name) && pendingTool.name}
                </p>
                {pendingTool.input && Object.keys(pendingTool.input).length > 0 && (
                  <pre className="mt-1.5 text-[11px] text-text-muted bg-bg-elevated/60 rounded-lg p-2 overflow-x-auto">
                    {JSON.stringify(pendingTool.input, null, 2)}
                  </pre>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setMsgs((m) => [...m, {
                    from: "agent",
                    text: `Done — ${pendingTool.name.replace(/_/g, " ")} completed.`,
                    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                  }]);
                  setPendingTool(null);
                }}
                className="flex-1 h-9 rounded-full bg-gold text-bg font-semibold text-xs inline-flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" /> Approve
              </button>
              <button
                onClick={() => setPendingTool(null)}
                className="flex-1 h-9 rounded-full bg-bg-elevated border border-border text-xs inline-flex items-center justify-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" /> Decline
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input bar */}
      <div className="p-3 border-t border-border glass">
        <form
          onSubmit={(e) => { e.preventDefault(); send(text); }}
          className="flex items-center gap-2"
        >
          <button
            type="button"
            onClick={toggleListening}
            className={cn(
              "w-11 h-11 rounded-full grid place-items-center transition-all shrink-0",
              listening
                ? "bg-terra text-text recording-pulse"
                : "bg-bg-elevated border border-border text-text-muted hover:text-gold hover:border-gold/40"
            )}
            aria-label={listening ? "Stop listening" : "Start voice input"}
          >
            {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={listening ? "Listening…" : "Tell Aria what you need…"}
            disabled={listening}
            className="flex-1 h-11 px-4 rounded-full bg-bg-elevated border border-border outline-none text-sm placeholder:text-text-subtle disabled:opacity-50 focus:border-gold/40 transition-colors"
          />
          <button
            type="submit"
            className="w-11 h-11 rounded-full bg-gold text-bg grid place-items-center disabled:opacity-50 hover:bg-gold-light transition-colors shrink-0"
            disabled={!text.trim() || loading}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
