"use client";
import { Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export function AnimatedLike({
  active,
  onClick,
  size = 28,
  className,
}: {
  active: boolean;
  onClick: () => void;
  size?: number;
  className?: string;
}) {
  return (
    <button onClick={onClick} className={cn("relative", className)} aria-label="Like">
      <AnimatePresence mode="wait">
        <motion.span
          key={active ? "on" : "off"}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.6, opacity: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 18 }}
          className="inline-block"
        >
          <Heart
            width={size}
            height={size}
            className={active ? "fill-danger stroke-danger" : "stroke-white"}
            strokeWidth={2}
          />
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
