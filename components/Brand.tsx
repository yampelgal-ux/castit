import { cn } from "@/lib/utils";
import { LogoMark } from "./LogoMark";

export function Brand({ className, size = "md", mark = true }: { className?: string; size?: "sm" | "md" | "lg" | "xl"; mark?: boolean }) {
  const sizes = { sm: "text-xl", md: "text-3xl", lg: "text-5xl", xl: "text-7xl" };
  const marks = { sm: 26, md: 38, lg: 58, xl: 84 };
  return (
    <span className={cn("inline-flex items-center gap-2 font-display font-bold tracking-tight leading-none", sizes[size], className)} dir="ltr">
      {mark && <LogoMark size={marks[size]} />}
      <span>
        Cast<span className="ms-[0.06em] px-[0.14em] rounded-[0.18em] bg-hi text-on-hi">It</span>
      </span>
    </span>
  );
}
