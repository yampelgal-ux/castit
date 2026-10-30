"use client";
import { useParams } from "next/navigation";
import { Header } from "@/components/Header";
import { OpenCallView } from "@/components/OpenCallView";
import { useT } from "@/lib/i18n";

export default function OpenAuditionPage() {
  const { id } = useParams<{ id: string }>();
  const { lang } = useT();
  return (
    <div className="min-h-dvh bg-bg">
      <Header back title={lang === "he" ? "אודישן פתוח" : "Open audition"} />
      <OpenCallView code={id} board />
    </div>
  );
}
