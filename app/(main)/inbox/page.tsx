"use client";
import { GuardianBanner } from "@/components/TrustBanners";
import { useTrust } from "@/lib/cloud/trust";
import { ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Inbox, Clock, Video, ChevronRight, AlertCircle, CheckCircle2, CalendarDays,
} from "lucide-react";
import { Header } from "@/components/Header";
import { EmptyState } from "@/components/EmptyState";
import { StageBadge } from "@/components/StageBadge";
import {
  getAuditionsForTalent, loadSubmissions, acceptOffer, declineOffer,
  confirmAvailable, markUnavailable,
  type Submission, type Role, type Project,
} from "@/lib/projects-store";
import { notifyProOfferResponse, notifyProAvailResponse } from "@/lib/notifications-store";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { isRealUserId } from "@/lib/cloud/config";
import { useT } from "@/lib/i18n";
import { optLabel } from "@/lib/typecast-options";

function useL() {
  const { lang } = useT();
  const he = lang === "he";
  return { he, L: (h: string, e: string) => (he ? h : e) };
}

// Demo-mode: in localStorage there's no real "me" talent matching pro invites.
// So when ME_ID has no auditions, we surface ALL submissions across the device
// so the talent can preview the inbox UX from the demo data.
const ME_ID = "me";

type AuditionItem = { submission: Submission; role?: Role; project?: Project };
type TabId = "active" | "history";

