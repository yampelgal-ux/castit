import { cn } from "@/lib/utils";
import { LogoMark } from "./LogoMark";

export function Brand({ className, size = "md", mark = true }: { className?: string; size?: "sm" | "md" | "lg" | "xl"; mark?: boolean }) {
  const sizes = { sm: "text-xl", md: "text-3xl", lg: "text-5xl", xl: "text-6xl" };
  const marks = { sm: 26, md: 38, lg: 58, xl: 72 };
  return (
    <span className={cn("inline-flex items-center gap-[0.3em] whitespace-nowrap font-display font-bold tracking-tight leading-none", sizes[size], className)} dir="ltr">
      {mark && <LogoMark size={marks[size]} />}
      <span>
        Cast<span className="ms-[0.06em] px-[0.12em] pb-[0.04em] rounded-[0.16em] bg-hi text-on-hi">It</span>
      </span>
    </span>
  );
}
