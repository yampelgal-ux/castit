"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Send, Sparkles, Mic, MicOff, Volume2, VolumeX, Square, Check, Undo2, CalendarDays } from "lucide-react";
import { Header } from "@/components/Header";
import { Avatar } from "@/components/Avatar";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { getAgenda, agendaBriefing, useAgendaStore, eventTime, setBlockRange, loadBlocks, saveBlocks, type AgendaKind } from "@/lib/agenda";
import {
  speak, stopSpeaking, startListening, hasSpeechRecognition, detectLang,
  type RecognitionHandle,
} from "@/lib/voice";
import { cn } from "@/lib/utils";

// Aria, the talent's manager. Every message carries a live briefing of the
// talent's auditions and calendar; the tools Aria calls (calendar events,
// reminders, availability) are applied here on the device, with undo.

type DoneAction = { label: string; kind: "event" | "block"; ref: string };
type Msg = { from: "user" | "agent"; text: string; time: string; actions?: DoneAction[] };
type ToolCall = { id: string; name: string; input: Record<string, unknown> };

const CHAT_KEY = "castit_aria_chat_v1";
const now = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/** Local "YYYY-MM-DDTHH:mm" → ISO; date-only stays a date. */
function toIso(local: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(local)) return local;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? local : d.toISOString();
}

