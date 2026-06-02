"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { EmptyState } from "@/components/EmptyState";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { getConversations, getOrCreateConversation } from "@/lib/db";
import { TALENTS } from "@/lib/mock-data";
import { loadSubmissions, loadRoles, loadProjects, type Submission, type Role, type Project } from "@/lib/projects-store";
import { ShieldCheck, FolderOpen } from "lucide-react";
import Link from "next/link";

type Convo = {
  id: string;
  name: string;
  photo: string;
  lastMessage: string;
  lastAt: string;
  // Pro-mode metadata: which project/role the conversation is tied to
  projectTitle?: string;
  roleName?: string;
};

const MOCK_CONVOS: Convo[] = TALENTS.slice(0, 3).map((t) => ({
  id: t.id,
  name: t.name,
  photo: t.photo,
  lastMessage: "Hey, saw your reel — amazing work!",
  lastAt: "10:24",
}));

function timeShort(iso: string) {
  try {
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch { return ""; }
}

export default function MessagesPage() {
  return (
    <Suspense>
      <MessagesContent />
    </Suspense>
  );
}

function MessagesContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { userId, profile } = useStore();
  const { t, dir } = useT();
  const [convos, setConvos] = useState<Convo[]>([]);
  const [loading, setLoading] = useState(true);

  const isPro = profile.role === "Casting Pro";
  const withId = params.get("with");
  const withName = params.get("name");

  useEffect(() => {
    async function init() {
      if (withId && userId) {
        try {
          const convoId = await getOrCreateConversation(userId, withId);
          router.replace(`/messages/${convoId}`);
          return;
        } catch {}
      }

      // PRO MODE: derive conversations ONLY from active submissions.
      // No cold DMs — every thread is tied to a project/role they're working on.
      if (isPro) {
        const subs = loadSubmissions();
        const rolesById: Record<string, Role> = Object.fromEntries(loadRoles().map((r) => [r.id, r]));
        const projsById: Record<string, Project> = Object.fromEntries(loadProjects().map((p) => [p.id, p]));

        // One conversation per talent who has an active submission with this pro
        const byTalent = new Map<string, { s: Submission; role?: Role; proj?: Project }>();
        subs.forEach((s) => {
          // Only active stages — booked & rejected don't deserve an open thread
          if (s.stage === "rejected") return;
          const existing = byTalent.get(s.talentId);
          if (!existing || +new Date(s.createdAt) > +new Date(existing.s.createdAt)) {
            const r = rolesById[s.roleId];
            byTalent.set(s.talentId, {
              s,
              role: r,
              proj: r ? projsById[r.projectId] : undefined,
            });
          }
        });

        const list: Convo[] = [...byTalent.values()].map(({ s, role, proj }) => ({
          id: s.talentId,
          name: s.talentName,
          photo: s.talentPhoto,
          lastMessage: s.proMessage || s.inviteMessage || `Active on ${role?.name ?? "your role"}`,
          lastAt: timeShort(s.decidedAt ?? s.createdAt),
          projectTitle: proj?.title,
          roleName: role?.name,
        }));
        setConvos(list);
        setLoading(false);
        return;
      }

      if (userId) {
        const data = await getConversations(userId);
        if (data.length > 0) {
          setConvos(
            data.map((c: any) => {
              const other =
                c.participant_a === userId
                  ? c.participant_b_profile
                  : c.participant_a_profile;
              return {
                id: c.id,
                name: other?.name || "Unknown",
                photo: other?.photo_url || "",
                lastMessage: c.last_message || "",
                lastAt: c.last_at
                  ? new Date(c.last_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : "",
              };
            })
          );
        } else {
          setConvos(MOCK_CONVOS);
        }
      } else {
        setConvos(MOCK_CONVOS);
      }
      setLoading(false);
    }
    init();
  }, [userId, withId, isPro]);

  return (
    <div className="min-h-dvh">
      <Header title={t("msg.title")} />

      {isPro && (
        <div className="mx-4 mt-3 p-2.5 rounded-xl bg-bg-elevated border border-border flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-gold shrink-0 mt-0.5" />
          <p className="text-[11px] text-text-muted leading-relaxed">
            Only talents tied to your active projects can message you. Cold DMs are blocked.
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-3 px-4 pt-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-bg-elevated border border-border animate-pulse">
              <div className="w-12 h-12 rounded-full bg-bg-muted shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-bg-muted rounded w-1/3" />
                <div className="h-2 bg-bg-muted rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : convos.length === 0 ? (
        isPro ? (
          <EmptyState
            icon={MessageCircle}
            tone="plum"
            title={t("msg.empty")}
            description={t("msg.emptyDesc")}
            ctaLabel={t("nav.projects")}
            ctaHref="/pro/projects"
          />
        ) : (
          <EmptyState
            icon={MessageCircle}
            tone="plum"
            title={t("msg.empty")}
            description={t("msg.emptyDesc")}
            ctaLabel={t("disc.title")}
            ctaHref="/discover"
          />
        )
      ) : (
        <div className="px-4 pt-4 space-y-2">
          {convos.map((c, i) => (
            <motion.button
              key={c.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => router.push(`/messages/${c.id}`)}
              className="w-full flex items-center gap-3 p-3 rounded-2xl bg-bg-elevated border border-border text-left"
            >
              {c.photo ? (
                <img src={c.photo} alt={c.name} className="w-12 h-12 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-bg-muted shrink-0 grid place-items-center text-text-muted text-lg font-display">
                  {c.name[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm truncate">{c.name}</span>
                  <span className="text-[10px] text-text-subtle shrink-0">{c.lastAt}</span>
                </div>
                {c.projectTitle && c.roleName && (
                  <div className="flex items-center gap-1 text-[10px] text-gold mt-0.5">
                    <FolderOpen className="w-2.5 h-2.5" />
                    <span className="truncate">{c.projectTitle} · {c.roleName}</span>
                  </div>
                )}
                <p className="text-xs text-text-muted truncate mt-0.5">{c.lastMessage}</p>
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}
