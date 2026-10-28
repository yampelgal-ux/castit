"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { saveTapeVideo, deleteTapeVideo, newTapeKey } from "@/lib/tape-storage";

// The talent's own showreels / portfolio videos.
// Metadata lives in a castit_* key (synced to the account); the video itself
// goes to IndexedDB on this device and to cloud Storage (same path as tapes),
// so it survives reloads and opens on other devices.

export type MyReel = {
  id: string;
  blobKey: string;
  caption: string;
  createdAt: number;
  sizeBytes: number;
};

type ReelsState = {
  reels: MyReel[];
  add: (file: Blob, caption: string) => Promise<MyReel>;
  remove: (id: string) => Promise<void>;
  rename: (id: string, caption: string) => void;
};

export const MAX_REEL_BYTES = 200 * 1024 * 1024;

export const useMyReels = create<ReelsState>()(
  persist(
    (set, get) => ({
      reels: [],
      add: async (file, caption) => {
        const id = `reel_${Date.now().toString(36)}`;
        const blobKey = newTapeKey(id);
        await saveTapeVideo(blobKey, file);
        const reel: MyReel = { id, blobKey, caption, createdAt: Date.now(), sizeBytes: file.size };
        set({ reels: [reel, ...get().reels] });
        return reel;
      },
      remove: async (id) => {
        const r = get().reels.find((x) => x.id === id);
        set({ reels: get().reels.filter((x) => x.id !== id) });
        if (r) { try { await deleteTapeVideo(r.blobKey); } catch {} }
      },
      rename: (id, caption) => set({ reels: get().reels.map((r) => (r.id === id ? { ...r, caption } : r)) }),
    }),
    { name: "castit_my_reels_v1", storage: createJSONStorage(() => localStorage) }
  )
);
