"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, Users, FileVideo, MessageSquareReply } from "lucide-react";
import { getRolesByProject, loadSubmissions } from "@/lib/projects-store";
import { useT } from "@/lib/i18n";

// "What's next" for one project: tapes waiting for review, scheduled
// in-person callbacks, tape deadlines and talent replies still pending.
type Item = { id: string; at?: number; icon: typeof Clock; title: string; detail: string; href: string; hot?: boolean };

export function ProjectAgenda({ projectId }: { projectId: string }) {
  const { lang } = useT();
  const he = lang === "he";
  const L = (h: string, e: string) => (he ? h : e);
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    const roles = getRolesByProject(projectId);
    const byId = new Map(roles.map((r) => [r.id, r]));
    const subs = loadSubmissions().filter((s) => byId.has(s.roleId));
    const out: Item[] = [];
    const fmt = (iso: string) => new Date(iso).toLocaleString(he ? "he-IL" : "en-US", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    const base = `/pro/projects/${projectId}/role`;

    for (const r of roles) {
      const toReview = subs.filter((s) => s.roleId === r.id && s.stage === "submitted").length;
      if (toReview) out.push({ id: `rv_${r.id}`, icon: FileVideo, hot: true, title: L(`${toReview} טייפים מחכים לצפייה`, `${toReview} tapes waiting for review`), detail: r.name, href: `${base}/${r.id}` });
      const waiting = subs.filter((s) => s.roleId === r.id && s.stage === "invited").length;
      if (r.deadline && waiting && new Date(r.deadline).getTime() > Date.now() - 86400_000) {
        out.push({ id: `dl_${r.id}`, at: new Date(r.deadline).getTime(), icon: Clock, title: L(`דדליין לטייפים · ${waiting} עוד לא שלחו`, `Tape deadline · ${waiting} not sent yet`), detail: `${r.name} · ${fmt(r.deadline)}`, href: `${base}/${r.id}` });
      }
    }
    for (const s of subs) {
      const r = byId.get(s.roleId)!;
      if (s.stage === "callback" && s.callbackScheduledAt && !s.callbackCompleted) {
        out.push({ id: `cb_${s.id}`, at: new Date(s.callbackScheduledAt).getTime(), icon: Users, title: L(`קולבק: ${s.talentName}`, `Callback: ${s.talentName}`), detail: `${r.name} · ${fmt(s.callbackScheduledAt)}${s.callbackLocation ? ` · ${s.callbackLocation}` : ""}`, href: `${base}/${r.id}/submission/${s.id}` });
      }
      if (s.offerResponse === "pending" || s.availResponse === "pending") {
        out.push({ id: `rp_${s.id}`, icon: MessageSquareReply, title: s.offerResponse === "pending" ? L(`הצעה מחכה לתשובה: ${s.talentName}`, `Offer awaiting reply: ${s.talentName}`) : L(`בדיקת זמינות: ${s.talentName}`, `Availability check: ${s.talentName}`), detail: r.name, href: `${base}/${r.id}/submission/${s.id}` });
      }
    }
    out.sort((a, b) => Number(!!b.hot) - Number(!!a.hot) || (a.at ?? Infinity) - (b.at ?? Infinity));
    setItems(out);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, he]);

  if (!items.length) return null;
  return (
    <section aria-labelledby="pa-h" className="sheet rounded-xl p-3 space-y-2">
      <h2 id="pa-h" className="text-sm font-bold">{L("מה הלאה בפרויקט", "What's next in this project")}</h2>
      {items.slice(0, 6).map((it) => (
        <Link key={it.id} href={it.href} className={`flex items-center gap-3 rounded-lg px-3 py-2 min-h-[48px] ${it.hot ? "bg-hi" : "bg-bg-muted"}`}>
          <it.icon className="w-4 h-4 shrink-0" aria-hidden />
          <span className="min-w-0">
            <span className="block text-sm font-semibold">{it.title}</span>
            <span className="block text-xs text-text-muted truncate">{it.detail}</span>
          </span>
        </Link>
      ))}
    </section>
  );
}
