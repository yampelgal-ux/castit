"use client";
import { create } from "zustand";

// Pro-only public profile fields (visible to talents browsing a pro)
export type ProPublicCredit = {
  id: string;
  title: string;       // "After the Rain"
  year?: string;       // "2024"
  role?: string;       // "Casting Director"
};

type Profile = {
  name: string;
  email: string;
  role: "Talent" | "Casting Pro";
  username: string;
  photoUrl?: string;
  bio?: string;
  typecast: Partial<{
    heightCm: number;
    weightKg: number;
    gender: string;
    skinTone: string;
    eyeColor: string;
    hairColor: string;
    hairLength: string;
    languages: string[];
    skills: string[];
    ageRangeMin: number;
    ageRangeMax: number;
    genres: string[];
  }>;
  avatarSeed: string;
  // Pro-only public profile
  studio?: string;
  specialization?: ("Film" | "TV" | "Commercial" | "Theater" | "Music Video" | "Short Film")[];
  yearsActive?: number;
  filmography?: ProPublicCredit[];
  showBookingsCount?: boolean;
};

export type SavedSearch = {
  id: string;
  name: string;
  filters: Record<string, unknown>;
  createdAt: number;
};

type State = {
  isAuthed: boolean;
  userId: string | null;
  profile: Profile;
  likedPosts: Set<string>;
  appliedCastings: Set<string>;
  bookmarks: Set<string>;
  shortlist: Set<string>;
  unreadNotifications: number;
  onboarded: boolean;
  streak: number;
  ariaCredits: number;
  savedSearches: SavedSearch[];
  setProfile: (p: Partial<Profile>) => void;
  setTypecast: (t: Partial<Profile["typecast"]>) => void;
  toggleLike: (postId: string) => void;
  signIn: (userId?: string) => void;
  signOut: () => void;
  markApplied: (castingId: string) => void;
  toggleBookmark: (id: string) => void;
  toggleShortlist: (talentId: string) => void;
  setUnreadCount: (n: number) => void;
  completeOnboarding: () => void;
  incrementStreak: () => void;
  useAriaCredit: () => boolean;
  addAriaCredits: (n: number) => void;
  saveSearch: (name: string, filters: Record<string, unknown>) => void;
  deleteSavedSearch: (id: string) => void;
};

export const useStore = create<State>((set, get) => ({
  isAuthed: false,
  userId: null,
  profile: {
    name: "",
    email: "",
    role: "Talent",
    username: "",
    typecast: {},
    avatarSeed: "newuser",
  },
  likedPosts: new Set(),
  appliedCastings: new Set(),
  bookmarks: new Set(),
  shortlist: new Set(),
  unreadNotifications: 0,
  onboarded: false,
  streak: 14,
  ariaCredits: 20,
  savedSearches: [],
  setProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),
  setTypecast: (t) =>
    set((s) => ({ profile: { ...s.profile, typecast: { ...s.profile.typecast, ...t } } })),
  toggleLike: (postId) =>
    set((s) => {
      const next = new Set(s.likedPosts);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return { likedPosts: next };
    }),
  signIn: (userId) => set({ isAuthed: true, userId: userId ?? null }),
  signOut: () => set({ isAuthed: false, userId: null }),
  markApplied: (castingId) =>
    set((s) => {
      const next = new Set(s.appliedCastings);
      next.add(castingId);
      return { appliedCastings: next };
    }),
  toggleBookmark: (id) =>
    set((s) => {
      const next = new Set(s.bookmarks);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { bookmarks: next };
    }),
  toggleShortlist: (talentId) =>
    set((s) => {
      const next = new Set(s.shortlist);
      if (next.has(talentId)) next.delete(talentId);
      else next.add(talentId);
      return { shortlist: next };
    }),
  setUnreadCount: (n) => set({ unreadNotifications: n }),
  completeOnboarding: () => set({ onboarded: true }),
  incrementStreak: () => set((s) => ({ streak: s.streak + 1 })),
  useAriaCredit: () => {
    const { ariaCredits } = get();
    if (ariaCredits <= 0) return false;
    set({ ariaCredits: ariaCredits - 1 });
    return true;
  },
  addAriaCredits: (n) => set((s) => ({ ariaCredits: s.ariaCredits + n })),
  saveSearch: (name, filters) =>
    set((s) => ({
      savedSearches: [
        ...s.savedSearches,
        { id: crypto.randomUUID(), name, filters, createdAt: Date.now() },
      ],
    })),
  deleteSavedSearch: (id) =>
    set((s) => ({ savedSearches: s.savedSearches.filter((ss) => ss.id !== id) })),
}));
