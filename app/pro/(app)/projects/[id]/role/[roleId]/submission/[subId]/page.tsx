"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, XCircle, PauseCircle, FileVideo, Calendar, ArrowRight,
  Repeat, CalendarCheck, FileSignature, PartyPopper, Undo2, Send, Clock,
  Wand2, Loader2, MapPin, Users, X as XIcon, Video as VideoIcon,
  CalendarPlus,
} from "lucide-react";
import { addToCalendar, absUrl } from "@/lib/ics";
import { Header } from "@/components/Header";
import { EmptyState } from "@/components/EmptyState";
import { StageBadge } from "@/components/StageBadge";
import { TalentNotes } from "@/components/TalentNotes";
import { TapeCommentsViewer } from "@/components/TapeCommentsViewer";
import {
  getSubmission, getRole, getProject, addTape,
  moveToCallback, moveToHold, moveToAvailCheck, sendOffer, confirmBooked,
  rejectSubmission, reopenSubmission, markCallbackDone, cancelCallback,
  type Submission, type Role, type Project, type Stage, type CallbackType,
} from "@/lib/projects-store";
import { notifyTalentStageChange } from "@/lib/notifications-store";
import { cn } from "@/lib/utils";
import { useT, useLangStore } from "@/lib/i18n";
import { DEMO_MODE } from "@/lib/cloud/config";
import { useAriaReady } from "@/lib/aria-ready";
import { TalentPhoto } from "@/components/TalentPhoto";

/** Hebrew or English, by the current app language. Components here re-render on a language change through useT() in the page. */
const tr = (he: string, en: string) => (useLangStore.getState().lang === "en" ? en : he);

type Action =
  | { kind: "callback";       label: string; tone: "success" }   // schedule callback (in-person OR tape)
  | { kind: "callback_done";  label: string; tone: "success" }   // confirm in-person callback happened
  | { kind: "cancel_callback"; label: string; tone: "muted" }     // scheduled callback won't happen
  | { kind: "hold";           label: string; tone: "sage" }
  | { kind: "extend_hold";    label: string; tone: "sage" }
  | { kind: "avail";          label: string; tone: "plum" }
  | { kind: "offer";          label: string; tone: "violet" }
  | { kind: "book";           label: string; tone: "success" }
  | { kind: "reject";         label: string; tone: "danger" }
  | { kind: "reopen";         label: string; tone: "muted" }
  | { kind: "request_tape";   label: string; tone: "gold" };

// The default note sent to the actor with each step. Editable before sending.
const TEMPLATES: Record<string, [string, string]> = {
  callback:     ["אהבנו את הטייפ! נשמח להזמין אותך לקולבק. הפרטים והסצנות החדשות בדרך.", "Loved your tape. We'd like to bring you back for a callback. New sides coming shortly."],
  hold:         ["עבודה חזקה. אנחנו משאירים את הטייפ שלך בבחירה הסופית ונחזור אליך בקרוב.", "Strong work. We're holding your tape as we narrow down and will be in touch soon."],
  avail:        ["אנחנו מתקדמים איתך. אפשר לאשר שיש לך זמינות בתאריכי הצילום?", "We're moving you forward. Can you confirm availability for the shoot dates?"],
  offer:        ["נשמח להציע לך את התפקיד. פרטי התשלום והתאריכים למטה, מחכים לאישור שלך.", "We'd like to offer you the role. Rate and dates are below. Please confirm."],
  book:         ["סגרנו! ההפקה תיצור איתך קשר עם החוזה וסדר היום.", "Booked! Production will reach out with paperwork and call sheets."],
  reject:       ["תודה רבה על ההגשה. הפעם החלטנו ללכת בכיוון אחר לתפקיד הזה.", "Thank you for submitting. We've gone in a different direction for this role."],
  request_tape: ["נשמח לטייפ קולבק עם הסצנות החדשות המצורפות.", "Please submit a callback self-tape with the attached new sides."],
};

