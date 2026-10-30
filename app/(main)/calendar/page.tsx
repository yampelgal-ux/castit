"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, Trash2, MapPin, AlertCircle, Video, Clapperboard, Bell, CalendarDays, Ban, Check, CalendarPlus } from "lucide-react";
import { addToCalendar, absUrl, type IcsEvent } from "@/lib/ics";
import { Header } from "@/components/Header";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import {
  getAgenda, useAgendaStore, eventTime, loadBlocks, setBlockRange, saveBlocks, localIso,
  type AgendaEvent, type AgendaKind, type AvailBlock,
} from "@/lib/agenda";

// "My calendar": auditions, callbacks, self-tape deadlines and personal
// events in one place, plus busy/available days that casting pros see.
// Aria adds to the same calendar from the chat.

const KIND_STYLE: Record<AgendaKind, string> = {
  self_tape: "bg-hi text-on-hi",
  audition: "bg-text text-bg",
  callback: "bg-text text-bg",
  shoot: "bg-sage text-white",
  hold: "bg-plum text-white",
  personal: "bg-bg-muted text-text",
  reminder: "bg-bg-muted text-text",
};

export default function CalendarPage() {
  const { lang, dir } = useT();
  const he = lang === "he";
  const L = (h: string, e: string) => (he ? h : e);
  const userId = useStore((s) => s.userId);
  const personal = useAgendaStore((s) => s.events);
  const addEvent = useAgendaStore((s) => s.add);
  const removeEvent = useAgendaStore((s) => s.remove);

  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(localIso(today));
  const [blocks, setBlocks] = useState<AvailBlock[]>([]);
  const [rev, setRev] = useState(0);
  const [adding, setAdding] = useState(false);
  // Everything here lives in browser storage; render it only after mount so
  // the server HTML (which has none of it) hydrates cleanly.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => { setBlocks(loadBlocks()); }, [rev]);
  useEffect(() => {
    const bump = () => setRev((n) => n + 1);
    window.addEventListener("castit:remote-update", bump);
    return () => window.removeEventListener("castit:remote-update", bump);
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const { events, actions } = useMemo(
    () => (mounted ? getAgenda(userId, he) : { events: [] as AgendaEvent[], actions: [] }),
    [mounted, userId, he, personal, rev]
  );
  const byDay = useMemo(() => {
    const m = new Map<string, AgendaEvent[]>();
    for (const e of events) {
      const k = localIso(new Date(eventTime(e)));
      m.set(k, [...(m.get(k) ?? []), e]);
    }
    return m;
  }, [events]);

  const monthName = cursor.toLocaleDateString(he ? "he-IL" : "en-US", { month: "long", year: "numeric" });
  const dow = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 7 + i).toLocaleDateString(he ? "he-IL" : "en-US", { weekday: "narrow" }));
  const grid = useMemo(() => {
    const cells: (Date | null)[] = [];
    for (let i = 0; i < cursor.getDay(); i++) cells.push(null);
    const n = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= n; d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    return cells;
  }, [cursor]);

  const dayEvents = byDay.get(selected) ?? [];
  const dayBlock = blocks.find((b) => b.date === selected);
  const upcoming = events.filter((e) => eventTime(e) >= Date.now() - 3600_000).slice(0, 6);

  function setDay(status: AvailBlock["status"] | null) {
    haptic("light");
    if (status) setBlockRange(selected, selected, status);
    else saveBlocks(loadBlocks().filter((b) => b.date !== selected));
    setRev((n) => n + 1);
  }

  const fmtTime = (e: AgendaEvent) => e.allDay || e.start.length <= 10
    ? L("כל היום", "All day")
    : new Date(e.start).toLocaleTimeString(he ? "he-IL" : "en-US", { hour: "2-digit", minute: "2-digit" });
  const fmtDay = (iso: string) => new Date(`${iso}T12:00`).toLocaleDateString(he ? "he-IL" : "en-US", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="min-h-dvh bg-bg" dir={dir}>
      <Header back title={L("היומן שלי", "My calendar")} right={
        <button onClick={() => setAdding(true)} aria-label={L("הוספת אירוע", "Add event")} className="w-11 h-11 grid place-items-center">
          <Plus className="w-5 h-5" />
        </button>
      } />

      <div className="px-4 pt-4 space-y-5">
        {actions.length > 0 && (
          <section aria-labelledby="todo-h" className="sheet rounded-xl p-3 space-y-2">
            <h2 id="todo-h" className="text-sm font-bold flex items-center gap-2"><AlertCircle className="w-4 h-4" aria-hidden /> {L("מחכה לך", "Waiting on you")}</h2>
            {actions.map((a) => (
              <Link key={a.id} href={a.href} className="flex items-center justify-between gap-2 rounded-lg bg-hi-soft px-3 py-2.5 min-h-[48px]">
                <span className="min-w-0"><span className="font-semibold text-sm">{a.title}</span><span className="block text-xs text-text-muted truncate">{a.detail}</span></span>
                <ChevronLeft className={cn("w-4 h-4 shrink-0", !he && "rotate-180")} aria-hidden />
              </Link>
            ))}
          </section>
        )}

        {/* Month */}
        <section aria-label={monthName}>
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} aria-label={L("החודש הקודם", "Previous month")}
              className="w-11 h-11 rounded-full border-2 border-border-strong grid place-items-center">
              {he ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
            <div className="font-display text-xl" aria-live="polite">{monthName}</div>
            <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} aria-label={L("החודש הבא", "Next month")}
              className="w-11 h-11 rounded-full border-2 border-border-strong grid place-items-center">
              {he ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-1" aria-hidden>
            {dow.map((d, i) => <div key={i} className="text-center text-xs font-bold text-text-muted">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {grid.map((d, i) => {
              if (!d) return <div key={i} />;
              const k = localIso(d);
              const evs = byDay.get(k) ?? [];
              const b = blocks.find((x) => x.date === k);
              const isToday = k === localIso(today);
              const isSel = k === selected;
              return (
                <button key={i} onClick={() => { setSelected(k); haptic("light"); }}
                  aria-pressed={isSel}
                  aria-label={`${fmtDay(k)}${evs.length ? `, ${evs.length} ${L("אירועים", "events")}` : ""}${b ? `, ${b.status === "busy" ? L("תפוס/ה", "busy") : L("פנוי/ה", "available")}` : ""}`}
                  className={cn(
                    "aspect-square rounded-lg flex flex-col items-center justify-center text-sm font-semibold border-2 relative",
                    isSel ? "border-border-strong bg-hi text-on-hi" : isToday ? "border-border-strong" : "border-transparent",
                    !isSel && b?.status === "busy" && "bg-terra/10 line-through decoration-terra",
                    !isSel && b?.status === "available" && "bg-sage/10",
                  )}>
                  {d.getDate()}
                  {evs.length > 0 && (
                    <span className="flex gap-0.5 mt-0.5" aria-hidden>
                      {evs.slice(0, 3).map((e) => <span key={e.id} className={cn("w-1.5 h-1.5 rounded-full", e.kind === "self_tape" ? "bg-terra" : "bg-text")} />)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Selected day */}
        <section aria-labelledby="day-h" className="space-y-2">
          <h2 id="day-h" className="font-display text-lg">{fmtDay(selected)}</h2>
          {dayEvents.length === 0 && <p className="text-sm text-text-muted">{L("אין אירועים ביום הזה.", "Nothing on this day.")}</p>}
          {dayEvents.map((e) => <EventRow key={e.id} e={e} time={fmtTime(e)} onRemove={e.source !== "audition" ? () => removeEvent(e.id) : undefined} L={L} />)}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button onClick={() => setDay("busy")} aria-pressed={dayBlock?.status === "busy"}
              className={cn("h-11 rounded-lg border-2 text-xs font-semibold flex items-center justify-center gap-1", dayBlock?.status === "busy" ? "border-terra bg-terra/10 text-terra" : "border-border")}>
              <Ban className="w-3.5 h-3.5" aria-hidden /> {L("תפוס/ה", "Busy")}
            </button>
            <button onClick={() => setDay("available")} aria-pressed={dayBlock?.status === "available"}
              className={cn("h-11 rounded-lg border-2 text-xs font-semibold flex items-center justify-center gap-1", dayBlock?.status === "available" ? "border-sage bg-sage/10 text-sage" : "border-border")}>
              <Check className="w-3.5 h-3.5" aria-hidden /> {L("פנוי/ה", "Available")}
            </button>
            <button onClick={() => setAdding(true)} className="h-11 rounded-lg bg-gold text-on-accent text-xs font-semibold flex items-center justify-center gap-1">
              <Plus className="w-3.5 h-3.5" aria-hidden /> {L("אירוע", "Event")}
            </button>
          </div>
          {dayBlock && <button onClick={() => setDay(null)} className="text-xs underline text-text-muted">{L("ניקוי הסימון של היום", "Clear this day's status")}</button>}
        </section>

        {/* Upcoming */}
        <section aria-labelledby="up-h" className="space-y-2 pb-6">
          <h2 id="up-h" className="font-display text-lg">{L("בקרוב", "Coming up")}</h2>
          {upcoming.length === 0
            ? <p className="text-sm text-text-muted">{L("היומן ריק. אפשר להוסיף אירוע, או לבקש מ-Aria לסדר לך את השבוע.", "Your calendar is empty. Add an event, or ask Aria to plan your week.")}</p>
            : upcoming.map((e) => <EventRow key={e.id} e={e} time={`${fmtDay(localIso(new Date(eventTime(e))))} · ${fmtTime(e)}`} L={L} />)}
          {upcoming.length > 1 && (
            <button onClick={() => addToCalendar(upcoming.map(toIcs), L("האודישנים שלי", "My auditions"))}
              className="w-full h-11 rounded-lg border-2 border-border-strong text-sm font-semibold flex items-center justify-center gap-2">
              <CalendarPlus className="w-4 h-4" aria-hidden /> {L(`הוספת כל ${upcoming.length} האירועים ליומן של הטלפון`, `Add all ${upcoming.length} to my phone's calendar`)}
            </button>
          )}
          <Link href="/studio/agent" className="block text-center text-sm font-semibold underline pt-1">{L("לבקש מ-Aria לסדר את היומן", "Ask Aria to organize my calendar")}</Link>
        </section>
      </div>

      {adding && (
        <AddEventSheet L={L} defaultDate={selected} onClose={() => setAdding(false)}
          onSave={(ev) => { addEvent(ev); haptic("success"); setAdding(false); setSelected(ev.start.slice(0, 10)); }} />
      )}
    </div>
  );
}

const toIcs = (e: AgendaEvent): IcsEvent => ({ uid: e.id, title: e.title, start: e.start, end: e.end, location: e.location, description: e.note, url: absUrl(e.href) });

function EventRow({ e, time, onRemove, L }: { e: AgendaEvent; time: string; onRemove?: () => void; L: (h: string, e: string) => string }) {
  const Icon = e.kind === "self_tape" ? Video : e.kind === "reminder" ? Bell : e.kind === "personal" ? CalendarDays : Clapperboard;
  const body = (
    <>
      <span className={cn("w-10 h-10 rounded-lg grid place-items-center shrink-0", KIND_STYLE[e.kind])}><Icon className="w-4 h-4" aria-hidden /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold truncate">{e.title}</span>
        <span className="block text-xs text-text-muted">{time}{e.location && <> · <MapPin className="inline w-3 h-3" aria-hidden /> {e.location}</>}</span>
        {e.note && <span className="block text-xs text-text-muted truncate">{e.note}</span>}
      </span>
    </>
  );
  return (
    <div className="sheet rounded-xl flex items-center gap-3 p-2.5">
      {e.href ? <Link href={e.href} className="flex items-center gap-3 flex-1 min-w-0">{body}</Link> : <div className="flex items-center gap-3 flex-1 min-w-0">{body}</div>}
      <button onClick={() => addToCalendar([toIcs(e)], e.title)} aria-label={L("הוספה ליומן של הטלפון", "Add to my phone's calendar")} title={L("הוספה ליומן של הטלפון", "Add to my phone's calendar")}
        className="w-11 h-11 grid place-items-center text-text-muted shrink-0">
        <CalendarPlus className="w-4 h-4" />
      </button>
      {onRemove && (
        <button onClick={onRemove} aria-label={L("מחיקת האירוע", "Delete event")} className="w-11 h-11 grid place-items-center text-terra shrink-0">
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

function AddEventSheet({ L, defaultDate, onClose, onSave }: {
  L: (h: string, e: string) => string; defaultDate: string; onClose: () => void;
  onSave: (e: Omit<AgendaEvent, "id">) => void;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("10:00");
  const [allDay, setAllDay] = useState(false);
  const [kind, setKind] = useState<AgendaKind>("audition");
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const kinds: { id: AgendaKind; label: string }[] = [
    { id: "audition", label: L("אודישן", "Audition") },
    { id: "callback", label: L("קולבק", "Callback") },
    { id: "shoot", label: L("יום צילום", "Shoot day") },
    { id: "self_tape", label: L("צילום טייפ", "Self-tape") },
    { id: "personal", label: L("אישי", "Personal") },
    { id: "reminder", label: L("תזכורת", "Reminder") },
  ];
  const input = "w-full mt-1 rounded-lg bg-bg-muted border border-border px-3 h-11 text-base";
  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-end justify-center" onClick={onClose}>
      <form role="dialog" aria-modal="true" aria-labelledby="add-h" onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          onSave({
            title: title.trim(), kind, source: "user", allDay,
            start: allDay ? date : new Date(`${date}T${time}`).toISOString(),
            location: location.trim() || undefined, note: note.trim() || undefined,
          });
        }}
        className="w-full max-w-[440px] bg-bg-elevated rounded-t-2xl border-t-2 border-border-strong p-5 pb-[calc(env(safe-area-inset-bottom)+20px)] space-y-3 max-h-[90dvh] overflow-y-auto">
        <h2 id="add-h" className="font-display text-xl">{L("אירוע חדש", "New event")}</h2>
        <label className="block text-sm font-semibold">{L("מה", "What")}
          <input autoFocus required value={title} onChange={(e) => setTitle(e.target.value)} className={input} placeholder={L("למשל: אודישן לסדרה בכאן 11", "e.g. Audition for a TV series")} />
        </label>
        <div role="radiogroup" aria-label={L("סוג", "Type")} className="flex flex-wrap gap-2">
          {kinds.map((k) => (
            <button type="button" key={k.id} role="radio" aria-checked={kind === k.id} onClick={() => setKind(k.id)}
              className={cn("h-9 px-3 rounded-full border-2 text-xs font-semibold", kind === k.id ? "bg-hi border-border-strong text-on-hi" : "border-border")}>
              {k.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-sm font-semibold">{L("תאריך", "Date")}
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={input} />
          </label>
          <label className="block text-sm font-semibold">{L("שעה", "Time")}
            <input type="time" value={time} disabled={allDay} onChange={(e) => setTime(e.target.value)} className={cn(input, allDay && "opacity-50")} />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="w-5 h-5" /> {L("כל היום", "All day")}</label>
        <label className="block text-sm font-semibold">{L("מקום (לא חובה)", "Location (optional)")}
          <input value={location} onChange={(e) => setLocation(e.target.value)} className={input} />
        </label>
        <label className="block text-sm font-semibold">{L("הערה (לא חובה)", "Note (optional)")}
          <input value={note} onChange={(e) => setNote(e.target.value)} className={input} />
        </label>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button type="button" onClick={onClose} className="h-12 rounded-lg border-2 border-border-strong font-semibold">{L("ביטול", "Cancel")}</button>
          <button type="submit" className="h-12 rounded-lg bg-gold text-on-accent font-semibold">{L("שמירה", "Save")}</button>
        </div>
      </form>
    </div>
  );
}
