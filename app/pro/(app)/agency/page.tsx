"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, UserPlus, Send, Search, Check, X, Clock, Link2, Loader2, AlertCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { EmptyState } from "@/components/EmptyState";
import { StageBadge } from "@/components/StageBadge";
import { TalentPhoto } from "@/components/TalentPhoto";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";
import { DEMO_MODE } from "@/lib/cloud/config";
import { fetchRealTalents } from "@/lib/cloud/talents";
import { listOpenCalls, fetchInvite, type OpenCall, type InviteLink } from "@/lib/cloud/invites";
import {
  loadRoster, requestRoster, removeFromRoster, submitRosterToCall, useAgencySubs,
  type RosterEntry,
} from "@/lib/cloud/agency";
import type { Talent } from "@/lib/mock-data";

type Tab = "roster" | "submit" | "track";

export default function AgencyPage() {
  const { lang, dir } = useT();
  const L = (h: string, e: string) => (lang === "he" ? h : e);
  const studio = useStore((s) => s.profile.studio) || "";
  const userId = useStore((s) => s.userId);
  const [tab, setTab] = useState<Tab>("roster");
  const [roster, setRoster] = useState<RosterEntry[] | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "missing" | "error" | "offline">("loading");

  const reload = useCallback(async () => {
    const r = await loadRoster();
    if (r.ok) { setRoster(r.data); setState("ok"); }
    else setState(r.reason);
  }, []);
  useEffect(() => { void reload(); }, [reload, userId]);

  const accepted = (roster ?? []).filter((r) => r.status === "accepted");

  return (
    <div className="min-h-dvh bg-bg pb-24" dir={dir}>
      <Header back title={L("הסוכנות שלי", "My agency")} />
      <div className="px-4 pt-2 space-y-4">
        <p className="text-sm text-text-muted leading-relaxed">
          {L("מנהלים כאן את השחקנים שאתם מייצגים, מגישים אותם לאודישנים בלחיצה ועוקבים אחרי הסטטוס של כל אחד.",
             "Manage the actors you represent, submit them to auditions in one tap and follow each one's status.")}
        </p>

        {(state === "offline" || DEMO_MODE) && (
          <Notice text={L("ניהול סוכנות עובד בחשבון אמיתי מחובר.", "Agency tools work in a signed-in live account.")} />
        )}
        {state === "missing" && (
          <Notice text={L("הפיצ'ר מוכן, וצריך להפעיל אותו פעם אחת במסד הנתונים (קובץ 008_agency.sql).", "This feature needs a one-time database update (008_agency.sql).")} />
        )}
        {state === "error" && (
          <Notice text={L("לא הצלחנו לטעון את הרשימה. בדקו את החיבור ונסו שוב.", "Couldn't load your roster. Check your connection and try again.")} />
        )}

        <div role="tablist" className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-bg-elevated border border-border">
          {([["roster", L("השחקנים שלי", "My actors")], ["submit", L("הגשה לאודישן", "Submit")], ["track", L("מעקב", "Tracking")]] as [Tab, string][]).map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
              className={cn("h-10 rounded-xl text-sm font-semibold", tab === id ? "bg-gold text-on-accent" : "text-text-muted")}>
              {label}
            </button>
          ))}
        </div>

        {tab === "roster" && <RosterTab roster={roster} state={state} studio={studio} onChanged={reload} L={L} />}
        {tab === "submit" && <SubmitTab actors={accepted} L={L} onDone={() => setTab("track")} />}
        {tab === "track" && <TrackTab L={L} />}
      </div>
    </div>
  );
}

function Notice({ text }: { text: string }) {
  return (
    <div role="status" className="flex gap-2 p-3 rounded-xl bg-gold/10 border border-gold/30 text-sm">
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-gold" aria-hidden /> {text}
    </div>
  );
}

