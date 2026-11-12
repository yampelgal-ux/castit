"use client";
import { useParams } from "next/navigation";
import { Brand } from "@/components/Brand";
import { LanguageToggle } from "@/components/LanguageToggle";
import { OpenCallView } from "@/components/OpenCallView";

// An actor opens this from a casting director's WhatsApp message.
export default function JoinPage() {
  const { code } = useParams<{ code: string }>();
  return (
    <div className="min-h-dvh bg-bg px-6 pt-6 pb-16">
      <div className="flex items-center justify-between">
        <Brand size="md" />
        <LanguageToggle />
      </div>
      <OpenCallView code={code} />
    </div>
  );
}