export default function SubmissionPage() {
  const { id, roleId, subId } = useParams<{ id: string; roleId: string; subId: string }>();
  const router = useRouter();
  const { lang, dir } = useT();
  const [sub, setSub] = useState<Submission | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  const [message, setMessage] = useState("");
  const [shootDates, setShootDates] = useState("");
  const [payOffered, setPayOffered] = useState("");
  const [holdHours, setHoldHours] = useState(48);
  const [confirmed, setConfirmed] = useState(false);

  // Callback scheduling state (when pro clicks Schedule callback)
  const [callbackType, setCallbackType] = useState<CallbackType>("in_person");
  const [callbackDate, setCallbackDate] = useState("");
  const [callbackTime, setCallbackTime] = useState("");
  const [callbackLocation, setCallbackLocation] = useState("");
  const [callbackOutcome, setCallbackOutcome] = useState("");

  function reload() {
    setSub(getSubmission(subId) ?? null);
  }

  useEffect(() => {
    const s = getSubmission(subId);
    setSub(s ?? null);
    if (s) {
      const r = getRole(s.roleId);
      setRole(r ?? null);
      if (r) setProject(getProject(r.projectId) ?? null);
    }
  }, [subId]);

  if (!sub) {
    return (
      <div className="min-h-dvh bg-bg" dir={dir}>
        <Header back title={tr("הגשה", "Submission")} />
        <EmptyState icon={FileVideo} title={tr("ההגשה לא נמצאה", "Not found")} />
      </div>
    );
  }

  // Which actions are available given the current stage (+ project mode)
  const isQuick = project?.mode === "quick";
  const actions = getActions(sub, isQuick);

  function openAction(a: Action) {
    setAction(a);
    const tpl = TEMPLATES[a.kind];
    setMessage(tpl ? tr(tpl[0], tpl[1]) : "");
    setShootDates(role?.shootDates ?? sub?.shootDates ?? "");
    setPayOffered(role?.payRange ?? sub?.payOffered ?? "");
  }

  function commit() {
    if (!action) return;
    const msg = message.trim() || undefined;
    switch (action.kind) {
      case "callback": {
        // Build optional scheduling info
        const scheduledAt = callbackType === "in_person" && callbackDate
          ? new Date(`${callbackDate}T${callbackTime || "10:00"}`).toISOString()
          : undefined;
        moveToCallback(subId, {
          message: msg,
          type: callbackType,
          scheduledAt,
          location: callbackType === "in_person" ? (callbackLocation.trim() || undefined) : undefined,
        });
        break;
      }
      case "callback_done":   markCallbackDone(subId, callbackOutcome.trim() || msg); break;
      case "cancel_callback": cancelCallback(subId, msg); break;
      case "hold":         moveToHold(subId, msg, holdHours); break;
      case "extend_hold":  moveToHold(subId, msg, holdHours); break;
      case "avail":        moveToAvailCheck(subId, shootDates.trim() || undefined, msg); break;
      case "offer":        sendOffer(subId, payOffered.trim() || undefined, msg); break;
      case "book":         confirmBooked(subId, msg); break;
      case "reject":       rejectSubmission(subId, msg); break;
      case "reopen":       reopenSubmission(subId); break;
      case "request_tape": moveToCallback(subId, { message: msg, type: "tape" }); break;
    }

    // Fire a notification to the talent (and to the demo audience)
    const stageMap: Record<typeof action.kind, "callback" | "hold" | "avail_check" | "offered" | "booked" | "rejected" | undefined> = {
      callback:         "callback",
      callback_done:    undefined,  // no talent notification — internal pro step
      cancel_callback:  undefined,
      hold:             "hold",
      extend_hold:      "hold",
      avail:            "avail_check",
      offer:            "offered",
      book:             "booked",
      reject:           "rejected",
      reopen:           undefined,
      request_tape:     "callback",
    };
    const stage = stageMap[action.kind];
    if (stage && sub && role && project) {
      notifyTalentStageChange(stage, sub.talentName, project.title, role.name, sub.id);
    }

    reload();
    setConfirmed(true);
    setTimeout(() => { setConfirmed(false); setAction(null); }, 1400);
  }

  // Demo: pro can manually "simulate" a tape arrival for invited talents
  function simulateTape() {
    if (!sub) return;
    addTape(subId, {
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      note: tr(`סלף-טייפ, סבב ${sub.tapes.length + 1}`, `Self-tape, round ${sub.tapes.length + 1}`),
    });
    reload();
  }

  return (
    <div className="min-h-dvh bg-bg pb-44" dir={dir} lang={lang}>
      <Header back title={tr("הגשה", "Submission")} />

      <div className="px-5 pt-3 space-y-4">
        {/* Talent header */}
        <div className="flex items-center gap-3">
          <TalentPhoto src={sub.talentPhoto} name={sub.talentName} className="w-14 h-14 rounded-2xl" />
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl leading-tight truncate">{sub.talentName}</h1>
            <p className="text-[0.6875rem] text-text-muted truncate">{tr("לתפקיד:", "For:")} {role?.name}</p>
          </div>
          <StageBadge stage={sub.stage} size="md" />
        </div>

        {/* Latest tape (or invited placeholder) */}
        {sub.tapes.length > 0 ? (
          <TapeCommentsViewer
            submissionId={sub.id}
            tape={sub.tapes[sub.tapes.length - 1]}
            onChange={reload}
          />
        ) : (
          <InvitedCard sub={sub} role={role} onSimulate={DEMO_MODE ? simulateTape : undefined} />
        )}

        {/* Tape history (round 2, 3...) */}
        {sub.tapes.length > 1 && (
          <details className="rounded-2xl bg-bg-elevated border border-border p-3">
            <summary className="text-[0.6875rem] uppercase tracking-widest text-gold cursor-pointer">
              {tr("סבבים קודמים", "Earlier rounds")} ({sub.tapes.length - 1})
            </summary>
            <div className="mt-3 space-y-2">
              {sub.tapes.slice(0, -1).reverse().map((t) => (
                <div key={t.round} className="rounded-xl bg-bg border border-border p-3">
                  <div className="flex items-center gap-2 text-[0.6875rem] text-text-muted">
                    <FileVideo className="w-3 h-3" aria-hidden /> {tr("סבב", "Round")} {t.round} · {fmtDate(t.submittedAt)}
                  </div>
                  {t.note && <p className="text-xs mt-1">{t.note}</p>}
                </div>
              ))}
            </div>
          </details>
        )}

        {/* Active hold countdown (1st refusal) */}
        {sub.stage === "hold" && sub.holdUntil && <HoldCountdown until={sub.holdUntil} />}

        {/* Callback status banner — visible when a callback is scheduled or completed */}
        {sub.stage === "callback" && sub.callbackType && (
          <CallbackStatusBanner sub={sub} />
        )}

        {/* Availability status banner — two-sided avail-check response */}
        {sub.stage === "avail_check" && (
          <AvailStatusBanner sub={sub} />
        )}

        {/* Offer status banner — two-sided offer response */}
        {sub.stage === "offered" && (
          <OfferStatusBanner sub={sub} />
        )}

        {/* Optional private notes & tags */}
        <TalentNotes talentId={sub.talentId} talentName={sub.talentName} />

        {/* Most recent pro → talent message */}
        {sub.proMessage && sub.stage !== "invited" && (
          <div className="rounded-2xl bg-gold/8 border border-gold/20 p-4">
            <div className="text-[0.6875rem] uppercase tracking-widest text-gold mb-1 flex items-center gap-1.5">
              <Send className="w-3 h-3" aria-hidden /> {tr("ההודעה האחרונה ל", "Last message to ")}{sub.talentName.split(" ")[0]}
            </div>
            <p className="text-xs leading-relaxed" dir="auto">{sub.proMessage}</p>
            {sub.shootDates && <p className="text-[0.6875rem] text-text-muted mt-2">{tr("צילומים:", "Shoot:")} {sub.shootDates}</p>}
            {sub.payOffered && <p className="text-[0.6875rem] text-text-muted">{tr("הצעה:", "Offer:")} {sub.payOffered}</p>}
          </div>
        )}
      </div>

      {/* Action bar — pinned just above BottomNav */}
      {actions.length > 0 && (
        <div className="fixed bottom-[72px] inset-x-0 max-w-[440px] mx-auto p-3 glass border-t border-border z-40">
          <div className="grid grid-cols-2 gap-2">
            {actions.map((a) => (
              <button
                key={a.kind}
                onClick={() => openAction(a)}
                className={cn(
                  "h-12 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform",
                  toneClasses(a.tone),
                )}
              >
                {iconFor(a.kind)}
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action sheet */}
      <AnimatePresence>
        {action && !confirmed && (
          <div className="fixed inset-0 z-50 grid place-items-end max-w-[440px] mx-auto" dir={dir}>
            <div className="absolute inset-0 bg-black/60" onClick={() => setAction(null)} />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              role="dialog" aria-modal="true" aria-labelledby="action-title"
              className="relative w-full bg-bg-elevated border-t border-border rounded-t-3xl p-5 max-h-[80dvh] overflow-y-auto"
            >
              <div className="w-12 h-1 rounded-full bg-border mx-auto mb-4" />
              <h2 id="action-title" className="font-display text-2xl mb-1">{actionTitle(action.kind, sub.talentName)}</h2>
              <p className="text-sm text-text-muted mb-4">{actionSubtitle(action.kind)}</p>

              {action.kind === "callback" && (
                <>
                  <Field label={tr("סוג הקולבק", "Callback type")}>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setCallbackType("in_person")}
                        className={cn(
                          "p-3 rounded-2xl border text-start transition",
                          callbackType === "in_person"
                            ? "bg-gold/10 border-gold"
                            : "bg-bg border-border"
                        )}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Users className="w-3.5 h-3.5 text-gold" />
                          <span className="text-xs font-semibold">{tr("פגישה", "In person")}</span>
                        </div>
                        <p className="text-[0.6875rem] text-text-muted leading-snug">
                          {tr("בסטודיו או בחדר הליהוק", "At the studio or casting room")}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCallbackType("tape")}
                        className={cn(
                          "p-3 rounded-2xl border text-start transition",
                          callbackType === "tape"
                            ? "bg-gold/10 border-gold"
                            : "bg-bg border-border"
                        )}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <VideoIcon className="w-3.5 h-3.5 text-gold" />
                          <span className="text-xs font-semibold">{tr("טייפ נוסף", "Another self-tape")}</span>
                        </div>
                        <p className="text-[0.6875rem] text-text-muted leading-snug">
                          {tr("סבב הקלטה נוסף עם סצנות חדשות", "Another round with new sides")}
                        </p>
                      </button>
                    </div>
                  </Field>
                  {callbackType === "in_person" && (
                    <>
                      <div className="grid grid-cols-2 gap-2.5">
                        <Field label={tr("תאריך", "Date")}>
                          <input
                            type="date"
                            value={callbackDate}
                            onChange={(e) => setCallbackDate(e.target.value)}
                            className="w-full h-11 px-3 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60"
                          />
                        </Field>
                        <Field label={tr("שעה", "Time")}>
                          <input
                            type="time"
                            value={callbackTime}
                            onChange={(e) => setCallbackTime(e.target.value)}
                            className="w-full h-11 px-3 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60"
                          />
                        </Field>
                      </div>
                      <Field label={tr("מיקום", "Location")}>
                        <input
                          value={callbackLocation}
                          onChange={(e) => setCallbackLocation(e.target.value)}
                          placeholder={tr("למשל: אולפני הרצליה", "e.g. Studio name, city")} dir="auto"
                          className="w-full h-11 px-3 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60"
                        />
                      </Field>
                    </>
                  )}
                </>
              )}

              {action.kind === "callback_done" && (
                <Field label={tr("הערה אחרי הפגישה (לא חובה)", "Note after the meeting (optional)")}>
                  <textarea
                    value={callbackOutcome}
                    onChange={(e) => setCallbackOutcome(e.target.value)}
                    rows={3}
                    placeholder={tr("איך עבר? מה השתפר? מה הותיר ספק?", "How did it go? What improved? Any doubts?")} dir="auto"
                    className="w-full px-3 py-2.5 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60"
                  />
                </Field>
              )}

              {(action.kind === "hold" || action.kind === "extend_hold") && (
                <Field label={tr("כמה זמן להחזיק (זכות ראשונים)", "Hold duration (1st refusal)")}>
                  <div className="flex gap-1.5 flex-wrap">
                    {[24, 48, 72, 168].map((h) => (
                      <button
                        key={h}
                        onClick={() => setHoldHours(h)}
                        className={cn(
                          "h-9 px-3 rounded-full text-xs font-semibold border",
                          holdHours === h ? "bg-gold text-on-accent border-gold" : "bg-bg text-text border-border"
                        )}
                      >
                        {h === 168 ? tr("שבוע", "1 week") : tr(`${h} שעות`, `${h}h`)}
                      </button>
                    ))}
                    <button
                      onClick={() => setHoldHours(0)}
                      className={cn(
                        "h-9 px-3 rounded-full text-xs font-semibold border",
                        holdHours === 0 ? "bg-gold text-on-accent border-gold" : "bg-bg text-text border-border"
                      )}
                    >
                      {tr("בלי טיימר", "No timer")}
                    </button>
                  </div>
                  <p className="text-[0.6875rem] text-text-muted mt-1.5">
                    {tr("השחקן/ית מתבקש/ת להישאר זמין/ה בזמן הזה, ורואה ספירה לאחור אצלו/ה.", "The talent is asked to stay available for this window. They see a countdown on their end.")}
                  </p>
                </Field>
              )}

              {action.kind === "avail" && (
                <Field label={tr("תאריכי צילום", "Shoot dates")}>
                  <input
                    value={shootDates} onChange={(e) => setShootDates(e.target.value)}
                    placeholder={tr("12.8 עד 25.9", "Aug 12 to Sep 25")} dir="auto"
                    className="w-full h-11 px-3 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60"
                  />
                </Field>
              )}
              {action.kind === "offer" && (
                <>
                  <Field label={tr("תשלום", "Pay / Rate")}>
                    <input
                      value={payOffered} onChange={(e) => setPayOffered(e.target.value)}
                      placeholder={tr("למשל 2,000 ₪ ליום צילום", "e.g. $2,000/day + travel")} dir="auto"
                      className="w-full h-11 px-3 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60"
                    />
                  </Field>
                  <Field label={tr("תאריכי צילום", "Shoot dates")}>
                    <input
                      value={shootDates} onChange={(e) => setShootDates(e.target.value)}
                      placeholder={tr("12.8 עד 25.9", "Aug 12 to Sep 25")} dir="auto"
                      className="w-full h-11 px-3 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60"
                    />
                  </Field>
                </>
              )}

              <Field label={tr(`הודעה ל${sub.talentName.split(" ")[0]}`, `Message to ${sub.talentName.split(" ")[0]}`)}>
                <textarea
                  value={message} onChange={(e) => setMessage(e.target.value)} rows={4} dir="auto"
                  className="w-full px-3 py-2.5 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60"
                />
                <AriaDraftButton
                  intent={actionToIntent(action.kind)}
                  talentName={sub.talentName}
                  roleName={role?.name ?? tr("התפקיד", "the role")}
                  projectTitle={project?.title ?? tr("הפרויקט", "the project")}
                  shootDates={shootDates}
                  payOffered={payOffered}
                  holdHours={holdHours}
                  onDraft={(t) => setMessage(t)}
                />
              </Field>

              <div className="grid grid-cols-2 gap-2 mt-4">
                <button onClick={() => setAction(null)} className="h-12 rounded-2xl border border-border bg-bg text-sm font-semibold">
                  {tr("ביטול", "Cancel")}
                </button>
                <button
                  onClick={commit}
                  className={cn("h-12 rounded-2xl font-semibold flex items-center justify-center gap-2", toneClasses(action.tone))}
                >
                  {confirmLabel(action.kind)} <ArrowRight className="w-4 h-4 rtl:rotate-180" aria-hidden />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation toast */}
      <AnimatePresence>
        {confirmed && action && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center pointer-events-none"
          >
            <div className={cn("px-5 py-4 rounded-2xl flex items-center gap-3 shadow-2xl", toneClasses(action.tone))}>
              {iconFor(action.kind)}
              <div>
                <div className="font-semibold text-sm">{confirmToast(action.kind)}</div>
                <div className="text-[0.6875rem] opacity-80">{tr(`${sub.talentName} יקבל/תקבל עדכון`, `${sub.talentName} will be notified`)}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


function HoldCountdown({ until }: { until: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(i);
  }, []);
  const ms = +new Date(until) - now;
  const expired = ms <= 0;
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  return (
    <div className={cn(
      "rounded-2xl border p-3 flex items-center gap-3",
      expired ? "bg-bg-elevated border-border" : "bg-sage/10 border-sage/30"
    )}>
      <div className={cn("w-8 h-8 rounded-lg grid place-items-center shrink-0", expired ? "bg-bg text-text-muted" : "bg-sage/20 text-sage")}>
        <PauseCircle className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className={cn("text-sm font-semibold", expired && "text-gold")}>
          {expired ? tr("זמן ההחזקה נגמר. צריך להחליט", "Hold expired. Decide now") : tr("בהחזקה (זכות ראשונים)", "Held (1st refusal)")}
        </div>
        <div className="text-[0.6875rem] text-text-muted">
          {expired
            ? tr("אפשר להאריך, להתקדם, או לשחרר.", "Extend the timer, move forward, or release the talent.")
            : <>{tr("משתחרר בעוד", "Releases in")} <span className="font-semibold tnum">{tr(`${hours > 0 ? `${hours} ש׳ ` : ""}${mins} ד׳`, `${hours > 0 ? `${hours}h ` : ""}${mins}m`)}</span></>}
        </div>
      </div>
    </div>
  );
}

function InvitedCard({ sub, role, onSimulate }: { sub: Submission; role: Role | null; onSimulate?: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-bg-elevated p-5 text-center">
      <div className="w-12 h-12 rounded-2xl bg-plum/20 grid place-items-center mx-auto mb-3">
        <Clock className="w-6 h-6 text-plum-light" />
      </div>
      <h3 className="font-display text-lg">{tr("מחכים לטייפ", "Waiting for self-tape")}</h3>
      <p className="text-xs text-text-muted mt-1 max-w-[280px] mx-auto">
        {tr("הוזמן/ה ב-", "Invited ")}{fmtDate(sub.createdAt)}.
        {role?.deadline && <> {tr("הגשה עד", "Tape due")} <span className="text-gold font-semibold">{fmtDate(role.deadline)}</span>.</>}
      </p>
      {sub.inviteMessage && (
        <div className="text-start mt-4 rounded-xl bg-bg/50 border border-border p-3">
          <div className="text-[0.6875rem] uppercase tracking-widest text-gold mb-1">{tr("הודעת ההזמנה", "Invite message")}</div>
          <p className="text-xs leading-relaxed" dir="auto">{sub.inviteMessage}</p>
        </div>
      )}
      {onSimulate && (
        <button
          onClick={onSimulate}
          className="mt-4 inline-flex items-center gap-2 px-4 h-10 rounded-full border border-border text-xs text-text-muted"
        >
          <FileVideo className="w-3 h-3" aria-hidden /> {tr("הדמיית טייפ (מצב הדגמה)", "Simulate tape arrival (demo)")}
        </button>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="text-[0.6875rem] uppercase tracking-widest text-text-muted mb-1">{label}</div>
      {children}
    </div>
  );
}

// ---- Stage-driven action menus ----
// Now sub-aware so the "callback" stage shows different actions depending on
// whether the callback session has already happened.
function getActions(sub: Submission, isQuick = false): Action[] {
  // ── Quick Cast: 3-stage flow, one-tap decisions only ──
  if (isQuick) {
    switch (sub.stage) {
      case "invited":
        return [{ kind: "reject", label: tr("ביטול ההזמנה", "Withdraw invite"), tone: "danger" }];
      case "submitted":
        return [
          { kind: "book",   label: tr("בחירה", "Select"), tone: "success" },
          { kind: "reject", label: tr("לא מתאים", "Pass"),   tone: "danger" },
        ];
      case "booked":
      case "rejected":
        return [{ kind: "reopen", label: tr("פתיחה מחדש", "Reopen"), tone: "muted" }];
      default:
        // Any legacy stage in a quick project — collapse to select/pass
        return [
          { kind: "book",   label: tr("בחירה", "Select"), tone: "success" },
          { kind: "reject", label: tr("לא מתאים", "Pass"),   tone: "danger" },
        ];
    }
  }

  // ── Full Casting: 8-stage pipeline ──
  switch (sub.stage) {
    case "invited":
      return [
        { kind: "reject", label: tr("ביטול ההזמנה", "Withdraw invite"), tone: "danger" },
      ];
    case "submitted":
      return [
        { kind: "callback", label: tr("קביעת קולבק", "Schedule callback"), tone: "success" },
        { kind: "hold",     label: tr("החזקה (זכות ראשונים)", "Hold (1st refusal)"), tone: "sage" },
        { kind: "offer",    label: tr("שליחת הצעה (בלי קולבק)", "Send offer (skip callback)"), tone: "violet" },
        { kind: "reject",   label: tr("לא מתאים", "Pass"),      tone: "danger" },
      ];
    case "callback": {
      // In-person callback NOT yet confirmed → can only mark done, cancel, or pass.
      // No skipping straight to book/offer/avail_check.
      const inPersonPending = sub.callbackType === "in_person" && !sub.callbackCompleted;
      if (inPersonPending) {
        return [
          { kind: "callback_done",   label: tr("הקולבק התקיים, ממשיכים", "Callback done — proceed"), tone: "success" },
          { kind: "cancel_callback", label: tr("ביטול הקולבק", "Cancel callback"),         tone: "muted" },
          { kind: "reject",          label: tr("לא מתאים", "Pass"),                    tone: "danger" },
        ];
      }
      // Tape callback still waiting for a new tape → only cancel or pass
      if (sub.callbackType === "tape" && !sub.callbackCompleted) {
        return [
          { kind: "cancel_callback", label: tr("ביטול טייפ הקולבק", "Cancel callback tape"), tone: "muted" },
          { kind: "reject",          label: tr("לא מתאים", "Pass"),                 tone: "danger" },
        ];
      }
      // Callback completed (tape arrived or session done) → full next options
      return [
        { kind: "hold",         label: tr("החזקה (זכות ראשונים)", "Hold (1st refusal)"),    tone: "sage" },
        { kind: "avail",        label: tr("בדיקת זמינות", "Avail check"),           tone: "plum" },
        { kind: "request_tape", label: tr("עוד טייפ קולבק", "Another callback tape"), tone: "gold" },
        { kind: "reject",       label: tr("לא מתאים", "Pass"),                  tone: "danger" },
      ];
    }
    case "hold": {
      const expired = !!sub.holdUntil && +new Date(sub.holdUntil) <= Date.now();
      return [
        { kind: "avail",       label: tr("בדיקת זמינות", "Avail check"),  tone: "plum" },
        { kind: "extend_hold", label: expired ? tr("הארכת ההחזקה", "Extend hold") : tr("הארכת הטיימר", "Extend timer"), tone: "sage" },
        { kind: "callback",    label: tr("החזרה לקולבק", "Bring back"),   tone: "success" },
        { kind: "reject",      label: expired ? tr("שחרור", "Release") : tr("לא מתאים", "Pass"), tone: "danger" },
      ];
    }
    case "avail_check":
      // Two-sided: pro can only send an offer once the talent confirms availability.
      if (sub.availResponse === "available") {
        return [
          { kind: "offer",  label: tr("שליחת הצעה", "Send offer"), tone: "violet" },
          { kind: "reject", label: tr("לא מתאים", "Pass"),       tone: "danger" },
        ];
      }
      // Pending or unavailable — can't offer yet
      return [
        { kind: "reject", label: tr("לא מתאים", "Pass"), tone: "danger" },
      ];
    case "offered":
      // Two-sided offer: pro can only confirm booking once the talent accepts.
      if (sub.offerResponse === "accepted") {
        return [
          { kind: "book",   label: tr("אישור ליהוק", "Confirm booked"), tone: "success" },
          { kind: "reject", label: tr("ביטול ההצעה", "Rescind offer"),  tone: "danger" },
        ];
      }
      // Pending — waiting for the talent to respond
      return [
        { kind: "reject", label: tr("ביטול ההצעה", "Rescind offer"), tone: "danger" },
      ];
    case "booked":
      return [
        { kind: "reopen", label: tr("פתיחה מחדש", "Reopen"), tone: "muted" },
      ];
    case "rejected":
      return [
        { kind: "reopen", label: tr("פתיחה מחדש", "Reopen"), tone: "muted" },
      ];
    default:
      return [];
  }
}

function actionTitle(kind: Action["kind"], name: string) {
  const first = name.split(" ")[0];
  switch (kind) {
    case "callback":         return tr(`לקבוע קולבק ל${first}?`, `Schedule callback for ${first}?`);
    case "callback_done":    return tr(`הקולבק עם ${first} התקיים?`, `Callback with ${first} happened?`);
    case "cancel_callback":  return tr(`לבטל את הקולבק עם ${first}?`, `Cancel callback with ${first}?`);
    case "hold":             return tr(`להחזיק את ${first}?`, `Hold ${first}?`);
    case "extend_hold":      return tr(`להאריך את ההחזקה של ${first}?`, `Extend hold on ${first}?`);
    case "avail":            return tr(`לבדוק זמינות עם ${first}?`, `Check availability with ${first}?`);
    case "offer":            return tr(`לשלוח הצעה ל${first}?`, `Send offer to ${first}?`);
    case "book":             return tr(`לאשר את ${first} לתפקיד?`, `Confirm ${first} as booked?`);
    case "reject":           return tr(`לוותר על ${first}?`, `Pass on ${first}?`);
    case "reopen":           return tr("לפתוח מחדש את ההגשה?", "Reopen this submission?");
    case "request_tape":     return tr(`לבקש טייפ קולבק מ${first}?`, `Request callback tape from ${first}?`);
  }
}
function actionSubtitle(kind: Action["kind"]) {
  switch (kind) {
    case "callback":         return tr("פגישה או טייפ נוסף. אפשר להתקדם רק אחרי שהקולבק הושלם.", "In person or another tape. You can move on once the callback is done.");
    case "callback_done":    return tr("מסמנים שהפגישה התקיימה, ואז נפתחות החזקה, בדיקת זמינות והצעה.", "Mark the meeting as done to unlock hold, availability and offer.");
    case "cancel_callback":  return tr("הקולבק לא יתקיים, וההגשה תחזור לסטטוס \"הוגש\".", "The callback won't happen. The submission goes back to Submitted.");
    case "hold":             return tr("שומרים אותם בתמונה בלי להחליט עדיין.", "Keep them warm. They stay in your pool without a decision yet.");
    case "extend_hold":      return tr("מאפסים את טיימר זכות הראשונים כדי להמשיך להחזיק.", "Reset the first-refusal timer to keep holding this talent.");
    case "avail":            return tr("מוודאים זמינות בתאריכי הצילום לפני הצעה רשמית.", "Confirm shoot dates before sending a formal offer.");
    case "offer":            return tr("הצעה רשמית עם תשלום ותאריכים. הליהוק נסגר כשהשחקן/ית מאשר/ת.", "Make a formal offer with rate and dates. Talent confirms to book.");
    case "book":             return tr("סוגרים את הליהוק.", "Lock the booking.");
    case "reject":           return tr("תישלח הודעה מנומסת שהפעם לא.", "They'll get a polite note that you've moved on.");
    case "reopen":           return tr("ההגשה חוזרת לבדיקה.", "Bring this submission back to active review.");
    case "request_tape":     return tr("שולחים סצנות חדשות, והשחקן/ית מגיש/ה טייפ קולבק.", "Send the new sides and they'll submit a callback tape.");
  }
}
function confirmLabel(kind: Action["kind"]) {
  switch (kind) {
    case "callback":         return tr("קביעה", "Schedule");
    case "callback_done":    return tr("סימון שהתקיים", "Mark done");
    case "cancel_callback":  return tr("ביטול הקולבק", "Cancel callback");
    case "hold":             return tr("העברה להחזקה", "Move to hold");
    case "extend_hold":      return tr("הארכה", "Extend hold");
    case "avail":            return tr("שליחת בדיקה", "Send check");
    case "offer":            return tr("שליחת ההצעה", "Send offer");
    case "book":             return tr("אישור", "Confirm");
    case "reject":           return tr("שליחה", "Send & pass");
    case "reopen":           return tr("פתיחה מחדש", "Reopen");
    case "request_tape":     return tr("בקשת טייפ", "Request tape");
  }
}
function confirmToast(kind: Action["kind"]) {
  switch (kind) {
    case "callback":         return tr("הקולבק נקבע", "Callback scheduled");
    case "callback_done":    return tr("סומן שהקולבק התקיים", "Callback marked done");
    case "cancel_callback":  return tr("הקולבק בוטל", "Callback cancelled");
    case "hold":             return tr("הועבר להחזקה", "Moved to hold");
    case "extend_hold":      return tr("ההחזקה הוארכה", "Hold extended");
    case "avail":            return tr("בדיקת הזמינות נשלחה", "Avail check sent");
    case "offer":            return tr("ההצעה נשלחה", "Offer sent");
    case "book":             return tr("נסגר!", "Booked");
    case "reject":           return tr("נשלחה תשובה", "Passed");
    case "reopen":           return tr("נפתח מחדש", "Reopened");
    case "request_tape":     return tr("נשלחה בקשה לטייפ", "Callback tape requested");
  }
}
function iconFor(kind: Action["kind"]) {
  switch (kind) {
    case "callback":         return <Users className="w-4 h-4" />;
    case "callback_done":    return <CheckCircle2 className="w-4 h-4" />;
    case "cancel_callback":  return <Undo2 className="w-4 h-4" />;
    case "hold":             return <PauseCircle className="w-4 h-4" />;
    case "extend_hold":      return <PauseCircle className="w-4 h-4" />;
    case "avail":            return <CalendarCheck className="w-4 h-4" />;
    case "offer":            return <FileSignature className="w-4 h-4" />;
    case "book":             return <PartyPopper className="w-4 h-4" />;
    case "reject":           return <XCircle className="w-4 h-4" />;
    case "reopen":           return <Undo2 className="w-4 h-4" />;
    case "request_tape":     return <Repeat className="w-4 h-4" />;
  }
}
function toneClasses(tone: Action["tone"]) {
  switch (tone) {
    case "success": return "bg-success text-on-accent";
    case "danger":  return "bg-danger text-white";
    case "sage":    return "bg-sage/80 text-on-accent";
    case "plum":    return "bg-plum text-text";
    case "violet":  return "bg-violet text-white";
    case "gold":    return "bg-gold text-on-accent";
    case "muted":   return "bg-bg-elevated border border-border text-text";
  }
}

function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    if (isNaN(+d)) return iso;
    return d.toLocaleDateString(tr("he-IL", "en-US"), { month: "short", day: "numeric", year: "numeric" });
  } catch { return iso; }
}

// ─── Availability status banner (two-sided) ─────────────
function AvailStatusBanner({ sub }: { sub: Submission }) {
  const first = sub.talentName.split(" ")[0];
  if (sub.availResponse === "available") {
    return (
      <div className="rounded-2xl bg-success/10 border border-success/30 p-4">
        <div className="flex items-center gap-2 mb-1.5">
          <CheckCircle2 className="w-4 h-4 text-success" />
          <div className="text-[0.6875rem] uppercase tracking-widest text-success font-semibold">{tr("זמין/ה", "Available")}</div>
        </div>
        <p className="text-xs text-text leading-relaxed">
          {tr(`${first} אישר/ה זמינות${sub.shootDates ? ` ל-${sub.shootDates}` : ""}. אפשר לשלוח הצעה.`, `${first} confirmed availability${sub.shootDates ? ` for ${sub.shootDates}` : ""}. You can send the offer.`)}
        </p>
      </div>
    );
  }
  if (sub.availResponse === "unavailable") {
    return (
      <div className="rounded-2xl bg-danger/10 border border-danger/30 p-4">
        <div className="flex items-center gap-2 mb-1.5">
          <XCircle className="w-4 h-4 text-danger" />
          <div className="text-[0.6875rem] uppercase tracking-widest text-danger font-semibold">{tr("לא זמין/ה", "Not available")}</div>
        </div>
        <p className="text-xs text-text-muted leading-relaxed">
          {tr(`${first} לא פנוי/ה${sub.shootDates ? ` ב-${sub.shootDates}` : ""}. אפשר לוותר או לשנות תאריכים.`, `${first} isn't free${sub.shootDates ? ` for ${sub.shootDates}` : ""}. Consider passing or adjusting dates.`)}
        </p>
      </div>
    );
  }
  // Pending
  return (
    <div className="rounded-2xl bg-plum/10 border border-plum/30 p-4">
      <div className="flex items-center gap-2 mb-1.5">
        <Clock className="w-4 h-4 text-plum-light" />
        <div className="text-[0.6875rem] uppercase tracking-widest text-plum-light font-semibold">
          {tr("בדיקת זמינות נשלחה", "Availability check sent")}
        </div>
      </div>
      <p className="text-xs text-text-muted leading-relaxed">
        {tr(`מחכים ש${first} יאשר/תאשר זמינות${sub.shootDates ? ` ל-${sub.shootDates}` : ""}. אחרי האישור אפשר לשלוח הצעה.`, `Waiting for ${first} to confirm availability${sub.shootDates ? ` for ${sub.shootDates}` : ""}. You'll be able to send the offer once they confirm.`)}
      </p>
    </div>
  );
}

// ─── Offer status banner (two-sided) ───────────────────
function OfferStatusBanner({ sub }: { sub: Submission }) {
  const first = sub.talentName.split(" ")[0];
  if (sub.offerResponse === "accepted") {
    return (
      <div className="rounded-2xl bg-success/10 border border-success/30 p-4">
        <div className="flex items-center gap-2 mb-1.5">
          <CheckCircle2 className="w-4 h-4 text-success" />
          <div className="text-[0.6875rem] uppercase tracking-widest text-success font-semibold">
            {tr("ההצעה התקבלה", "Offer accepted")}
          </div>
        </div>
        <p className="text-xs text-text leading-relaxed">
          {tr(`${first} קיבל/ה את ההצעה${sub.payOffered ? ` (${sub.payOffered})` : ""}. נשאר לאשר את הליהוק.`, `${first} accepted the offer${sub.payOffered ? ` (${sub.payOffered})` : ""}. Confirm the booking to lock it in.`)}
        </p>
      </div>
    );
  }
  // Pending
  return (
    <div className="rounded-2xl bg-violet/10 border border-violet/30 p-4">
      <div className="flex items-center gap-2 mb-1.5">
        <Clock className="w-4 h-4 text-violet" />
        <div className="text-[0.6875rem] uppercase tracking-widest text-violet font-semibold">
          {tr("ההצעה נשלחה, מחכים לתשובה", "Offer sent, awaiting response")}
        </div>
      </div>
      <p className="text-xs text-text-muted leading-relaxed">
        {tr(`מחכים לתשובה של ${first}${sub.payOffered ? ` · ${sub.payOffered}` : ""}. אחרי שההצעה תתקבל אפשר לאשר את הליהוק.`, `Waiting for ${first} to accept or decline${sub.payOffered ? ` · ${sub.payOffered}` : ""}. You'll be able to confirm the booking once they accept.`)}
      </p>
    </div>
  );
}

// ─── Callback status banner ────────────────────────────
function CallbackStatusBanner({ sub }: { sub: Submission }) {
  // Done → green confirmation
  if (sub.callbackCompleted) {
    return (
      <div className="rounded-2xl bg-success/10 border border-success/30 p-4">
        <div className="flex items-center gap-2 mb-1.5">
          <CheckCircle2 className="w-4 h-4 text-success" />
          <div className="text-[0.6875rem] uppercase tracking-widest text-success font-semibold">
            {tr("הקולבק הושלם", "Callback completed")}
          </div>
        </div>
        <p className="text-xs text-text leading-relaxed">
          {sub.callbackType === "in_person"
            ? tr("הפגישה התקיימה. אפשר להמשיך להחזקה, בדיקת זמינות או הצעה.", "The meeting happened. You can move to hold, availability or offer.")
            : tr("טייפ הקולבק התקבל. אפשר להמשיך להחזקה, בדיקת זמינות או הצעה.", "The callback tape arrived. You can move to hold, availability or offer.")}
        </p>
        {sub.callbackOutcome && (
          <div className="mt-2 pt-2 border-t border-success/20 text-[0.6875rem] text-text-muted leading-relaxed">
            <span className="text-success font-semibold">{tr("הערה: ", "Note: ")}</span>{sub.callbackOutcome}
          </div>
        )}
      </div>
    );
  }

  // Tape callback waiting for talent
  if (sub.callbackType === "tape") {
    return (
      <div className="rounded-2xl bg-gold/8 border border-gold/30 p-4">
        <div className="flex items-center gap-2 mb-1.5">
          <VideoIcon className="w-4 h-4 text-gold" />
          <div className="text-[0.6875rem] uppercase tracking-widest text-gold font-semibold">
            {tr(`מחכים לטייפ של ${sub.talentName.split(" ")[0]}`, `Waiting for ${sub.talentName.split(" ")[0]}'s tape`)}
          </div>
        </div>
        <p className="text-xs text-text-muted leading-relaxed">
          {tr("ביקשת סצנות נוספות. ההגשה תופיע כאן כשהטייפ יגיע.", "You asked for new sides. It shows up here when the tape arrives.")}
        </p>
      </div>
    );
  }

  // In-person, scheduled but not yet done
  const sched = sub.callbackScheduledAt ? new Date(sub.callbackScheduledAt) : null;
  const isPast = sched && sched.getTime() < Date.now();
  return (
    <div className="rounded-2xl bg-plum/10 border border-plum/30 p-4">
      <div className="flex items-center gap-2 mb-1.5">
        <Users className="w-4 h-4 text-plum-light" />
        <div className="text-[0.6875rem] uppercase tracking-widest text-plum-light font-semibold">
          {isPast ? tr("הקולבק היה אמור להתקיים", "The callback should have happened") : tr("קולבק בפגישה נקבע", "In-person callback scheduled")}
        </div>
      </div>
      {sched ? (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs">
            <Calendar className="w-3.5 h-3.5 text-text-muted" />
            <span className="font-semibold">
              {sched.toLocaleDateString(tr("he-IL", "en-US"), { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </span>
            <span className="text-text-muted">
              {sched.toLocaleTimeString(tr("he-IL", "en-US"), { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          {sub.callbackLocation && (
            <div className="flex items-center gap-2 text-xs">
              <MapPin className="w-3.5 h-3.5 text-text-muted" />
              <span>{sub.callbackLocation}</span>
            </div>
          )}
          {!isPast && (
            <button
              onClick={() => addToCalendar([{ uid: `cb_${sub.id}`, title: tr(`קולבק: ${sub.talentName}`, `Callback: ${sub.talentName}`), start: sub.callbackScheduledAt!, location: sub.callbackLocation, url: absUrl(location.pathname) }], `קולבק ${sub.talentName}`)}
              className="mt-1 h-9 px-3 rounded-full border border-border text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <CalendarPlus className="w-3.5 h-3.5" aria-hidden /> {tr("הוספה ליומן של הטלפון", "Add to phone calendar")}
            </button>
          )}
        </div>
      ) : (
        <p className="text-xs text-text-muted">{tr("לא נקבע תאריך. אפשר לקבוע פגישה ולהתקדם.", "No date set. Schedule the meeting and move on.")}</p>
      )}
      <p className="text-[0.6875rem] text-gold mt-3 leading-relaxed">
        {tr("אפשר להתקדם להחזקה, בדיקת זמינות או הצעה רק אחרי שמסמנים שהפגישה התקיימה.", "You can move to hold, availability or offer once the meeting is marked as done.")}
      </p>
    </div>
  );
}

// ─── Comm Automation ────────────────────────────────────
type DraftIntent =
  | "callback" | "hold" | "avail_check" | "offered"
  | "rejected" | "request_tape" | "invite" | "follow_up";

function actionToIntent(kind: Action["kind"]): DraftIntent {
  switch (kind) {
    case "callback":     return "callback";
    case "hold":         return "hold";
    case "avail":        return "avail_check";
    case "offer":        return "offered";
    case "book":         return "offered";
    case "reject":       return "rejected";
    case "request_tape": return "request_tape";
    case "reopen":       return "follow_up";
    default:             return "follow_up";
  }
}

function AriaDraftButton({
  intent, talentName, roleName, projectTitle, shootDates, payOffered, holdHours, onDraft,
}: {
  intent: DraftIntent;
  talentName: string;
  roleName: string;
  projectTitle: string;
  shootDates?: string;
  payOffered?: string;
  holdHours?: number;
  onDraft: (text: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [tone, setTone] = useState<"warm" | "professional" | "brief" | "enthusiastic">("professional");
  const ready = useAriaReady();

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch("/api/aria/draft-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent,
          talentName,
          roleName,
          projectTitle,
          tone,
          language: tr("hebrew", "english"),
          shootDates: shootDates || undefined,
          payOffered: payOffered || undefined,
          holdHours: holdHours || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.text) onDraft(data.text);
      }
    } finally {
      setLoading(false);
    }
  }

  if (!ready) return null;
  return (
    <div className="mt-2 flex items-center gap-2 flex-wrap">
      <button
        type="button"
        onClick={generate}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full bg-plum/15 border border-plum/40 text-plum-light text-[0.6875rem] font-semibold disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
        {tr("ניסוח עם Aria", "Draft with Aria")}
      </button>
      {([
        { k: "professional" as const, label: tr("מקצועי", "Professional") },
        { k: "warm" as const,         label: tr("חם", "Warm") },
        { k: "brief" as const,        label: tr("קצר", "Brief") },
        { k: "enthusiastic" as const, label: tr("נלהב", "Enthusiastic") },
      ]).map((t) => (
        <button
          key={t.k}
          type="button"
          onClick={() => setTone(t.k)}
          className={`text-[0.6875rem] px-2 h-6 rounded-full border ${
            tone === t.k
              ? "bg-bg-elevated border-plum/40 text-plum-light font-semibold"
              : "bg-transparent border-border text-text-muted"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
