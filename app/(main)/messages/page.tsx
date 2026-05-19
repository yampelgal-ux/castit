"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { EmptyState } from "@/components/EmptyState";
import { useStore } from "@/lib/store";
import { getConversations, getOrCreateConversation } from "@/lib/db";
import { TALENTS } from "@/lib/mock-data";

type Convo = {
  id: string;
  name: string;
  photo: string;
  lastMessage: string;
  lastAt: string;
};

const MOCK_CONVOS: Convo[] = TALENTS.slice(0, 3).map((t) => ({
  id: t.id,
  name: t.name,
  photo: t.photo,
  lastMessage: "Hey, saw your reel — amazing work!",
  lastAt: "10:24",
}));

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
  const [convos, setConvos] = useState<Convo[]>([]);
  const [loading, setLoading] = useState(true);

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
  }, [userId, withId]);

  return (
    <div className="min-h-dvh">
      <Header title="Messages" />

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
        <EmptyState
          icon={MessageCircle}
          tone="plum"
          title="No messages yet"
          description="Tap Message on a talent's profile to start a conversation."
          ctaLabel="Find talents"
          ctaHref="/discover"
        />
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
                <p className="text-xs text-text-muted truncate mt-0.5">{c.lastMessage}</p>
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}