export default function InboxPage() {
  const [items, setItems] = useState<AuditionItem[]>([]);
  const [tab, setTab] = useState<TabId>("active");

  const userId = useStore((st) => st.userId);
  const [rev, setRev] = useState(0);
  const { he, L } = useL();

  // Re-read when invites / updates arrive from the casting pro's account.
  useEffect(() => {
    const bump = () => setRev((n) => n + 1);
    window.addEventListener("castit:remote-update", bump);
    return () => window.removeEventListener("castit:remote-update", bump);
  }, []);

  useEffect(() => {
    // Real account → only auditions sent to this talent's account.
    if (isRealUserId(userId)) {
      setItems(getAuditionsForTalent(userId) as AuditionItem[]);
      return;
    }
    const mine = getAuditionsForTalent(ME_ID);
    if (mine.length > 0) {
      setItems(mine as AuditionItem[]);
    } else {
      const all = loadSubmissions();
      const collected = all.map((s) => {
        const list = getAuditionsForTalent(s.talentId);
        return list.find((x) => x.submission.id === s.id);
      }).filter(Boolean) as AuditionItem[];
      setItems(collected);
    }
  }, [userId, rev]);

  const counts = useMemo(() => ({
    active: items.filter((i) => isActive(i.submission)).length,
    history: items.filter((i) => !isActive(i.submission)).length,
    needTape: items.filter((i) => i.submission.stage === "invited").length,
  }), [items]);

  const shown = items
    .filter((i) => (tab === "active" ? isActive(i.submission) : !isActive(i.submission)))
    .sort((a, b) => urgencyScore(a.submission, a.role) - urgencyScore(b.submission, b.role)
                  || +new Date(b.submission.createdAt) - +new Date(a.submission.createdAt));

  return (
    <div className="min-h-dvh bg-bg pb-24">
      <Header
        title={
          <span className="flex items-center gap-2">
            <Inbox className="w-4 h-4 text-gold" />
            <span className="font-display text-lg">{L("אודישנים", "Auditions")}</span>
          </span>
        }
        right={
          <Link href="/calendar" aria-label={L("היומן שלי", "My calendar")} className="w-11 h-11 -me-2 grid place-items-center">
            <CalendarDays className="w-5 h-5" />
          </Link>
        }
      />
      <GuardianBanner />

      <div className="px-5 pt-3 space-y-4">
        <div>
          <h1 className="font-display text-3xl tracking-editorial">
            {he ? <>תיבת ה<em className="text-gold-gradient not-italic">אודישנים</em> שלך.</> : <>Your <em className="text-gold-gradient not-italic">audition inbox</em>.</>}
          </h1>
          <p className="text-text-muted text-sm mt-1">
            {L("כל ההזמנות וכל הסטטוסים, במקום אחד.", "Every invite, every status, in one place.")}
          </p>
        </div>

        {counts.needTape > 0 && tab === "active" && (
          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-gold/10 border border-gold/30">
            <div className="w-8 h-8 rounded-lg bg-gold/20 text-gold grid place-items-center">
              <Video className="w-4 h-4" />
            </div>
            <div className="flex-1 text-sm">
              <span className="font-semibold text-gold">{he ? (counts.needTape > 1 ? `${counts.needTape} טייפים לצלם.` : "טייפ אחד לצלם.") : `${counts.needTape} tape${counts.needTape > 1 ? "s" : ""} to record.`}</span>
              <span className="text-text-muted ms-1">{L("לחצו על הזמנה כדי להתחיל.", "Tap any invite below to start.")}</span>
            </div>
          </div>
        )}

        <div className="flex gap-1 border-b border-border">
          {([
            { id: "active",  label: L("פעילים", "Active"),  count: counts.active },
            { id: "history", label: L("היסטוריה", "History"), count: counts.history },
          ] as { id: TabId; label: string; count: number }[]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex-1 h-10 text-xs font-semibold uppercase tracking-wider border-b-2 -mb-px transition-colors inline-flex items-center justify-center gap-2",
                tab === t.id ? "border-gold text-gold" : "border-transparent text-text-muted"
              )}
            >
              {t.label}
              <span className="tnum opacity-70">{t.count}</span>
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={tab === "active" ? L("אין אודישנים פעילים", "No active auditions") : L("עוד אין היסטוריה", "No history yet")}
            description={
              tab === "active"
                ? L("כשמלהק מזמין אותך לאודישן, ההזמנה תופיע כאן.", "When a casting pro invites you to read for a role, the invite shows up here.")
                : L("אודישנים שהסתיימו או נסגרו יופיעו כאן.", "Past auditions you've completed or that were closed appear here.")
            }
          />
        ) : (
          <div className="space-y-2.5">
            {shown.map((i, idx) => <AuditionCard key={i.submission.id} item={i} i={idx} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function AuditionCard({ item, i }: { item: AuditionItem; i: number }) {
  const trust = useTrust();
  const { submission: s, role, project } = item;
  const [offerState, setOfferState] = useState<"idle" | "accepted" | "declined">("idle");
  const [availState, setAvailState] = useState<"idle" | "available" | "unavailable">("idle");
  const { he, L } = useL();
  if (!role || !project) return null;
  const needsTape = s.stage === "invited";
  const callbackTape = s.stage === "callback";
  const offerPending = s.stage === "offered" && s.offerResponse !== "accepted" && s.offerResponse !== "declined" && offerState === "idle";
  const availPending = s.stage === "avail_check" && s.availResponse !== "available" && s.availResponse !== "unavailable" && availState === "idle";

  function respondOffer(accept: boolean) {
    if (accept) { acceptOffer(s.id); setOfferState("accepted"); }
    else { declineOffer(s.id); setOfferState("declined"); }
    notifyProOfferResponse(s.talentName, role!.name, accept);
  }

  function respondAvail(available: boolean) {
    if (available) { confirmAvailable(s.id); setAvailState("available"); }
    else { markUnavailable(s.id); setAvailState("unavailable"); }
    notifyProAvailResponse(s.talentName, role!.name, available);
  }
  const deadline = role.deadline ? new Date(role.deadline) : null;
  const daysToDeadline = deadline ? Math.ceil((+deadline - Date.now()) / 86400000) : null;
  const urgent = daysToDeadline != null && daysToDeadline >= 0 && daysToDeadline <= 2 && needsTape;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.04 }}
      className={cn(
        "rounded-2xl border overflow-hidden",
        urgent ? "border-gold/50 bg-gold/5" : "border-border bg-bg-elevated"
      )}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-[0.6875rem] uppercase tracking-widest text-gold">{optLabel(project.type, he)}</div>
            <h3 className="font-display text-lg leading-tight truncate">{project.title}</h3>
            <p className="text-[0.6875rem] text-text-muted truncate">{project.studio} · {role.name}</p>
            {trust.available && (s as any)._ownerId && (
              <p className="text-[0.6875rem] text-sage font-semibold mt-0.5 inline-flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" aria-hidden /> {L("מלהק/ת מאומת/ת", "Verified casting pro")}
              </p>
            )}
          </div>
          <StageBadge stage={s.stage} size="md" />
        </div>

        <Timeline stage={s.stage} />

        <div className="flex flex-wrap items-center gap-3 mt-3 text-[0.6875rem]">
          {deadline && (
            <span className={cn("inline-flex items-center gap-1", urgent ? "text-gold font-semibold" : "text-text-muted")}>
              <Clock className="w-3 h-3" />
              {needsTape
                ? daysToDeadline! < 0 ? L("הדדליין עבר", "Deadline passed") : daysToDeadline === 0 ? L("להגיש היום", "Due today") : he ? `להגיש בעוד ${daysToDeadline} ימים` : `Due in ${daysToDeadline}d`
                : `${L("דדליין", "Deadline")} ${deadline.toLocaleDateString(he ? "he-IL" : undefined, { month: "short", day: "numeric" })}`}
            </span>
          )}
          {role.shootDates && <span className="text-text-muted">{L("צילומים:", "Shoot:")} {role.shootDates}</span>}
          {role.payRange && <span className="text-success font-semibold">{role.payRange}</span>}
        </div>

        {s.proMessage && <p className="text-xs text-text-muted leading-relaxed mt-3 line-clamp-2">{s.proMessage}</p>}
      </div>

      <div className="border-t border-border bg-bg/40 px-3 py-2.5">
        {availState === "available" ? (
          <div className="text-[0.6875rem] text-success font-semibold text-center px-2 w-full inline-flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> {L("אישרת זמינות. המלהק/ת עודכן/ה.", "You confirmed availability. Casting was notified.")}
          </div>
        ) : availState === "unavailable" ? (
          <div className="text-[0.6875rem] text-text-muted text-center px-2 w-full">{L("סימנת שאינך פנוי/ה. המלהק/ת עודכן/ה.", "You marked yourself unavailable. Casting was notified.")}</div>
        ) : availPending ? (
          <div>
            <div className="text-[0.6875rem] uppercase tracking-widest text-plum-light font-semibold text-center mb-2">
              {L("בדיקת זמינות", "Availability check")}{s.shootDates ? ` · ${s.shootDates}` : ""}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => respondAvail(false)}
                className="h-10 rounded-xl bg-bg border border-border text-text-muted text-sm font-semibold"
              >
                {L("לא פנוי/ה", "Not available")}
              </button>
              <button
                onClick={() => respondAvail(true)}
                className="h-10 rounded-xl bg-success text-on-accent text-sm font-semibold inline-flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" /> {L("פנוי/ה", "Available")}
              </button>
            </div>
          </div>
        ) : offerState === "accepted" ? (
          <div className="text-[0.6875rem] text-success font-semibold text-center px-2 inline-flex items-center justify-center gap-1.5 w-full">
            <CheckCircle2 className="w-3.5 h-3.5" /> {L("קיבלת את ההצעה, מזל טוב! המלהק/ת יאשר/תאשר את הבוקינג.", "Offer accepted, congrats! Casting will confirm the booking.")}
          </div>
        ) : offerState === "declined" ? (
          <div className="text-[0.6875rem] text-text-muted text-center px-2 w-full">{L("דחית את ההצעה. המלהק/ת עודכן/ה.", "You declined the offer. Casting was notified.")}</div>
        ) : offerPending ? (
          <div>
            <div className="text-[0.6875rem] uppercase tracking-widest text-violet font-semibold text-center mb-2">
              {L("קיבלת הצעה", "You have an offer")}{s.payOffered ? ` · ${s.payOffered}` : ""}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => respondOffer(false)}
                className="h-10 rounded-xl bg-bg border border-border text-text-muted text-sm font-semibold"
              >
                {L("לדחות", "Decline")}
              </button>
              <button
                onClick={() => respondOffer(true)}
                className="h-10 rounded-xl bg-success text-on-accent text-sm font-semibold inline-flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" /> {L("לקבל את ההצעה", "Accept offer")}
              </button>
            </div>
          </div>
        ) : needsTape || callbackTape ? (
          <Link
            href={`/inbox/${s.id}/record`}
            className={cn(
              "w-full h-10 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2 active:scale-95 transition-transform",
              callbackTape ? "bg-success text-on-accent" : "bg-gold text-on-accent"
            )}
          >
            <Video className="w-4 h-4" />
            {callbackTape ? L("צילום טייפ לקולבק", "Record callback tape") : L("צילום סלף-טייפ", "Record self-tape")}
          </Link>
        ) : (
          <div className="text-[0.6875rem] text-text-muted text-center px-2">
            {statusMessage(s.stage, he)}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function Timeline({ stage }: { stage: Submission["stage"] }) {
  const { L } = useL();
  const steps: { id: Submission["stage"]; label: string }[] = [
    { id: "invited",     label: L("הוזמנת", "Invited") },
    { id: "submitted",   label: L("הוגש", "Submitted") },
    { id: "callback",    label: L("קולבק", "Callback") },
    { id: "avail_check", label: L("זמינות", "Avail") },
    { id: "offered",     label: L("הצעה", "Offer") },
    { id: "booked",      label: L("נבחרת", "Booked") },
  ];
  const order: Submission["stage"][] = ["invited", "submitted", "callback", "avail_check", "offered", "booked"];
  const currentIdx = stage === "rejected"
    ? -1
    : stage === "hold"
      ? order.indexOf("submitted")
      : order.indexOf(stage);

  if (stage === "rejected") {
    return (
      <div className="mt-3 inline-flex items-center gap-1.5 text-[0.6875rem] text-text-muted">
        <AlertCircle className="w-3 h-3" /> {L("הליהוק הלך לכיוון אחר", "Casting moved in a different direction")}
      </div>
    );
  }

  return (
    <div className="mt-3 flex items-center gap-1">
      {steps.map((s, i) => {
        const reached = i <= currentIdx;
        const isCurrent = i === currentIdx;
        return (
          <div key={s.id} className="flex-1 flex flex-col items-center gap-1">
            <div className={cn(
              "h-1 w-full rounded-full transition-all",
              reached ? (isCurrent ? "bg-gold" : "bg-gold/60") : "bg-bg"
            )} />
            <div className={cn(
              "text-[0.6875rem] uppercase tracking-wider text-center",
              isCurrent ? "text-gold font-semibold" : reached ? "text-text" : "text-text-subtle"
            )}>
              {s.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function isActive(s: Submission) {
  return !["booked", "rejected"].includes(s.stage);
}
function urgencyScore(s: Submission, role?: Role) {
  if (s.stage !== "invited") return 999;
  if (!role?.deadline) return 100;
  return +new Date(role.deadline) - Date.now();
}
function statusMessage(stage: Submission["stage"], he: boolean) {
  const L = (h: string, e: string) => (he ? h : e);
  switch (stage) {
    case "submitted":   return L("הטייפ התקבל. מחכים להחלטה.", "Your tape was received — awaiting decision.");
    case "hold":        return L("את/ה בהמתנה אצל הליהוק. יעדכנו בקרוב.", "Casting placed you on hold — they'll update you soon.");
    case "avail_check": return L("אשר/י זמינות. ההפקה תחזור אליך.", "Confirm your availability — production will follow up.");
    case "offered":     return L("יש לך הצעה. בדוק/י את ההודעות.", "You have an offer — check your messages.");
    case "booked":      return L("🎉 נבחרת! ההפקה תיצור קשר.", "🎉 Booked. Production will be in touch.");
    case "rejected":    return L("הליהוק החליט שלא להמשיך בתפקיד הזה.", "Casting passed on this role.");
    default:            return "";
  }
}
