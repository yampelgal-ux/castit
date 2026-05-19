"use client";

export function haptic(pattern: "light" | "medium" | "heavy" | "success" | "error" = "light") {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  const map = {
    light: 10,
    medium: 25,
    heavy: 50,
    success: [15, 40, 15],
    error: [40, 60, 40],
  } as const;
  navigator.vibrate(map[pattern] as number | number[]);
}