function RosterTab({ roster, state, studio, onChanged, L }: {
  roster: RosterEntry[] | null; state: string; studio: string; onChanged: () => void; L: (h: string, e: string) => string;
}) {
  const [adding, setAdding] = useState(false);
  if (state === "loading") return <div className="py-10 grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-text-muted" /></div>;
  return (
    <div className="space-y-3">
      <button onClick={() => setAdding((v) => !v)} disabled={state !== "ok"}
        className="w-full h-12 rounded-2xl bg-gold text-on-accent font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50">
        <UserPlus className="w-4 h-4" aria-hidden /> {L("הוספת שחקן/ית לסוכנות", "Add an actor")}
      </button>
      {adding && <AddActor existing={new Set((roster ?? []).map((r) => r.talent_id))} studio={studio} L={L} onAdded={() => { setAdding(false); onChanged(); }} />}
      {roster && roster.length === 0 && (
        <EmptyState icon={Building2} title={L("עוד אין שחקנים ברשימה", "No actors yet")}
          description={L("מוסיפים שחקן/ית, והם מאשרים את הייצוג מהאפליקציה שלהם.", "Add an actor and they approve the representation in their app.")} />
      )}
      {(roster ?? []).map((r) => (
        <div key={r.talent_id} className="flex items-center gap-3 p-3 rounded-2xl bg-bg-elevated border border-border">
          <TalentPhoto src={r.photo_url} name={r.name ?? ""} className="w-11 h-11 rounded-xl shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{r.name || r.username}</div>
            <div className={cn("text-[0.6875rem]", r.status === "accepted" ? "text-sage" : "text-gold")}>
              {r.status === "accepted" ? L("מיוצג/ת", "Represented") : L("מחכה לאישור של השחקן/ית", "Waiting for the actor to approve")}
            </div>
          </div>
          <button onClick={async () => { if (await removeFromRoster(r.talent_id)) onChanged(); }}
            aria-label={L("הסרה מהסוכנות", "Remove")} className="w-9 h-9 rounded-full border border-border grid place-items-center text-text-muted">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

function AddActor({ existing, studio, onAdded, L }: { existing: Set<string>; studio: string; onAdded: () => void; L: (h: string, e: string) => string }) {
  const [q, setQ] = useState("");
  const [all, setAll] = useState<Talent[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [agency, setAgency] = useState(studio);
  useEffect(() => { void fetchRealTalents().then(setAll); }, []);
  const hits = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    return all.filter((t) => !existing.has(t.id) && (t.name.toLowerCase().includes(s) || (t.username || "").toLowerCase().includes(s))).slice(0, 12);
  }, [q, all, existing]);
  return (
    <div className="rounded-2xl border border-border bg-bg-elevated p-3 space-y-2.5">
      <input value={agency} onChange={(e) => setAgency(e.target.value)} dir="auto"
        placeholder={L("שם הסוכנות", "Agency name")} aria-label={L("שם הסוכנות", "Agency name")}
        className="w-full h-11 px-3 rounded-xl bg-bg border border-border text-sm outline-none focus:border-gold/60" />
      <label className="flex items-center gap-2 h-11 px-3 rounded-xl bg-bg border border-border focus-within:border-gold/60">
        <Search className="w-4 h-4 text-text-muted" aria-hidden />
        <input value={q} onChange={(e) => setQ(e.target.value)} dir="auto" autoFocus
          placeholder={L("חיפוש שחקן/ית לפי שם", "Search an actor by name")} className="flex-1 bg-transparent text-sm outline-none" />
      </label>
      {err && <p role="alert" className="text-xs text-terra">{err}</p>}
      {q.trim().length >= 2 && hits.length === 0 && (
        <p className="text-xs text-text-muted">{L("לא נמצאו שחקנים. השחקן/ית צריכ/ה חשבון ב-CastIt.", "No actors found. They need a CastIt account.")}</p>
      )}
      {hits.map((t) => (
        <button key={t.id} disabled={!!busy}
          onClick={async () => {
            setBusy(t.id); setErr("");
            const e = await requestRoster(t.id, agency.trim());
            setBusy(null);
            if (e) setErr(e === "missing" ? L("צריך להפעיל את עדכון מסד הנתונים קודם.", "Run the database update first.") : L("לא הצלחנו לשלוח את הבקשה. רק חשבון מלהקים/סוכנים מאושר יכול להוסיף שחקנים.", "Couldn't send the request. Only an approved pro account can add actors."));
            else { haptic("success"); onAdded(); }
          }}
          className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-bg text-start">
          <TalentPhoto src={t.photo} name={t.name} className="w-9 h-9 rounded-lg shrink-0" />
          <span className="flex-1 min-w-0 truncate text-sm font-medium">{t.name}</span>
          {busy === t.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="text-xs text-gold font-semibold">{L("בקשת ייצוג", "Request")}</span>}
        </button>
      ))}
    </div>
  );
}

function SubmitTab({ actors, onDone, L }: { actors: RosterEntry[]; onDone: () => void; L: (h: string, e: string) => string }) {
  const [calls, setCalls] = useState<OpenCall[] | null>(null);
  const [link, setLink] = useState("");
  const [linked, setLinked] = useState<InviteLink | null>(null);
  const [linkErr, setLinkErr] = useState("");
  const [target, setTarget] = useState<{ code: string; title: string } | null>(null);
  const [pick, setPick] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState("");
  useEffect(() => { void listOpenCalls().then((c) => setCalls(c ?? [])); }, []);

  async function openLink() {
    setLinkErr("");
    const code = link.trim().split("/").filter(Boolean).pop() ?? "";
    const inv = code ? await fetchInvite(code) : null;
    if (!inv) { setLinkErr(L("הקישור לא נמצא או שהאודישן נסגר.", "Link not found, or the audition is closed.")); return; }
    setLinked(inv);
    setTarget({ code: inv.code, title: `${inv.project?.title ?? ""} · ${inv.role.name}` });
  }

  async function send() {
    if (!target || pick.size === 0) return;
    setSending(true); setResult("");
    const r = await submitRosterToCall(target.code, [...pick]);
    setSending(false);
    if (r.ok) { haptic("success"); setResult(r.ok === 1 ? L("ההגשה עברה. השחקן/ית יקבל/תקבל את האודישן באפליקציה ויוכל/תוכל לשלוח טייפ.", "Submitted. The actor gets the audition in their app.") : L(`הוגשו ${r.ok} שחקנים. הם יקבלו את האודישן באפליקציה ויוכלו לשלוח טייפ.`, `${r.ok} actors submitted. They get the audition in their app.`)); setPick(new Set()); setTimeout(onDone, 1800); }
    else setResult(L("ההגשה לא עברה. ייתכן שהאודישן נסגר או שהשחקנים כבר הוגשו.", "Submission failed. The audition may be closed or the actors already submitted."));
  }

  if (actors.length === 0) {
    return <EmptyState icon={UserPlus} title={L("אין עדיין שחקנים מאושרים", "No approved actors yet")}
      description={L("אחרי ששחקן/ית מאשר/ת את הייצוג אפשר להגיש אותם לאודישנים.", "Once an actor approves, you can submit them.")} />;
  }

  return (
    <div className="space-y-4">
      {!target ? (
        <>
          <div className="rounded-2xl border border-border bg-bg-elevated p-3 space-y-2">
            <div className="text-sm font-semibold inline-flex items-center gap-1.5"><Link2 className="w-4 h-4" aria-hidden /> {L("קיבלתם קישור מהמלהק/ת?", "Got a link from casting?")}</div>
            <div className="flex gap-2">
              <input value={link} onChange={(e) => setLink(e.target.value)} dir="ltr" placeholder="castit.vercel.app/join/…"
                className="flex-1 h-11 px-3 rounded-xl bg-bg border border-border text-sm outline-none focus:border-gold/60" />
              <button onClick={openLink} className="h-11 px-4 rounded-xl border-2 border-border-strong text-sm font-semibold">{L("פתיחה", "Open")}</button>
            </div>
            {linkErr && <p role="alert" className="text-xs text-terra">{linkErr}</p>}
          </div>
          <div>
            <h2 className="font-display text-lg mb-2">{L("אודישנים פתוחים", "Open auditions")}</h2>
            {calls === null ? <Loader2 className="w-5 h-5 animate-spin text-text-muted" /> : calls.length === 0 ? (
              <p className="text-sm text-text-muted">{L("אין כרגע אודישנים פתוחים בלוח.", "No open auditions on the board right now.")}</p>
            ) : calls.map((c) => (
              <button key={c.code} onClick={() => setTarget({ code: c.code, title: `${c.data.project?.title ?? ""} · ${c.data.role.name}` })}
                className="w-full text-start p-3 mb-2 rounded-2xl bg-bg-elevated border border-border">
                <div className="text-[0.6875rem] text-text-muted truncate">{c.data.proName}{c.data.studio ? ` · ${c.data.studio}` : ""}</div>
                <div className="font-semibold truncate">{c.data.project?.title} · {c.data.role.name}</div>
                {c.data.deadline && <div className="text-[0.6875rem] text-gold inline-flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3" aria-hidden /> {L("דדליין", "Deadline")} {new Date(c.data.deadline).toLocaleDateString("he-IL")}</div>}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <div className="p-3 rounded-2xl bg-bg-elevated border border-border flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-[0.6875rem] text-text-muted">{L("מגישים ל:", "Submitting to:")}</div>
              <div className="font-semibold">{target.title}</div>
              {linked?.role.description && <p className="text-xs text-text-muted mt-1 line-clamp-3">{linked.role.description}</p>}
            </div>
            <button onClick={() => { setTarget(null); setLinked(null); setResult(""); }} aria-label={L("החלפת אודישן", "Change audition")}
              className="w-8 h-8 rounded-full border border-border grid place-items-center"><X className="w-4 h-4" /></button>
          </div>
          <div className="text-sm font-semibold">{L("את מי מגישים?", "Who are you submitting?")}</div>
          <div className="space-y-2">
            {actors.map((a) => {
              const on = pick.has(a.talent_id);
              return (
                <button key={a.talent_id} role="checkbox" aria-checked={on}
                  onClick={() => setPick((s) => { const n = new Set(s); if (n.has(a.talent_id)) n.delete(a.talent_id); else n.add(a.talent_id); return n; })}
                  className={cn("w-full flex items-center gap-3 p-2.5 rounded-2xl border text-start", on ? "border-gold bg-gold/10" : "border-border bg-bg-elevated")}>
                  <span className={cn("w-6 h-6 rounded-md border grid place-items-center shrink-0", on ? "bg-gold border-gold text-on-accent" : "border-border")}>{on && <Check className="w-4 h-4" />}</span>
                  <TalentPhoto src={a.photo_url} name={a.name ?? ""} className="w-9 h-9 rounded-lg shrink-0" />
                  <span className="flex-1 truncate text-sm font-medium">{a.name || a.username}</span>
                </button>
              );
            })}
          </div>
          {result && <p role="status" className="text-sm">{result}</p>}
          <button onClick={send} disabled={pick.size === 0 || sending}
            className="w-full h-12 rounded-2xl bg-gold text-on-accent font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" aria-hidden />}
            {pick.size ? (pick.size === 1 ? L("הגשת שחקן/ית אחד/ת", "Submit 1 actor") : L(`הגשת ${pick.size} שחקנים`, `Submit ${pick.size} actors`)) : L("בחרו שחקנים", "Choose actors")}
          </button>
        </div>
      )}
    </div>
  );
}

function TrackTab({ L }: { L: (h: string, e: string) => string }) {
  const subs = useAgencySubs();
  if (subs.length === 0) {
    return <EmptyState icon={Send} title={L("עוד לא הגשתם שחקנים", "Nothing submitted yet")}
      description={L("כאן תראו כל הגשה: האם נשלח טייפ, קולבק, הצעה או ליהוק.", "See every submission here: tape sent, callback, offer or booked.")} />;
  }
  return (
    <div className="space-y-2">
      {subs.map(({ submission: s, role, project }) => (
        <div key={s.id} className="flex items-center gap-3 p-3 rounded-2xl bg-bg-elevated border border-border">
          <TalentPhoto src={s.talentPhoto} name={s.talentName} className="w-10 h-10 rounded-xl shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{s.talentName}</div>
            <div className="text-[0.6875rem] text-text-muted truncate">{project?.title ?? ""} · {role?.name ?? ""}</div>
            <div className="text-[0.6875rem] text-text-muted">
              {s.tapes?.length ? L(`${s.tapes.length} טייפים נשלחו`, `${s.tapes.length} tapes sent`) : L("עוד לא נשלח טייפ", "No tape yet")}
              {s.callbackScheduledAt ? ` · ${L("קולבק", "Callback")} ${new Date(s.callbackScheduledAt).toLocaleString("he-IL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}
            </div>
          </div>
          <StageBadge stage={s.stage} />
        </div>
      ))}
    </div>
  );
}
