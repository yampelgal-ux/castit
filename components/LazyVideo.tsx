"use client";
import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  poster?: string;
  className?: string;
  muted?: boolean;
  loop?: boolean;
  rootMargin?: string;
};

export function LazyVideo({
  src, poster, className, muted = true, loop = true, rootMargin = "200px",
}: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting;
        setInView(visible);
        if (visible) {
          el.play().catch(() => {});
        } else {
          el.pause();
        }
      },
      { rootMargin, threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);

  return (
    <video
      ref={ref}
      poster={poster}
      muted={muted}
      loop={loop}
      playsInline
      preload="metadata"
      className={className}
    >
      {inView && <source src={src} type="video/mp4" />}
    </video>
  );
}
