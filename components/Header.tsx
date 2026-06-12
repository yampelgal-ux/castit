"use client";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useT } from "@/lib/i18n";

export function Header({
  title,
  back,
  right,
  transparent,
}: {
  title?: React.ReactNode;
  back?: boolean;
  right?: React.ReactNode;
  transparent?: boolean;
}) {
  const router = useRouter();
  const { t } = useT();
  return (
    <header
      className={`sticky top-0 z-40 px-4 h-14 flex items-center justify-between ${
        transparent ? "" : "glass border-b border-border"
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {back && (
          <button
            onClick={() => router.back()}
            className="-ml-2 p-2 rounded-full hover:bg-bg-elevated"
            aria-label={t("header.back")}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <h1 className="font-display text-lg truncate">{title}</h1>
      </div>
      <div className="flex items-center gap-2">{right}</div>
    </header>
  );
}
