"use client";
import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

type Props = {
  src: string;
  poster?: string;
  className?: string;
  muted?: boolean;
  loop?: boolean;
  rootMargin?: string;
  /** Tap the video to turn the sound on / off (feeds). */
  tapToUnmute?: boolean;
  /** Called once, after the video has been on screen and playing for 2s. */
  onView?: () => void;
};

export function LazyVideo({
  src, poster, className, muted = true, loop = true, rootMargin = "200px", tapToUnmute, onView,
}: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const [flash, setFlash] = useState(false);
  const onViewRef = useRef(onView);
  onViewRef.current = onView;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let viewTimer: ReturnType<typeof setTimeout> | null = null;
    let counted = false;

    const io = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting;
        setInView(visible);
        if (visible) {
          el.play().catch(() => {});
          if (!counted && !viewTimer) {
            viewTimer = setTimeout(() => {
              viewTimer = null;
              if (!el.paused) { counted = true; onViewRef.current?.(); }
            }, 2000);
          }
        } else {
          el.pause();
          if (viewTimer) { clearTimeout(viewTimer); viewTimer = null; }
        }
      },
      { rootMargin: "0px", threshold: 0.6 }
    );
    io.observe(el);
    return () => { io.disconnect(); if (viewTimer) clearTimeout(viewTimer); };
  }, [rootMargin]);

  function toggleSound() {
    const el = ref.current;
    if (!el) return;
    el.muted = !el.muted;
    setIsMuted(el.muted);
    if (!el.muted) el.play().catch(() => {});
    setFlash(true);
    setTimeout(() => setFlash(false), 700);
  }

  const video = (
    <video
      ref={ref}
      poster={poster || undefined}
      muted={isMuted}
      loop={loop}
      playsInline
      preload="metadata"
      className={className}
    >
      {inView && <source src={src} />}
    </video>
  );

  if (!tapToUnmute) return video;
  return (
    <>
      {video}
      <button
        type="button"
        onClick={toggleSound}
        aria-label={isMuted ? "Sound on" : "Sound off"}
        className="absolute inset-0 w-full h-full cursor-pointer"
      >
        {flash && (
          <span className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-black/50 grid place-items-center text-white">
            {isMuted ? <VolumeX className="w-7 h-7" /> : <Volume2 className="w-7 h-7" />}
          </span>
        )}
      </button>
    </>
  );
}
