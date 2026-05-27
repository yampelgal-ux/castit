// Scene + take metadata persistence (localStorage)
// Audio blobs live separately in IndexedDB — see coach-recordings.ts

export type ScriptLine = {
  character: string;
  text: string;
  direction?: string;
};

export type VoiceProfile =
  | "man" | "woman" | "boy" | "girl"
  | "old_man" | "old_woman"
  | "teen_male" | "teen_female";

export type Tone =
  | "neutral" | "excited" | "happy" | "sad" | "scared"
  | "worried" | "angry" | "tender" | "sarcastic"
  | "tense" | "flirtatious" | "cold";

export type Intensity = "subtle" | "moderate" | "strong";

export type SavedScene = {
  id: string;
  title: string;
  summary?: string;
  characters: string[];
  lines: ScriptLine[];
  // Last-used configuration — restored on revisit
  yourCharacter?: string;
  partnerVoice?: VoiceProfile;
  partnerTone?: Tone;
  intensity?: Intensity;
  context?: string;
  createdAt: string;
  lastPracticedAt?: string;
};

export type Take = {
  id: string;
  sceneId: string;
  recordedAt: string;
  durationMs: number;
  yourCharacter: string;
  partnerVoice: VoiceProfile;
  partnerTone: Tone;
  intensity: Intensity;
  // Audio blob stored in IndexedDB under same id
  audioMime: string; // e.g. "audio/webm" or "audio/mp4"
};

const SCENES_KEY = "castit_coach_scenes_v1";
const TAKES_KEY = "castit_coach_takes_v1";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, val: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(val));
  } catch {
    // Silently ignore quota errors — caller decides UX
  }
}

// ─── Scenes ────────────────────────────────────────────
export function loadScenes(): SavedScene[] {
  return readJson<SavedScene[]>(SCENES_KEY, []);
}

export function getScene(id: string): SavedScene | undefined {
  return loadScenes().find((s) => s.id === id);
}

export function upsertScene(s: SavedScene): SavedScene {
  const all = loadScenes();
  const existing = all.findIndex((x) => x.id === s.id);
  if (existing >= 0) all[existing] = s;
  else all.unshift(s);
  writeJson(SCENES_KEY, all);
  return s;
}

export function touchScenePracticed(id: string): void {
  const all = loadScenes();
  const idx = all.findIndex((s) => s.id === id);
  if (idx < 0) return;
  all[idx] = { ...all[idx], lastPracticedAt: new Date().toISOString() };
  writeJson(SCENES_KEY, all);
}

export function deleteScene(id: string): void {
  const all = loadScenes().filter((s) => s.id !== id);
  writeJson(SCENES_KEY, all);
  // Cascade: remove takes
  const takes = loadTakes().filter((t) => t.sceneId !== id);
  writeJson(TAKES_KEY, takes);
}

// ─── Takes ─────────────────────────────────────────────
export function loadTakes(): Take[] {
  return readJson<Take[]>(TAKES_KEY, []);
}

export function takesForScene(sceneId: string): Take[] {
  return loadTakes()
    .filter((t) => t.sceneId === sceneId)
    .sort((a, b) => +new Date(b.recordedAt) - +new Date(a.recordedAt));
}

export function addTake(t: Take): void {
  const all = loadTakes();
  all.unshift(t);
  writeJson(TAKES_KEY, all);
}

export function deleteTake(id: string): void {
  const all = loadTakes().filter((t) => t.id !== id);
  writeJson(TAKES_KEY, all);
}

export function countTakes(sceneId: string): number {
  return loadTakes().filter((t) => t.sceneId === sceneId).length;
}

export function newId(prefix = ""): string {
  return prefix + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
