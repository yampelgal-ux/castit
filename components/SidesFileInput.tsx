"use client";
import { useRef, useState } from "react";
import { Upload, FileText, X, Download, Loader2 } from "lucide-react";
import { saveSidesFile, deleteSidesFile, downloadSidesFile, newSidesKey } from "@/lib/sides-storage";
import type { RoleSidesFile } from "@/lib/projects-store";

// Format file size for display
function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

const MAX_SIZE = 20 * 1024 * 1024; // 20MB

type Props = {
  // The role id is used to namespace the IDB key
  roleId: string;
  value?: RoleSidesFile;
  onChange: (file: RoleSidesFile | undefined) => void;
};

// Used in the pro-side create/edit role forms.
export function SidesFileInput({ roleId, value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    if (file.size > MAX_SIZE) {
      setError(`הקובץ גדול מדי (מקסימום ${fmtSize(MAX_SIZE)})`);
      return;
    }
    setUploading(true);
    try {
      // Remove previous file if exists
      if (value?.blobKey) {
        await deleteSidesFile(value.blobKey).catch(() => {});
      }
      const blobKey = newSidesKey(roleId);
      await saveSidesFile(blobKey, file);
      onChange({
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        blobKey,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    if (value?.blobKey) {
      await deleteSidesFile(value.blobKey).catch(() => {});
    }
    onChange(undefined);
  }

  if (value) {
    return (
      <div className="rounded-2xl bg-bg border border-border p-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gold/15 text-gold grid place-items-center shrink-0">
          <FileText className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold truncate">{value.name}</div>
          <div className="text-[10px] text-text-muted tnum">{fmtSize(value.size)}</div>
        </div>
        <button
          type="button"
          onClick={() => downloadSidesFile(value.blobKey, value.name)}
          className="w-8 h-8 rounded-full hover:bg-bg-elevated grid place-items-center text-text-muted"
          aria-label="הורד"
        >
          <Download className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleRemove}
          className="w-8 h-8 rounded-full hover:bg-bg-elevated grid place-items-center text-danger"
          aria-label="הסר"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full h-14 rounded-2xl bg-bg border border-dashed border-border hover:border-gold/40 flex items-center justify-center gap-2 text-xs text-text-muted disabled:opacity-50"
      >
        {uploading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> מעלה...</>
        ) : (
          <><Upload className="w-4 h-4 text-gold" /> העלה PDF / DOC / TXT</>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      {error && (
        <div className="text-[11px] text-danger mt-1">{error}</div>
      )}
    </>
  );
}

// Compact read-only viewer for talents — shows download button only
export function SidesFileViewer({ file }: { file: RoleSidesFile }) {
  return (
    <button
      type="button"
      onClick={() => downloadSidesFile(file.blobKey, file.name)}
      className="w-full rounded-2xl bg-gold/10 border border-gold/30 p-3 flex items-center gap-3 text-right active:scale-[0.99] transition-transform"
    >
      <div className="w-10 h-10 rounded-xl bg-gold/20 text-gold grid place-items-center shrink-0">
        <FileText className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-widest text-gold font-semibold">סיידס מצורף</div>
        <div className="text-xs font-semibold truncate">{file.name}</div>
        <div className="text-[10px] text-text-muted tnum">{fmtSize(file.size)} · לחץ להורדה</div>
      </div>
      <Download className="w-4 h-4 text-gold shrink-0" />
    </button>
  );
}