export default function AgentChatPage() {
  const { lang, dir } = useT();
  const he = lang === "he";
  const L = (h: string, e: string) => (he ? h : e);
  const { profile, userId } = useStore();
  const addEvent = useAgendaStore((s) => s.add);
  const removeEvent = useAgendaStore((s) => s.remove);

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [voiceOutput, setVoiceOutput] = useState(false);
  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [ariaSpeaking, setAriaSpeaking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [undone, setUndone] = useState<Set<string>>(new Set());
  const recognitionRef = useRef<RecognitionHandle | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Restore the conversation, or open with a briefing from real data.
  // Re-runs when the language settles so a fresh opener is in the right language.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(CHAT_KEY) || "null") as Msg[] | null;
      if (saved && saved.length > 1) { setMsgs(saved); return; }
    } catch {}
    setMsgs([{ from: "agent", text: openingLine(), time: now() }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  useEffect(() => {
    if (msgs.length) { try { localStorage.setItem(CHAT_KEY, JSON.stringify(msgs.slice(-60))); } catch {} }
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, interimText]);

  useEffect(() => () => { recognitionRef.current?.stop(); stopSpeaking(); }, []);

  function openingLine(): string {
    const { events, actions } = getAgenda(userId, he);
    const soon = events.filter((e) => eventTime(e) > Date.now() && eventTime(e) < Date.now() + 7 * 86400_000);
    const name = profile.name?.split(" ")[0] || "";
    if (!soon.length && !actions.length) {
      return L(
        `היי${name ? ` ${name}` : ""}, אני Aria, המנהלת שלך. היומן שלך פנוי השבוע. ספרי לי על אודישנים, צילומים או ימים שאת לא פנויה, ואסדר הכל ביומן עם תזכורות.`,
        `Hi${name ? ` ${name}` : ""}, I'm Aria, your manager. Your week is clear. Tell me about auditions, shoots or days you're unavailable and I'll put them in your calendar with reminders.`
      );
    }
    const parts: string[] = [];
    if (actions.length) parts.push(L(`${actions.length} דברים מחכים לתשובה שלך (${actions[0].title}: ${actions[0].detail})`, `${actions.length} things need your answer (${actions[0].title}: ${actions[0].detail})`));
    if (soon.length) parts.push(L(`השבוע ביומן: ${soon.slice(0, 2).map((e) => e.title).join(", ")}`, `This week: ${soon.slice(0, 2).map((e) => e.title).join(", ")}`));
    return L(`היי${name ? ` ${name}` : ""}! ${parts.join(". ")}. במה להתחיל?`, `Hi${name ? ` ${name}` : ""}! ${parts.join(". ")}. Where do we start?`);
  }

  function applyTool(call: ToolCall): DoneAction | null {
    const i = call.input as Record<string, string>;
    if (call.name === "add_calendar_event" && i.title && i.start) {
      const kinds: AgendaKind[] = ["audition", "callback", "shoot", "self_tape", "personal"];
      const ev = addEvent({
        title: i.title, start: toIso(i.start), allDay: i.start.length <= 10,
        kind: kinds.includes(i.kind as AgendaKind) ? (i.kind as AgendaKind) : "personal",
        location: i.location || undefined, note: i.note || undefined, source: "aria",
      });
      return { kind: "event", ref: ev.id, label: `${L("נוסף ליומן", "Added to calendar")}: ${i.title}` };
    }
    if (call.name === "set_reminder" && i.text && i.at) {
      const ev = addEvent({ title: i.text, start: toIso(i.at), kind: "reminder", source: "aria" });
      const when = new Date(eventTime(ev)).toLocaleString(he ? "he-IL" : "en-US", { weekday: "short", hour: "2-digit", minute: "2-digit" });
      return { kind: "event", ref: ev.id, label: `${L("תזכורת", "Reminder")}: ${i.text} · ${when}` };
    }
    if (call.name === "block_calendar" && i.from) {
      const status = i.status === "available" ? "available" : "busy";
      const before = JSON.stringify(loadBlocks());
      const n = setBlockRange(i.from, i.to || i.from, status, i.reason);
      return { kind: "block", ref: before, label: status === "busy" ? L(`סומנו ${n} ימים כתפוסים`, `Marked ${n} day(s) busy`) : L(`סומנו ${n} ימים כפנויים`, `Marked ${n} day(s) available`) };
    }
    return null;
  }

  function undo(a: DoneAction) {
    if (a.kind === "event") removeEvent(a.ref);
    else { try { saveBlocks(JSON.parse(a.ref)); } catch {} }
    setUndone((s) => new Set(s).add(a.ref));
  }

  async function send(t: string) {
    if (!t.trim() || loading) return;
    const next = [...msgs, { from: "user" as const, text: t, time: now() }];
    setMsgs(next);
    setText("");
    setInterimText("");
    setLoading(true);
    try {
      // The API needs alternating turns starting with the user.
      const history = next.slice(next.findIndex((m) => m.from === "user")).slice(-30)
        .map((m) => ({ role: m.from === "user" ? "user" : "assistant", content: m.text }));
      const res = await fetch("/api/aria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          userName: profile.name || undefined,
          userTypecast: profile.typecast,
          mode: "agent",
          lang,
          briefing: agendaBriefing(userId),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Aria error");
      const actions = ((data.toolCalls ?? []) as ToolCall[]).map(applyTool).filter(Boolean) as DoneAction[];
      const reply: string = data.text || (actions.length ? L("סידרתי.", "Done.") : L("לא הצלחתי לענות הפעם. נסי שוב?", "I couldn't answer that one. Try again?"));
      setMsgs((m) => [...m, { from: "agent", text: reply, time: now(), actions }]);
      if (voiceOutput) {
        setAriaSpeaking(true);
        speak({ text: reply, voice: "female", tone: "neutral", lang: detectLang(reply),
          onEnd: () => setAriaSpeaking(false), onError: () => setAriaSpeaking(false) });
      }
    } catch (e) {
      setMsgs((m) => [...m, {
        from: "agent", time: now(),
        text: e instanceof Error && /many requests/i.test(e.message)
          ? L("יותר מדי הודעות ברצף. חכי דקה ונמשיך.", "Too many messages at once. Give it a minute.")
          : L("אין לי חיבור כרגע. ההודעה לא נשלחה, נסי שוב עוד רגע.", "I can't connect right now. Your message wasn't sent; try again in a moment."),
      }]);
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
      setNotice(L("הדפדפן הזה לא תומך בהקלדה קולית. נסי Chrome או Edge.", "Voice input isn't supported in this browser. Try Chrome or Edge."));
      return;
    }
    stopSpeaking();
    setAriaSpeaking(false);
    setNotice(null);
    setListening(true);
    setInterimText("");
    recognitionRef.current = startListening({
      lang: he ? "he-IL" : "en-US",
      continuous: false,
      interimResults: true,
      onResult: (transcript, isFinal) => {
        setInterimText(transcript);
        if (isFinal) { setListening(false); send(transcript); }
      },
      onEnd: () => setListening(false),
      onError: (err) => {
        setListening(false);
        if (err !== "no-speech" && err !== "aborted") setNotice(L("המיקרופון לא זמין. בדקי הרשאות בדפדפן.", "Microphone unavailable. Check browser permissions."));
      },
    });
  }

  const suggestions = he
    ? ["מה מחכה לי השבוע?", "יש לי אודישן ביום שלישי ב-11:00 בתל אביב", "תזכירי לי מחר ב-9 ללמוד את הסיידס", "אני לא פנויה בסוף השבוע הבא"]
    : ["What's on this week?", "I have an audition Tuesday at 11:00", "Remind me tomorrow at 9 to learn my sides", "I'm unavailable next weekend"];

  return (
    <div className="flex flex-col min-h-dvh bg-bg" dir={dir}>
      <Header
        back
        title={
          <span className="flex items-center gap-2">
            <Avatar seed={profile.avatarSeed || "Aria"} size={28} />
            <span className="font-display">Aria</span>
            <span className="text-xs text-text-muted font-sans">{ariaSpeaking ? L("מדברת", "speaking") : listening ? L("מקשיבה", "listening") : L("המנהלת שלך", "your manager")}</span>
          </span>
        }
        right={
          <div className="flex items-center">
            <Link href="/calendar" aria-label={L("היומן שלי", "My calendar")} className="w-11 h-11 grid place-items-center"><CalendarDays className="w-5 h-5" /></Link>
            <button
              onClick={() => setVoiceOutput((v) => { if (v) { stopSpeaking(); setAriaSpeaking(false); } return !v; })}
              aria-pressed={voiceOutput}
              aria-label={L("הקראת התשובות בקול", "Read replies aloud")}
              className={cn("w-11 h-11 grid place-items-center rounded-full", voiceOutput && "bg-hi text-on-hi")}>
              {voiceOutput ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
          </div>
        }
      />

      {ariaSpeaking && (
        <button onClick={() => { stopSpeaking(); setAriaSpeaking(false); }} className="mx-4 mt-3 h-10 rounded-lg bg-hi text-on-hi text-sm font-semibold inline-flex items-center justify-center gap-2">
          <Square className="w-3 h-3 fill-current" aria-hidden /> {L("עצירת ההקראה", "Stop reading")}
        </button>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" role="log" aria-live="polite">
        {msgs.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className={cn("flex flex-col gap-1.5", m.from === "user" ? "items-end" : "items-start")}>
            <div className={cn("max-w-[82%] px-4 py-2.5 rounded-xl text-[0.95rem] leading-relaxed whitespace-pre-wrap",
              m.from === "user" ? "bg-gold text-on-accent" : "sheet")}>
              {m.text}
              <div className={cn("text-xs mt-1", m.from === "user" ? "text-on-accent/70" : "text-text-subtle")}>{m.time}</div>
            </div>
            {m.actions?.map((a) => (
              <div key={a.ref} className="max-w-[82%] flex items-center gap-2 rounded-lg bg-hi-soft border border-border px-3 py-2 text-sm">
                <Check className="w-4 h-4 text-sage shrink-0" aria-hidden />
                <span className={cn("flex-1", undone.has(a.ref) && "line-through text-text-muted")}>{a.label}</span>
                {!undone.has(a.ref) && (
                  <button onClick={() => undo(a)} className="h-8 px-2 rounded-md text-xs font-semibold inline-flex items-center gap-1 underline">
                    <Undo2 className="w-3.5 h-3.5" aria-hidden /> {L("ביטול", "Undo")}
                  </button>
                )}
              </div>
            ))}
          </motion.div>
        ))}
        {loading && (
          <div className="sheet rounded-xl px-4 py-3 w-fit text-sm text-text-muted flex items-center gap-2" role="status">
            <Sparkles className="w-4 h-4 animate-pulse" aria-hidden /> {L("Aria חושבת…", "Aria is thinking…")}
          </div>
        )}
        {listening && interimText && (
          <div className="flex justify-end"><div className="max-w-[82%] px-4 py-2.5 rounded-xl text-sm bg-hi-soft border border-border italic">{interimText}…</div></div>
        )}
        <div ref={bottomRef} />
      </div>

      {notice && <p role="alert" className="mx-4 mb-2 text-sm text-terra">{notice}</p>}

      {!listening && (
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
          {suggestions.map((s) => (
            <button key={s} onClick={() => send(s)} className="shrink-0 px-3 h-9 rounded-full border border-border bg-bg-elevated text-sm whitespace-nowrap">{s}</button>
          ))}
        </div>
      )}

      <div className="p-3 border-t border-border bg-bg-elevated pb-[calc(env(safe-area-inset-bottom)+12px)]">
        <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="flex items-center gap-2">
          <button type="button" onClick={toggleListening}
            className={cn("w-11 h-11 rounded-full grid place-items-center shrink-0 border-2 border-border-strong", listening && "bg-terra text-white recording-pulse")}
            aria-label={listening ? L("עצירת הקלטה", "Stop listening") : L("דיבור במקום הקלדה", "Speak instead of typing")}>
            {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <label htmlFor="aria-input" className="sr-only">{L("הודעה ל-Aria", "Message Aria")}</label>
          <input id="aria-input" value={text} onChange={(e) => setText(e.target.value)} disabled={listening}
            placeholder={listening ? L("מקשיבה…", "Listening…") : L("מה צריך לסדר?", "What do you need?")}
            className="flex-1 h-11 px-4 rounded-full bg-bg-muted border border-border text-base placeholder:text-text-subtle disabled:opacity-50" />
          <button type="submit" disabled={!text.trim() || loading} aria-label={L("שליחה", "Send")}
            className="w-11 h-11 rounded-full bg-gold text-on-accent grid place-items-center disabled:opacity-40 shrink-0">
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
