"use client";
import { useEffect, useState } from "react";
import { Building2, Check, X } from "lucide-react";
import { TalentPhoto } from "@/components/TalentPhoto";
import { useT } from "@/lib/i18n";
import { answerAgency, loadMyAgencies, type MyAgency } from "@/lib/cloud/agency";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";

/**
 * The actor's agencies: requests to approve, and who represents them now.
 * `compact` shows only pending requests (for the inbox); nothing renders when
 * there is nothing to show or the database update isn't installed.
 */
export function AgencyRequests({ compact = false }: { compact?: boolean }) {
  const { lang } = useT();
  const L = (h: string, e: string) => (lang === "he" ? h : e);
  const [list, setList] = useState<MyAgency[] | null>(null);
  const reload = () => loadMyAgencies().then((r) => setList(r.ok ? r.data : null));
  const userId = useStore((s) => s.userId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void reload(); }, [userId]);
  if (!list) return null;
  const shown = compact ? list.filter((a) => a.status === "pending") : list;
  if (shown.length === 0) {
    if (compact) return null;
    return <p className="text-sm text-text-muted">{L("אין סוכנות שמייצגת אותך כרגע. סוכן/ת יכול/ה לשלוח לך בקשה מהאפליקציה.", "No agency represents you yet. An agent can send you a request in the app.")}</p>;
  }
  return (
    <div className="space-y-2" id="agency">
      {shown.map((a) => (
        <div key={a.agent_id} className={cn("p-3 rounded-2xl border", a.status === "pending" ? "border-gold/40 bg-gold/5" : "border-border bg-bg-elevated")}>
          <div className="flex items-center gap-3">
            <TalentPhoto src={a.photo_url} name={a.agent_name ?? ""} className="w-10 h-10 rounded-xl shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate inline-flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" aria-hidden /> {a.agency_name || a.agent_name}</div>
              <div className="text-[0.6875rem] text-text-muted">
                {a.status === "pending"
                  ? L(`${a.agent_name ?? ""} רוצה לייצג אותך ולהגיש אותך לאודישנים`, `${a.agent_name ?? ""} wants to represent you and submit you to auditions`)
                  : L("מייצגת אותך. היא יכולה להגיש אותך לאודישנים ולראות את הסטטוס.", "Represents you. They can submit you to auditions and see the status.")}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2.5">
            {a.status === "pending" ? (
              <>
                <button onClick={async () => { if (await answerAgency(a.agent_id, false)) void reload(); }}
                  className="h-10 rounded-xl border border-border text-sm font-semibold inline-flex items-center justify-center gap-1.5"><X className="w-4 h-4" aria-hidden /> {L("לא, תודה", "Decline")}</button>
                <button onClick={async () => { if (await answerAgency(a.agent_id, true)) void reload(); }}
                  className="h-10 rounded-xl bg-success text-on-accent text-sm font-semibold inline-flex items-center justify-center gap-1.5"><Check className="w-4 h-4" aria-hidden /> {L("אישור ייצוג", "Approve")}</button>
              </>
            ) : (
              <button onClick={async () => { if (await answerAgency(a.agent_id, false)) void reload(); }}
                className="col-span-2 h-10 rounded-xl border border-border text-sm text-text-muted">{L("הפסקת הייצוג", "End representation")}</button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
