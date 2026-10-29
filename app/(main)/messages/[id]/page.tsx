"use client";
import { DEMO_MODE, isRealUserId } from "@/lib/cloud/config";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Send, MoreHorizontal, Ban } from "lucide-react";
import { UserActionsSheet } from "@/components/UserActionsSheet";
import { useHiddenUsers } from "@/lib/cloud/safety";
import { useCanContactTalent } from "@/lib/cloud/trust";
import { NotApprovedNotice } from "@/components/TrustBanners";
import { Header } from "@/components/Header";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { getMessages, sendMessage } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type Msg = {
  id: string;
  sender_id: string;
  text: string;
  sent_at: string;
  sender?: { name: string; photo_url: string };
};

const MOCK_MSGS: Msg[] = [
  { id: "1", sender_id: "other", text: "Hey! Saw your latest reel — that monologue was incredible 🔥", sent_at: new Date(Date.now() - 60000 * 5).toISOString() },
  { id: "2", sender_id: "me", text: "Thank you so much! Been working on that scene for weeks 😅", sent_at: new Date(Date.now() - 60000 * 4).toISOString() },
  { id: "3", sender_id: "other", text: "It shows. Are you available for a callback next Tuesday?", sent_at: new Date(Date.now() - 60000 * 2).toISOString() },
];

export default function ConversationPage() {
  const { id } = useParams<{ id: string }>();
  const { userId, profile } = useStore();
  const { t, lang } = useT();
  const he = lang === "he";
  const router = useRouter();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [otherName, setOtherName] = useState(he ? "שיחה" : "Chat");
  const [otherId, setOtherId] = useState<string | null>(null);
  const [showActions, setShowActions] = useState(false);
  const [sendFailed, setSendFailed] = useState(false);
  const hidden = useHiddenUsers();
  const blocked = !!otherId && hidden.has(otherId);
  const can = useCanContactTalent();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Who the other person is, even before they've written anything.
  useEffect(() => {
    if (!userId || !isRealUserId(id)) return;
    supabase
      .from("conversations")
      .select("participant_a,participant_b,a:profiles!conversations_participant_a_fkey(name,username),b:profiles!conversations_participant_b_fkey(name,username)")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }: { data: any }) => {
        if (!data) return;
        const mineIsA = data.participant_a === userId;
        setOtherId(mineIsA ? data.participant_b : data.participant_a);
        const p = mineIsA ? data.b : data.a;
        if (p?.name || p?.username) setOtherName(p.name || `@${p.username}`);
      });
  }, [id, userId]);

  useEffect(() => {
    async function load() {
      const data = await getMessages(id);
      if (data.length > 0) {
        setMsgs(data as Msg[]);
        const other = data.find((m: any) => m.sender_id !== userId);
        if (other?.sender?.name) setOtherName(other.sender.name);
      } else {
        setMsgs(DEMO_MODE ? MOCK_MSGS : []);
      }
    }
    load();

    const channel = supabase
      .channel(`messages:${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        (payload) => {
          const m = payload.new as Msg;
          setMsgs((prev) => {
            if (prev.some((x) => x.id === m.id)) return prev;
            // My own message comes back from the server: replace its optimistic copy.
            const opt = prev.findIndex((x) => x.id.startsWith("opt-") && x.sender_id === m.sender_id && x.text === m.text);
            if (opt >= 0) { const next = [...prev]; next[opt] = m; return next; }
            return [...prev, m];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  async function send() {
    if (!text.trim() || loading || blocked) return;
    setSendFailed(false);
    const t = text.trim();
    setText("");
    setLoading(true);

    const optimistic: Msg = {
      id: `opt-${Date.now()}`,
      sender_id: userId ?? "me",
      text: t,
      sent_at: new Date().toISOString(),
    };
    setMsgs((prev) => [...prev, optimistic]);

    if (userId) {
      const { error } = await sendMessage(id, userId, t);
      if (error) {
        setMsgs((prev) => prev.filter((m) => m.id !== optimistic.id));
        setText(t);
        setSendFailed(true);
      }
    }
    setLoading(false);
  }

  function fmt(iso: string) {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="flex flex-col min-h-dvh">
      <Header back title={otherName} right={otherId ? (
        <button onClick={() => setShowActions(true)} aria-label={he ? "אפשרויות" : "Options"}
          className="w-10 h-10 rounded-full grid place-items-center text-text-muted hover:text-text">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      ) : undefined} />
      {showActions && otherId && (
        <UserActionsSheet userId={otherId} name={otherName} reportKind="message" targetId={id}
          onBlocked={() => router.replace("/messages")} onClose={() => setShowActions(false)} />
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {msgs.map((m) => {
          const isMe = m.sender_id === userId || m.sender_id === "me";
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn("flex", isMe ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-snug",
                  isMe
                    ? "bg-gold text-on-accent rounded-br-md"
                    : "bg-bg-elevated border border-border rounded-bl-md"
                )}
              >
                {m.text}
                <div className={cn("text-[0.6875rem] mt-1", isMe ? "text-on-accent/60" : "text-text-subtle")}>
                  {fmt(m.sent_at)}
                </div>
              </div>
            </motion.div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {!can.ok ? (
        <div className="p-3 border-t border-border"><NotApprovedNotice /></div>
      ) : blocked ? (
        <div className="p-4 border-t border-border glass text-center text-sm text-text-muted flex items-center justify-center gap-2">
          <Ban className="w-4 h-4" aria-hidden /> {he ? "אי אפשר לשלוח הודעות בשיחה הזו." : "You can't send messages in this conversation."}
        </div>
      ) : (
      <div className="p-3 border-t border-border glass">
        {sendFailed && (
          <p className="text-xs text-terra px-2 pb-2" role="alert">{he ? "ההודעה לא נשלחה. נסו שוב." : "Message not sent. Try again."}</p>
        )}
        <form
          onSubmit={(e) => { e.preventDefault(); send(); }}
          className="flex items-center gap-2"
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("msg.placeholder")}
            className="flex-1 h-11 px-4 rounded-full bg-bg-elevated border border-border outline-none text-sm placeholder:text-text-subtle"
          />
          <button
            type="submit"
            disabled={!text.trim() || loading}
            className="w-11 h-11 rounded-full bg-gold text-on-accent grid place-items-center disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
      )}
    </div>
  );
}
