"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Heart, MessageCircle, Briefcase, Star, Bell } from "lucide-react";
import { Header } from "@/components/Header";
import { EmptyState } from "@/components/EmptyState";
import { useStore } from "@/lib/store";
import { getNotifications, markAllRead } from "@/lib/db";
import { cn } from "@/lib/utils";

type Notif = {
  id: string;
  type: "like" | "comment" | "application" | "message" | "casting";
  title: string;
  body: string;
  read: boolean;
  created_at: string;
};

const MOCK_NOTIFS: Notif[] = [
  { id: "1", type: "like", title: "Maya Levi liked your reel", body: "Monologue from 'A Streetcar Named Desire'", read: false, created_at: new Date(Date.now() - 60000 * 3).toISOString() },
  { id: "2", type: "casting", title: "New casting match", body: "Lead Female — 'After the Rain' fits your typecast 94%", read: false, created_at: new Date(Date.now() - 60000 * 30).toISOString() },
  { id: "3", type: "message", title: "Daniel Cohen sent you a message", body: "Hey, saw your latest reel — that monologue was incredible 🔥", read: false, created_at: new Date(Date.now() - 60000 * 60).toISOString() },
  { id: "4", type: "application", title: "Application update", body: "Northwind Pictures reviewed your submission", read: true, created_at: new Date(Date.now() - 60000 * 60 * 5).toISOString() },
  { id: "5", type: "like", title: "Shiran Mor and 12 others liked your reel", body: "Latest editorial campaign — golden hour ✨", read: true, created_at: new Date(Date.now() - 60000 * 60 * 24).toISOString() },
  { id: "6", type: "comment", title: "Noa Yadid commented", body: "\"This is so powerful, wow 😭\"", read: true, created_at: new Date(Date.now() - 60000 * 60 * 26).toISOString() },
];

const ICONS: Record<string, any> = {
  like: Heart,
  comment: MessageCircle,
  message: MessageCircle,
  application: Briefcase,
  casting: Star,
};

const COLORS: Record<string, string> = {
  like: "text-danger bg-danger/10",
  comment: "text-violet bg-violet/10",
  message: "text-gold bg-gold/10",
  application: "text-success bg-success/10",
  casting: "text-gold bg-gold/10",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationsPage() {
  const { userId, setUnreadCount } = useStore();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (userId) {
        const data = await getNotifications(userId);
        setNotifs(data.length > 0 ? (data as Notif[]) : MOCK_NOTIFS);
        await markAllRead(userId);
      } else {
        setNotifs(MOCK_NOTIFS);
      }
      setUnreadCount(0);
      setLoading(false);
    }
    load();
  }, [userId]);

  const unread = notifs.filter((n) => !n.read);
  const read = notifs.filter((n) => n.read);

  return (
    <div className="min-h-dvh">
      <Header title="Notifications" />

      {loading ? (
        <div className="flex flex-col gap-3 px-4 pt-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-bg-elevated border border-border animate-pulse">
              <div className="w-10 h-10 rounded-full bg-bg-muted shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-bg-muted rounded w-2/3" />
                <div className="h-2 bg-bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : notifs.length === 0 ? (
        <EmptyState
          icon={Bell}
          tone="gold"
          title="All caught up"
          description="When someone likes your work or a casting matches your typecast, it'll appear here."
          ctaLabel="Browse castings"
          ctaHref="/opportunities"
        />
      ) : (
        <div className="px-4 pt-4 space-y-5 pb-8">
          {unread.length > 0 && (
            <section>
              <div className="text-[10px] uppercase tracking-widest text-text-muted mb-3 px-1">New</div>
              <div className="space-y-2">
                {unread.map((n, i) => <NotifCard key={n.id} n={n} i={i} />)}
              </div>
            </section>
          )}
          {read.length > 0 && (
            <section>
              <div className="text-[10px] uppercase tracking-widest text-text-muted mb-3 px-1">Earlier</div>
              <div className="space-y-2">
                {read.map((n, i) => <NotifCard key={n.id} n={n} i={i} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function NotifCard({ n, i }: { n: Notif; i: number }) {
  const Icon = ICONS[n.type] ?? Bell;
  const color = COLORS[n.type] ?? "text-text-muted bg-bg-muted";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.04 }}
      className={cn(
        "flex items-start gap-3 p-3 rounded-2xl border transition-colors",
        n.read ? "bg-bg-elevated border-border" : "bg-bg-elevated border-gold/20 ring-1 ring-gold/10"
      )}
    >
      <div className={cn("w-10 h-10 rounded-full grid place-items-center shrink-0", color)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-snug">{n.title}</p>
        <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{n.body}</p>
        <p className="text-[10px] text-text-subtle mt-1">{timeAgo(n.created_at)}</p>
      </div>
      {!n.read && <div className="w-2 h-2 rounded-full bg-gold shrink-0 mt-1.5" />}
    </motion.div>
  );
}
