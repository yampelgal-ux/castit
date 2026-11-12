"use client";

// Shrinks a phone video before upload so cloud storage lasts longer: redraws
// it at up to 720p on a canvas and re-records it at a modest bitrate. Runs in
// real time (a 60s video takes about 60s). Best effort: on any problem, or when
// the result isn't smaller, the original is returned unchanged.

export const MAX_REEL_SECONDS = 90;
export const MAX_TAPE_SECONDS = 5 * 60;
/** Videos smaller than this are uploaded as they are. */
const SKIP_BELOW_BYTES = 8 * 1024 * 1024;

export function videoDuration(file: Blob): Promise<number> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    const url = URL.createObjectURL(file);
    v.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(Number.isFinite(v.duration) ? v.duration : 0); };
    v.onerror = () => { URL.revokeObjectURL(url); resolve(0); };
    v.src = url;
  });
}

/** Only H.264 MP4 plays on every phone, so we only re-encode when the browser can write it. */
function h264Mime(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  const safari = /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);
  const options = ["video/mp4;codecs=avc1.42E01F,mp4a.40.2", "video/mp4;codecs=avc1,mp4a", "video/mp4;codecs=avc1", ...(safari ? ["video/mp4"] : [])];
  return options.find((m) => MediaRecorder.isTypeSupported(m)) ?? null;
}

export function canCompress(): boolean {
  return typeof window !== "undefined" && typeof MediaRecorder !== "undefined"
    && typeof HTMLCanvasElement !== "undefined" && "captureStream" in HTMLCanvasElement.prototype && !!h264Mime();
}

export async function compressVideo(
  input: Blob,
  opts: { maxHeight?: number; videoBitsPerSecond?: number; onProgress?: (p: number) => void } = {},
): Promise<Blob> {
  if (input.size < SKIP_BELOW_BYTES || !canCompress()) return input;
  try {
    const out = await reencode(input, opts.maxHeight ?? 720, opts.videoBitsPerSecond ?? 2_000_000, opts.onProgress);
    return out && out.size > 0 && out.size < input.size * 0.9 ? out : input;
  } catch (e) {
    console.warn("[compress] kept original", e);
    return input;
  }
}

async function reencode(input: Blob, maxHeight: number, bitrate: number, onProgress?: (p: number) => void): Promise<Blob | null> {
  const url = URL.createObjectURL(input);
  const video = document.createElement("video");
  video.src = url;
  video.playsInline = true;
  video.preload = "auto";
  let audioCtx: AudioContext | null = null;
  try {
    await new Promise<void>((res, rej) => {
      video.onloadedmetadata = () => res();
      video.onerror = () => rej(new Error("can't read video"));
    });
    const duration = video.duration;
    if (!Number.isFinite(duration) || duration <= 0) return null;

    // Keep the shape (portrait stays portrait); cap the short side.
    const short = Math.min(video.videoWidth, video.videoHeight);
    const scale = short > maxHeight ? maxHeight / short : 1;
    const w = Math.round((video.videoWidth * scale) / 2) * 2;
    const h = Math.round((video.videoHeight * scale) / 2) * 2;
    if (!w || !h) return null;

    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const g = canvas.getContext("2d");
    if (!g) return null;
    const stream = canvas.captureStream(30);

    // Sound goes through Web Audio into the recording, not out of the speaker.
    try {
      audioCtx = new AudioContext();
      const src = audioCtx.createMediaElementSource(video);
      const dest = audioCtx.createMediaStreamDestination();
      src.connect(dest);
      dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
      if (audioCtx.state === "suspended") await audioCtx.resume();
    } catch {
      video.muted = true; // no audio graph available: better silent than failing
    }

    const mime = h264Mime();
    if (!mime) return null;
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: bitrate, audioBitsPerSecond: 96_000 });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    const stopped = new Promise<void>((res) => { rec.onstop = () => res(); });

    let raf = 0;
    const draw = () => {
      g.drawImage(video, 0, 0, w, h);
      onProgress?.(Math.min(0.99, video.currentTime / duration));
      if (!video.ended) raf = requestAnimationFrame(draw);
    };

    rec.start(1000);
    await video.play();
    draw();
    await new Promise<void>((res, rej) => {
      video.onended = () => res();
      video.onerror = () => rej(new Error("playback failed"));
      // Safety net if the browser throttles a background tab.
      setTimeout(() => rej(new Error("too slow")), duration * 3000 + 15000);
    });
    cancelAnimationFrame(raf);
    rec.stop();
    await stopped;
    onProgress?.(1);
    return new Blob(chunks, { type: "video/mp4" });
  } finally {
    video.pause();
    video.removeAttribute("src");
    URL.revokeObjectURL(url);
    void audioCtx?.close();
  }
}
