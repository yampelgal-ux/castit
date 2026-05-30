"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, XCircle, PauseCircle, FileVideo, Calendar, ArrowRight,
  Repeat, CalendarCheck, FileSignature, PartyPopper, Undo2, Send, Clock,
  Wand2, Loader2, MapPin, Users, X as XIcon, Video as VideoIcon,
} from "lucide-react";
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

type Action =
  | { kind: "callback";       label: string; tone: "success" }   // schedule callback (in-person OR tape)
  | { kind: "callback_done";  label: string; tone: "success" }   // confirm in-person callback happened
  | { kind: "cancel_callback"; label: string; tone: "muted" }     // scheduled callback won't happen
  | { kind: "hold";           label: string; tone: "sage" }
  | { kind: "avail";          label: string; tone: "plum" }
  | { kind: "offer";          label: string; tone: "violet" }
  | { kind: "book";           label: string; tone: "success" }
  | { kind: "reject";         label: string; tone: "danger" }
  | { kind: "reopen";         label: string; tone: "muted" }
  | { kind: "request_tape";   label: string; tone: "gold" };

const TEMPLATES: Record<string, string> = {
  callback:     "Loved your tape — we'd like to bring you back for a callback. We'll send the new sides shortly.",
  hold:         "Strong work — we're holding your tape as we narrow down. We'll be in touch soon.",
  avail:        "We're moving you forward — can you confirm availability for the shoot dates?",
  offer:        "We'd like to offer you the role. Details on rate and dates below — please confirm.",
  book:         "Booked! Production will reach out with paperwork and call sheets.",
  reject:       "Thank you for submitting — we've gone in a different direction for this role.",
  request_tape: "Please submit a callback self-tape with the attached new sides.",
};

