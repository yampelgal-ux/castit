"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// App preferences: accessibility, reminders and notifications.
// Stored under a castit_* key, so the cloud sync carries them to every device.

export type TextSize = "normal" | "large" | "xlarge";

type Settings = {
  textSize: TextSize;
  reduceMotion: boolean;
  highContrast: boolean;
  /** Remind about a self-tape deadline this many hours before it closes. */
  deadlineReminderHours: number;
  /** Remind about a scheduled audition / callback this many hours before. */
  eventReminderHours: number;
  remindDeadlines: boolean;
  remindEvents: boolean;
  /** Show a system notification (when the browser allows it), not only in-app. */
  systemNotifications: boolean;
  set: (patch: Partial<Omit<Settings, "set">>) => void;
};

export const useSettings = create<Settings>()(
  persist(
    (set) => ({
      textSize: "normal",
      reduceMotion: false,
      highContrast: false,
      deadlineReminderHours: 24,
      eventReminderHours: 2,
      remindDeadlines: true,
      remindEvents: true,
      systemNotifications: false,
      set: (patch) => set(patch),
    }),
    { name: "castit_settings_v1", storage: createJSONStorage(() => localStorage) }
  )
);
