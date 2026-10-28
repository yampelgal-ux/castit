"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { saveTapeVideo, deleteTapeVideo, newTapeKey, loadTapeVideo } from "@/lib/tape-storage";
import { uploadMedia, removeMedia } from "@/lib/cloud/media";
import { deleteReelSocial } from "@/lib/cloud/social";
import { DEMO_MODE } from "@/lib/cloud/config";

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
  /** True once the video is in cloud Storage (visible to others). */
  cloud?: boolean;
};

type ReelsState = {
  reels: MyReel[];
  add: (file: Blob, caption: string) => Promise<MyReel>;
  remove: (id: string) => Promise<void>;
  rename: (id: string, caption: string) => void;
  /** Try the cloud upload again for a video that only lives on this device. */
  retry: (id: string) => Promise<boolean>;
  /** Upload every video that hasn't reached the cloud yet (runs after sign-in). */
  retryAll: () => Promise<void>;
};

// Supabase Storage on the free plan accepts files up to 50MB.
export const MAX_REEL_BYTES = (DEMO_MODE ? 200 : 50) * 1024 * 1024;

export const useMyReels = create<ReelsState>()(
  persist(
    (set, get) => ({
      reels: [],
      add: async (file, caption) => {
        const id = `reel_${Date.now().toString(36)}`;
        const blobKey = newTapeKey(id);
        const where = await saveTapeVideo(blobKey, file);
        const reel: MyReel = { id, blobKey, caption, createdAt: Date.now(), sizeBytes: file.size, cloud: where === "cloud" };
        set({ reels: [reel, ...get().reels] });
        return reel;
      },
      remove: async (id) => {
        const r = get().reels.find((x) => x.id === id);
        set({ reels: get().reels.filter((x) => x.id !== id) });
        if (!r) return;
        try { await deleteTapeVideo(r.blobKey); } catch {}
        if (r.cloud) { void removeMedia(`tapes/${r.blobKey}`); void deleteReelSocial(r.id); }
      },
      retry: async (id) => {
        const r = get().reels.find((x) => x.id === id);
        if (!r) return false;
        const blob = await loadTapeVideo(r.blobKey);
        if (!blob) return false;
        const url = await uploadMedia(`tapes/${r.blobKey}`, blob);
        if (!url) return false;
        set({ reels: get().reels.map((x) => (x.id === id ? { ...x, cloud: true } : x)) });
        return true;
      },
      retryAll: async () => {
        for (const r of get().reels.filter((x) => !x.cloud)) {
          try { await get().retry(r.id); } catch {}
        }
      },
      rename: (id, caption) => set({ reels: get().reels.map((r) => (r.id === id ? { ...r, caption } : r)) }),
    }),
    { name: "castit_my_reels_v1", storage: createJSONStorage(() => localStorage) }
  )
);
