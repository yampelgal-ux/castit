import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center w-4 h-4 rounded-full bg-violet text-white shadow-[0_0_0_2px_rgba(124,92,255,0.2)]",
        className
      )}
      title="Verified"
    >
      <Check className="w-2.5 h-2.5" strokeWidth={3.5} />
    </span>
  );
}
