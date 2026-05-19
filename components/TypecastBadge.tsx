import { cn } from "@/lib/utils";

export function TypecastBadge({
  children,
  color,
  className,
}: {
  children: React.ReactNode;
  color?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-bg-elevated/80 backdrop-blur text-[11px] font-medium text-text border border-border",
        className
      )}
    >
      {color && (
        <span
          className="w-2.5 h-2.5 rounded-full border border-white/20"
          style={{ background: color }}
        />
      )}
      {children}
    </span>
  );
}
