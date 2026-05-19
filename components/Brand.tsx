import { cn } from "@/lib/utils";

export function Brand({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" | "xl" }) {
  const sizes = { sm: "text-xl", md: "text-3xl", lg: "text-5xl", xl: "text-7xl" };
  return (
    <span className={cn("font-display tracking-tight", sizes[size], className)}>
      Cast<span className="text-gold-gradient italic">It</span>
      <span className="text-gold">.</span>
    </span>
  );
}