export default function SubmissionPage() {
  const { id, roleId, subId } = useParams<{ id: string; roleId: string; subId: string }>();
  const router = useRouter();
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
      <div className="min-h-dvh bg-bg">
        <Header back title="Submission" />
        <EmptyState icon={FileVideo} title="Not found" />
      </div>
    );
  }

  // Which actions are available given the current stage
  const actions = getActions(sub);

  function openAction(a: Action) {
    setAction(a);
    setMessage(TEMPLATES[a.kind] ?? "");
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
      note: `Self-tape — round ${sub.tapes.length + 1}`,
    });
    reload();
  }

  return (
    <div className="min-h-dvh bg-bg pb-44">
      <Header back title="Submission" />

      <div className="px-5 pt-3 space-y-4">
        {/* Talent header */}
        <div className="flex items-center gap-3">
          <img src={sub.talentPhoto} alt={sub.talentName} className="w-14 h-14 rounded-2xl object-cover" />
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl leading-tight truncate">{sub.talentName}</h1>
            <p className="text-[11px] text-text-muted truncate">For: {role?.name}</p>
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
          <InvitedCard sub={sub} role={role} onSimulate={simulateTape} />
        )}

        {/* Tape history (round 2, 3...) */}
        {sub.tapes.length > 1 && (
          <details className="rounded-2xl bg-bg-elevated border border-border p-3">
            <summary className="text-[11px] uppercase tracking-widest text-gold cursor-pointer">
              Earlier rounds ({sub.tapes.length - 1})
            </summary>
            <div className="mt-3 space-y-2">
              {sub.tapes.slice(0, -1).reverse().map((t) => (
                <div key={t.round} className="rounded-xl bg-bg border border-border p-3">
                  <div className="flex items-center gap-2 text-[11px] text-text-muted">
                    <FileVideo className="w-3 h-3" /> Round {t.round} · {fmtDate(t.submittedAt)}
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

        {/* Optional private notes & tags */}
        <TalentNotes talentId={sub.talentId} talentName={sub.talentName} />

        {/* Most recent pro → talent message */}
        {sub.proMessage && sub.stage !== "invited" && (
          <div className="rounded-2xl bg-gold/8 border border-gold/20 p-4">
            <div className="text-[10px] uppercase tracking-widest text-gold mb-1 flex items-center gap-1.5">
              <Send className="w-3 h-3" /> Last message to {sub.talentName.split(" ")[0]}
            </div>
            <p className="text-xs leading-relaxed">{sub.proMessage}</p>
            {sub.shootDates && <p className="text-[11px] text-text-muted mt-2">Shoot: {sub.shootDates}</p>}
            {sub.payOffered && <p className="text-[11px] text-text-muted">Offer: {sub.payOffered}</p>}
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
          <div className="fixed inset-0 z-50 grid place-items-end max-w-[440px] mx-auto">
            <div className="absolute inset-0 bg-black/60" onClick={() => setAction(null)} />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              className="relative w-full bg-bg-elevated border-t border-border rounded-t-3xl p-5 max-h-[80dvh] overflow-y-auto"
            >
              <div className="w-12 h-1 rounded-full bg-border mx-auto mb-4" />
              <h2 className="font-display text-2xl mb-1">{actionTitle(action.kind, sub.talentName)}</h2>
              <p className="text-sm text-text-muted mb-4">{actionSubtitle(action.kind)}</p>

              {action.kind === "callback" && (
                <>
                  <Field label="Callback type">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setCallbackType("in_person")}
                        className={cn(
                          "p-3 rounded-2xl border text-right transition",
                          callbackType === "in_person"
                            ? "bg-gold/10 border-gold"
                            : "bg-bg border-border"
                        )}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Users className="w-3.5 h-3.5 text-gold" />
                          <span className="text-xs font-semibold">פרונטלי</span>
                        </div>
                        <p className="text-[10px] text-text-muted leading-snug">
                          פגישה בסטודיו / חדר ליהוק
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCallbackType("tape")}
                        className={cn(
                          "p-3 rounded-2xl border text-right transition",
                          callbackType === "tape"
                            ? "bg-gold/10 border-gold"
                            : "bg-bg border-border"
                        )}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <VideoIcon className="w-3.5 h-3.5 text-gold" />
                          <span className="text-xs font-semibold">Self-tape נוסף</span>
                        </div>
                        <p className="text-[10px] text-text-muted leading-snug">
                          סבב הקלטה נוסף עם sides חדשים
                        </p>
                      </button>
                    </div>
                  </Field>
                  {callbackType === "in_person" && (
                    <>
                      <div className="grid grid-cols-2 gap-2.5">
                        <Field label="תאריך">
                          <input
                            type="date"
                            value={callbackDate}
                            onChange={(e) => setCallbackDate(e.target.value)}
                            className="w-full h-11 px-3 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60"
                          />
                        </Field>
                        <Field label="שעה">
                          <input
                            type="time"
                            value={callbackTime}
                            onChange={(e) => setCallbackTime(e.target.value)}
                            className="w-full h-11 px-3 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60"
                          />
                        </Field>
                      </div>
                      <Field label="מיקום">
                        <input
                          value={callbackLocation}
                          onChange={(e) => setCallbackLocation(e.target.value)}
                          placeholder="e.g. Tagada Studios, Tel Aviv"
                          className="w-full h-11 px-3 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60"
                        />
                      </Field>
                    </>
                  )}
                </>
              )}

              {action.kind === "callback_done" && (
                <Field label="הערה אחרי הפגישה (אופציונלי)">
                  <textarea
                    value={callbackOutcome}
                    onChange={(e) => setCallbackOutcome(e.target.value)}
                    rows={3}
                    placeholder="איך עבר? מה השתפר? מה הותיר ספק?"
                    className="w-full px-3 py-2.5 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60"
                  />
                </Field>
              )}

              {action.kind === "hold" && (
                <Field label="Hold duration (1st refusal)">
                  <div className="flex gap-1.5 flex-wrap">
                    {[24, 48, 72, 168].map((h) => (
                      <button
                        key={h}
                        onClick={() => setHoldHours(h)}
                        className={cn(
                          "h-9 px-3 rounded-full text-xs font-semibold border",
                          holdHours === h ? "bg-gold text-bg border-gold" : "bg-bg text-text border-border"
                        )}
                      >
                        {h === 168 ? "1 week" : h === 24 ? "24h" : `${h}h`}
                      </button>
                    ))}
                    <button
                      onClick={() => setHoldHours(0)}
                      className={cn(
                        "h-9 px-3 rounded-full text-xs font-semibold border",
                        holdHours === 0 ? "bg-gold text-bg border-gold" : "bg-bg text-text border-border"
                      )}
                    >
                      No timer
                    </button>
                  </div>
                  <p className="text-[10px] text-text-muted mt-1.5">
                    The talent is asked to stay available for this window. They see a countdown on their end.
                  </p>
                </Field>
              )}

              {action.kind === "avail" && (
                <Field label="Shoot dates">
                  <input
                    value={shootDates} onChange={(e) => setShootDates(e.target.value)}
                    placeholder="Aug 12 – Sep 25"
                    className="w-full h-11 px-3 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60"
                  />
                </Field>
              )}
              {action.kind === "offer" && (
                <>
                  <Field label="Pay / Rate">
                    <input
                      value={payOffered} onChange={(e) => setPayOffered(e.target.value)}
                      placeholder="$2K/day + travel"
                      className="w-full h-11 px-3 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60"
                    />
                  </Field>
                  <Field label="Shoot dates">
                    <input
                      value={shootDates} onChange={(e) => setShootDates(e.target.value)}
                      placeholder="Aug 12 – Sep 25"
                      className="w-full h-11 px-3 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60"
                    />
                  </Field>
                </>
              )}

              <Field label={`Message to ${sub.talentName.split(" ")[0]}`}>
                <textarea
                  value={message} onChange={(e) => setMessage(e.target.value)} rows={4}
                  className="w-full px-3 py-2.5 rounded-2xl bg-bg border border-border text-sm outline-none focus:border-gold/60"
                />
                <AriaDraftButton
                  intent={actionToIntent(action.kind)}
                  talentName={sub.talentName}
                  roleName={role?.name ?? "the role"}
                  projectTitle={project?.title ?? "the project"}
                  shootDates={shootDates}
                  payOffered={payOffered}
                  holdHours={holdHours}
                  onDraft={(t) => setMessage(t)}
                />
              </Field>

              <div className="grid grid-cols-2 gap-2 mt-4">
                <button onClick={() => setAction(null)} className="h-12 rounded-2xl border border-border bg-bg text-sm font-semibold">
                  Cancel
                </button>
                <button
                  onClick={commit}
                  className={cn("h-12 rounded-2xl font-semibold flex items-center justify-center gap-2", toneClasses(action.tone))}
                >
                  {confirmLabel(action.kind)} <ArrowRight className="w-4 h-4" />
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
                <div className="text-[11px] opacity-80">{sub.talentName} will be notified</div>
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
        <div className="text-sm font-semibold">{expired ? "Hold expired" : "Held — 1st refusal"}</div>
        <div className="text-[11px] text-text-muted">
          {expired
            ? `Expired on ${fmtDate(until)}`
            : <>Releases in <span className="font-semibold tnum">{hours > 0 ? `${hours}h ` : ""}{mins}m</span></>}
        </div>
      </div>
    </div>
  );
}

function InvitedCard({ sub, role, onSimulate }: { sub: Submission; role: Role | null; onSimulate: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-bg-elevated p-5 text-center">
      <div className="w-12 h-12 rounded-2xl bg-plum/20 grid place-items-center mx-auto mb-3">
        <Clock className="w-6 h-6 text-plum-light" />
      </div>
      <h3 className="font-display text-lg">Waiting for self-tape</h3>
      <p className="text-xs text-text-muted mt-1 max-w-[280px] mx-auto">
        Invited {fmtDate(sub.createdAt)}.
        {role?.deadline && <> Tape due <span className="text-gold font-semibold">{fmtDate(role.deadline)}</span>.</>}
      </p>
      {sub.inviteMessage && (
        <div className="text-left mt-4 rounded-xl bg-bg/50 border border-border p-3">
          <div className="text-[10px] uppercase tracking-widest text-gold mb-1">Invite message</div>
          <p className="text-xs leading-relaxed">{sub.inviteMessage}</p>
        </div>
      )}
      <button
        onClick={onSimulate}
        className="mt-4 inline-flex items-center gap-2 px-4 h-10 rounded-full border border-border text-xs text-text-muted"
      >
        <FileVideo className="w-3 h-3" /> Simulate tape arrival
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="text-[10px] uppercase tracking-widest text-text-muted mb-1">{label}</div>
      {children}
    </div>
  );
}

// ---- Stage-driven action menus ----
// Now sub-aware so the "callback" stage shows different actions depending on
// whether the callback session has already happened.
function getActions(sub: Submission): Action[] {
  switch (sub.stage) {
    case "invited":
      return [
        { kind: "reject", label: "Withdraw invite", tone: "danger" },
      ];
    case "submitted":
      return [
        { kind: "callback", label: "Schedule callback", tone: "success" },
        { kind: "hold",     label: "Hold (1st refusal)", tone: "sage" },
        { kind: "reject",   label: "Pass",      tone: "danger" },
      ];
    case "callback": {
      // In-person callback NOT yet confirmed → can only mark done, cancel, or pass.
      // No skipping straight to book/offer/avail_check.
      const inPersonPending = sub.callbackType === "in_person" && !sub.callbackCompleted;
      if (inPersonPending) {
        return [
          { kind: "callback_done",   label: "Callback done — proceed", tone: "success" },
          { kind: "cancel_callback", label: "Cancel callback",         tone: "muted" },
          { kind: "reject",          label: "Pass",                    tone: "danger" },
        ];
      }
      // Tape callback still waiting for a new tape → only cancel or pass
      if (sub.callbackType === "tape" && !sub.callbackCompleted) {
        return [
          { kind: "cancel_callback", label: "Cancel callback tape", tone: "muted" },
          { kind: "reject",          label: "Pass",                 tone: "danger" },
        ];
      }
      // Callback completed (tape arrived or session done) → full next options
      return [
        { kind: "hold",         label: "Hold (1st refusal)",    tone: "sage" },
        { kind: "avail",        label: "Avail check",           tone: "plum" },
        { kind: "request_tape", label: "Another callback tape", tone: "gold" },
        { kind: "reject",       label: "Pass",                  tone: "danger" },
      ];
    }
    case "hold":
      return [
        { kind: "avail",    label: "Avail check",  tone: "plum" },
        { kind: "callback", label: "Bring back",   tone: "success" },
        { kind: "reject",   label: "Pass",         tone: "danger" },
      ];
    case "avail_check":
      return [
        { kind: "offer",  label: "Send offer", tone: "violet" },
        { kind: "reject", label: "Pass",       tone: "danger" },
      ];
    case "offered":
      return [
        { kind: "book",   label: "Confirm booked", tone: "success" },
        { kind: "reject", label: "Rescind offer",  tone: "danger" },
      ];
    case "booked":
      return [
        { kind: "reopen", label: "Reopen", tone: "muted" },
      ];
    case "rejected":
      return [
        { kind: "reopen", label: "Reopen", tone: "muted" },
      ];
    default:
      return [];
  }
}

function actionTitle(kind: Action["kind"], name: string) {
  const first = name.split(" ")[0];
  switch (kind) {
    case "callback":         return `Schedule callback for ${first}?`;
    case "callback_done":    return `Callback with ${first} happened?`;
    case "cancel_callback":  return `Cancel callback with ${first}?`;
    case "hold":             return `Hold ${first}?`;
    case "avail":            return `Check availability with ${first}?`;
    case "offer":            return `Send offer to ${first}?`;
    case "book":             return `Confirm ${first} as booked?`;
    case "reject":           return `Pass on ${first}?`;
    case "reopen":           return `Reopen this submission?`;
    case "request_tape":     return `Request callback tape from ${first}?`;
  }
}
function actionSubtitle(kind: Action["kind"]) {
  switch (kind) {
    case "callback":         return "פגישה פרונטלית או טייפ נוסף. אפשר להמשיך רק אחרי שהcallback הושלם.";
    case "callback_done":    return "סמן שהפגישה התקיימה. רק אז יפתחו פעולות Hold / Avail / Offer.";
    case "cancel_callback":  return "ה-callback לא יתקיים. הסטטוס יחזור ל-Submitted.";
    case "hold":             return "Keep them warm. They stay in your pool without a decision yet.";
    case "avail":            return "Confirm shoot dates before sending a formal offer.";
    case "offer":            return "Make a formal offer with rate and dates. Talent confirms to book.";
    case "book":             return "Lock the booking. Production will be notified.";
    case "reject":           return "They'll get a polite note that you've moved on.";
    case "reopen":           return "Bring this submission back to active review.";
    case "request_tape":     return "Send the new sides — they'll submit a callback tape.";
  }
}
function confirmLabel(kind: Action["kind"]) {
  switch (kind) {
    case "callback":         return "Schedule";
    case "callback_done":    return "Mark done";
    case "cancel_callback":  return "Cancel callback";
    case "hold":             return "Move to hold";
    case "avail":            return "Send check";
    case "offer":            return "Send offer";
    case "book":             return "Confirm";
    case "reject":           return "Send & pass";
    case "reopen":           return "Reopen";
    case "request_tape":     return "Request tape";
  }
}
function confirmToast(kind: Action["kind"]) {
  switch (kind) {
    case "callback":         return "Callback scheduled";
    case "callback_done":    return "Callback marked done";
    case "cancel_callback":  return "Callback cancelled";
    case "hold":             return "Moved to hold";
    case "avail":            return "Avail check sent";
    case "offer":            return "Offer sent";
    case "book":             return "Booked";
    case "reject":           return "Passed";
    case "reopen":           return "Reopened";
    case "request_tape":     return "Callback tape requested";
  }
}
function iconFor(kind: Action["kind"]) {
  switch (kind) {
    case "callback":         return <Users className="w-4 h-4" />;
    case "callback_done":    return <CheckCircle2 className="w-4 h-4" />;
    case "cancel_callback":  return <Undo2 className="w-4 h-4" />;
    case "hold":             return <PauseCircle className="w-4 h-4" />;
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
    case "success": return "bg-success text-bg";
    case "danger":  return "bg-danger text-white";
    case "sage":    return "bg-sage/80 text-bg";
    case "plum":    return "bg-plum text-text";
    case "violet":  return "bg-violet text-white";
    case "gold":    return "bg-gold text-bg";
    case "muted":   return "bg-bg-elevated border border-border text-text";
  }
}

function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    if (isNaN(+d)) return iso;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch { return iso; }
}

// ─── Callback status banner ────────────────────────────
function CallbackStatusBanner({ sub }: { sub: Submission }) {
  // Done → green confirmation
  if (sub.callbackCompleted) {
    return (
      <div className="rounded-2xl bg-success/10 border border-success/30 p-4">
        <div className="flex items-center gap-2 mb-1.5">
          <CheckCircle2 className="w-4 h-4 text-success" />
          <div className="text-[10px] uppercase tracking-widest text-success font-semibold">
            Callback completed
          </div>
        </div>
        <p className="text-xs text-text leading-relaxed">
          {sub.callbackType === "in_person"
            ? "הפגישה התקיימה. כעת אפשר להמשיך ל-Hold / Avail / Offer."
            : "טייפ ה-callback התקבל. כעת אפשר להמשיך ל-Hold / Avail / Offer."}
        </p>
        {sub.callbackOutcome && (
          <div className="mt-2 pt-2 border-t border-success/20 text-[11px] text-text-muted leading-relaxed">
            <span className="text-success font-semibold">הערה: </span>{sub.callbackOutcome}
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
          <div className="text-[10px] uppercase tracking-widest text-gold font-semibold">
            ממתין לטייפ של {sub.talentName.split(" ")[0]}
          </div>
        </div>
        <p className="text-xs text-text-muted leading-relaxed">
          ביקשת sides נוספים — תקבל התראה אוטומטית כשהטייפ נכנס.
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
        <div className="text-[10px] uppercase tracking-widest text-plum-light font-semibold">
          {isPast ? "Callback היה אמור להתקיים" : "Callback פרונטלי מתוזמן"}
        </div>
      </div>
      {sched ? (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs">
            <Calendar className="w-3.5 h-3.5 text-text-muted" />
            <span className="font-semibold">
              {sched.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </span>
            <span className="text-text-muted">
              {sched.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          {sub.callbackLocation && (
            <div className="flex items-center gap-2 text-xs">
              <MapPin className="w-3.5 h-3.5 text-text-muted" />
              <span>{sub.callbackLocation}</span>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-text-muted">תאריך לא צוין — קבע פגישה והתקדם</p>
      )}
      <p className="text-[11px] text-gold mt-3 leading-relaxed">
        ⚡ לא ניתן להעביר ל-Hold / Avail / Offer לפני שהפגישה מסומנת כהושלמה.
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
          language: "auto",
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

  return (
    <div className="mt-2 flex items-center gap-2 flex-wrap">
      <button
        type="button"
        onClick={generate}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full bg-plum/15 border border-plum/40 text-plum-light text-[11px] font-semibold disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
        Draft with Aria
      </button>
      {([
        { k: "professional" as const, label: "מקצועי" },
        { k: "warm" as const,         label: "חם" },
        { k: "brief" as const,        label: "קצר" },
        { k: "enthusiastic" as const, label: "נלהב" },
      ]).map((t) => (
        <button
          key={t.k}
          type="button"
          onClick={() => setTone(t.k)}
          className={`text-[10px] px-2 h-6 rounded-full border ${
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
