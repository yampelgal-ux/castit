/** CastIt app mark: a yellow video camera with a white lens and a REC dot on black. */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" className={className} aria-hidden="true">
      <rect width="512" height="512" rx="120" fill="#0B0B0B" />
      <rect x="84" y="164" width="252" height="184" rx="44" fill="#FFD43B" />
      <path d="M356 228 L418 190 C428 184 440 191 440 203 V309 C440 321 428 328 418 322 L356 284 Z" fill="#FFFFFF" />
      <circle cx="146" cy="222" r="22" fill="#0B0B0B" />
      <circle cx="146" cy="222" r="10" fill="#FF3B30" />
      <rect x="196" y="300" width="104" height="16" rx="8" fill="#0B0B0B" opacity="0.18" />
    </svg>
  );
}
