"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Send } from "lucide-react";
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
  const { t } = useT();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [otherName, setOtherName] = useState("Chat");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const data = await getMessages(id);
      if (data.length > 0) {
        setMsgs(data as Msg[]);
        const other = data.find((m: any) => m.sender_id !== userId);
        if (other?.sender?.name) setOtherName(other.sender.name);
      } else {
        setMsgs(MOCK_MSGS);
      }
    }
    load();

    const channel = supabase
      .channel(`messages:${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        (payload) => {
          setMsgs((prev) => [...prev, payload.new as Msg]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  async function send() {
    if (!text.trim() || loading) return;
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
      await sendMessage(id, userId, t);
    }
    setLoading(false);
  }

  function fmt(iso: string) {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="flex flex-col min-h-dvh">
      <Header back title={otherName} />

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
                    ? "bg-gold text-bg rounded-br-md"
                    : "bg-bg-elevated border border-border rounded-bl-md"
                )}
              >
                {m.text}
                <div className={cn("text-[10px] mt-1", isMe ? "text-bg/60" : "text-text-subtle")}>
                  {fmt(m.sent_at)}
                </div>
              </div>
            </motion.div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-border glass">
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
            className="w-11 h-11 rounded-full bg-gold text-bg grid place-items-center disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
