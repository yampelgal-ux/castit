"use client";
import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Image as ImageIcon } from "lucide-react";
import { useT } from "@/lib/i18n";

type Props = {
  // The visual to render — typically the current photo / placeholder
  children: React.ReactNode;
  // Fires once the user picks a file (either from camera or gallery)
  onPick: (file: File) => void;
  // Pass-through to the inputs. Default: "image/*".
  // For profile photos use "user" capture (selfie cam); for general use "environment".
  accept?: string;
  cameraFacing?: "user" | "environment";
  className?: string;
  // Optional title for the sheet
  title?: string;
};

// Tap anywhere on `children` → small sheet pops up with Camera / Gallery.
// Works on iOS Safari + Android Chrome via the `capture` attribute.
export function PhotoPicker({
  children,
  onPick,
  accept = "image/*",
  cameraFacing = "user",
  className,
  title,
}: Props) {
  const { t } = useT();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);

  function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) onPick(f);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
      >
        {children}
      </button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 grid place-items-end max-w-[440px] mx-auto">
            <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              className="relative w-full bg-bg-elevated border-t border-border rounded-t-3xl p-5 pb-[max(2rem,env(safe-area-inset-bottom))]"
            >
              <div className="w-12 h-1 rounded-full bg-border mx-auto mb-4" />
              <h3 className="font-display text-lg mb-4 text-center">{title ?? t("picker.title")}</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => cameraRef.current?.click()}
                  className="rounded-2xl bg-gold/15 border border-gold/30 p-5 flex flex-col items-center gap-2 active:scale-95 transition-transform"
                >
                  <Camera className="w-7 h-7 text-gold" />
                  <span className="text-sm font-semibold">{t("picker.camera")}</span>
                  <span className="text-[10px] text-text-muted">{t("picker.cameraSub")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => galleryRef.current?.click()}
                  className="rounded-2xl bg-plum/10 border border-plum/30 p-5 flex flex-col items-center gap-2 active:scale-95 transition-transform"
                >
                  <ImageIcon className="w-7 h-7 text-plum-light" />
                  <span className="text-sm font-semibold">{t("picker.gallery")}</span>
                  <span className="text-[10px] text-text-muted">{t("picker.gallerySub")}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Camera — capture attribute opens phone camera directly */}
      <input
        ref={cameraRef}
        type="file"
        accept={accept}
        capture={cameraFacing}
        onChange={handle}
        className="hidden"
      />
      {/* Gallery / Files — no capture, opens native picker */}
      <input
        ref={galleryRef}
        type="file"
        accept={accept}
        onChange={handle}
        className="hidden"
      />
    </>
  );
}
