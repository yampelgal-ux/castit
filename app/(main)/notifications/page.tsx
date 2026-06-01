"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, FileVideo, Sparkles, ThumbsUp, MessageCircle, Heart, Briefcase,
  Star, Megaphone, Calendar, PauseCircle, XCircle, Award,
} from "lucide-react";
import { Header } from "@/components/Header";
import { EmptyState } from "@/components/EmptyState";
import {
  loadNotifications, markRead, markAllRead,
  type AppNotification, type NotifKind,
} from "@/lib/notifications-store";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const ICON: Record<NotifKind, typeof Bell> = {
  invite:       Megaphone,
  tape_in:      FileVideo,
  callback:     Sparkles,
  hold:         PauseCircle,
  avail_check:  Calendar,
  offered:      Briefcase,
  booked:       Award,
  rejected:     XCircle,
  vote:         ThumbsUp,
  message:      MessageCircle,
  like:         Heart,
  comment:      MessageCircle,
  casting:      Star,
  application:  Briefcase,
};

const COLOR: Record<NotifKind, string> = {
  invite:       "bg-gold/15 text-gold",
  tape_in:      "bg-gold/15 text-gold",
  callback:     "bg-success/15 text-success",
  hold:         "bg-amber/15 text-amber",
  avail_check:  "bg-plum/15 text-plum-light",
  offered:      "bg-violet/15 text-violet",
  booked:       "bg-success/15 text-success",
  rejected:     "bg-danger/10 text-danger",
  vote:         "bg-plum/15 text-plum-light",
  message:      "bg-gold/15 text-gold",
  like:         "bg-danger/10 text-danger",
  comment:      "bg-violet/15 text-violet",
  casting:      "bg-gold/15 text-gold",
  application:  "bg-success/15 text-success",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - +new Date(iso);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function NotificationsPage() {
  const role = useStore((s) => s.profile.role);
  const audience = role === "Casting Pro" ? "pro" : "talent";
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const { t } = useT();

  function reload() { setNotifs(loadNotifications(audience)); }

  useEffect(() => {
    reload();
    if (typeof window === "undefined") return;
    function onChange() { reload(); }
    window.addEventListener("castit:notifications-changed", onChange);
    return () => window.removeEventListener("castit:notifications-changed", onChange);
  }, [audience]);

  const unread = notifs.filter((n) => !n.read).length;

  function handleClick(n: AppNotification) {
    if (!n.read) markRead(n.id);
  }

  return (
    <div className="min-h-dvh bg-bg pb-24">
      <Header
        title={
          <span className="inline-flex items-center gap-2">
            <Bell className="w-4 h-4 text-gold" />
            <span className="font-display text-lg">{t("notif.title")}</span>
            {unread > 0 && (
              <span className="text-[10px] tnum bg-danger text-white rounded-full px-1.5 h-4 grid place-items-center">
                {unread}
              </span>
            )}
          </span>
        }
        right={
          unread > 0 ? (
            <button
              onClick={() => { markAllRead(audience); reload(); }}
              className="text-[11px] text-gold font-semibold"
            >
              {t("common.markAllRead")}
            </button>
          ) : null
        }
      />

      <div className="px-4 pt-3">
        {notifs.length === 0 ? (
          <EmptyState
            icon={Bell}
            tone="gold"
            title={t("notif.empty")}
            description={t("notif.emptyDesc")}
          />
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {notifs.map((n, i) => {
                const Icon = ICON[n.kind] ?? Bell;
                const colorCls = COLOR[n.kind] ?? "bg-bg text-text-muted";
                const body = (
                  <div className="flex items-start gap-3 p-3">
                    <div className={cn("w-9 h-9 rounded-xl grid place-items-center shrink-0", colorCls)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold leading-snug">{n.title}</div>
                      <div className="text-[11px] text-text-muted mt-0.5 leading-relaxed line-clamp-2">{n.body}</div>
                      <div className="text-[10px] text-text-subtle mt-1 tnum">{timeAgo(n.createdAt)}</div>
                    </div>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-gold shrink-0 mt-2" />
                    )}
                  </div>
                );

                return (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className={cn(
                      "rounded-2xl border overflow-hidden",
                      n.read ? "bg-bg-elevated border-border" : "bg-gold/5 border-gold/30"
                    )}
                  >
                    {n.href ? (
                      <Link href={n.href} onClick={() => handleClick(n)}>{body}</Link>
                    ) : (
                      <button onClick={() => handleClick(n)} className="w-full text-right">{body}</button>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
