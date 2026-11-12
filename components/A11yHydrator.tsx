"use client";
import { useEffect } from "react";
import { useSettings } from "@/lib/settings-store";

// Reflects accessibility settings onto <html> so plain CSS can react to them
// (see the "Accessibility settings" block in app/globals.css).
export function A11yHydrator() {
  const textSize = useSettings((s) => s.textSize);
  const reduceMotion = useSettings((s) => s.reduceMotion);
  const highContrast = useSettings((s) => s.highContrast);

  useEffect(() => {
    const el = document.documentElement;
    el.dataset.textSize = textSize;
    el.classList.toggle("reduce-motion", reduceMotion);
    el.classList.toggle("high-contrast", highContrast);
  }, [textSize, reduceMotion, highContrast]);

  return null;
}
