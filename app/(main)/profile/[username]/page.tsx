"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Share2, MessageCircle, Languages, Ruler, Globe, X, Camera, Check, Flame, Eye, Lock, Send } from "lucide-react";
import { SendAuditionSheet } from "@/components/SendAuditionSheet";
import { TalentNotes } from "@/components/TalentNotes";
import { ProProfileView } from "@/components/ProProfileView";
import { TALENTS, REELS } from "@/lib/mock-data";
import { Header } from "@/components/Header";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { TypecastBadge } from "@/components/TypecastBadge";
import { useStore } from "@/lib/store";
import { updateProfile } from "@/lib/db";
import { ProfileProgress } from "@/components/ProfileProgress";
import { cn, formatNumber } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { nameOf, SKIN_TONES, EYE_COLORS, HAIR_COLORS } from "@/lib/typecast-palette";

const TABS = ["Reels", "Headshots", "Typecast"] as const;

// Mock profile viewers for "Who viewed you" feature
const MOCK_VIEWERS = [
  { name: "Sarah K.", role: "Casting Director", photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&q=80&auto=format&fit=crop" },
  { name: "James M.", role: "Talent Agent", photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&q=80&auto=format&fit=crop" },
  { name: "Noa B.", role: "Production Co.", photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&q=80&auto=format&fit=crop" },
];

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const router = useRouter();
  const { profile: myProfile, userId, setProfile, streak } = useStore();
  const isMe = username === "me";

  // Pro looking at their own profile (or another pro) → distinct industry-focused view
  if (isMe && myProfile.role === "Casting Pro") {
    return (
      <ProProfileView
        isMe={true}
        displayName={myProfile.name || "You"}
        photoUrl={myProfile.photoUrl}
        bio={myProfile.bio}
      />
    );
  }
  const talent = isMe
    ? {
        id: "me",
        username: myProfile.username || "you",
        name: myProfile.name || "You",
        verified: true,
        photo: myProfile.photoUrl || "",
        cover: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=1200",
        bio: myProfile.bio || "Welcome to your profile.",
        followers: 0,
        likes: 0,
        submissions: 0,
        typecast: {
          heightCm: myProfile.typecast.heightCm ?? 175,
          weightKg: myProfile.typecast.weightKg ?? 65,
          ageRange: [myProfile.typecast.ageRangeMin ?? 20, myProfile.typecast.ageRangeMax ?? 35] as [number, number],
          gender: (myProfile.typecast.gender ?? "Female") as any,
          ethnicity: "—",
          skinTone: myProfile.typecast.skinTone ?? "#EBC8A7",
          eyeColor: myProfile.typecast.eyeColor ?? "#6B8E4E",
          hairColor: myProfile.typecast.hairColor ?? "#3B2A1E",
          hairLength: (myProfile.typecast.hairLength ?? "Medium") as any,
          languages: myProfile.typecast.languages ?? ["English"],
          skills: myProfile.typecast.skills ?? [],
          genres: myProfile.typecast.genres ?? [],
        },
      }
    : TALENTS.find((t) => t.username === username) ?? TALENTS[0];

  const [tab, setTab] = useState<typeof TABS[number]>("Reels");
  const [showEdit, setShowEdit] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const isPro = myProfile.role === "Casting Pro";
  const myReels = REELS.filter((r) => r.talentId === talent.id);

  function handleMessage() {
    router.push(`/messages?with=${talent.id}&name=${encodeURIComponent(talent.name)}`);
  }

  return (
    <div>
      <Header
        back={!isMe}
        title={`@${talent.username}`}
        right={isMe ? <Settings className="w-5 h-5 text-text-muted" /> : <Share2 className="w-5 h-5 text-text-muted" />}
        transparent
      />

      {/* Cover + Avatar */}
      <div className="relative">
        <div className="h-40 relative">
          <img src={talent.cover} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-bg" />
        </div>
        <div className="px-5 -mt-12 relative">
          <div className="flex items-end gap-3">
            {talent.photo ? (
              <img src={talent.photo} alt={talent.name} className="w-24 h-24 rounded-full object-cover border-4 border-bg" />
            ) : (
              <div className="w-24 h-24 rounded-full border-4 border-bg bg-bg-elevated grid place-items-center font-display text-3xl text-gold">
                {(talent.name || "?").split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center gap-1.5">
            <h1 className="font-display text-2xl">{talent.name}</h1>
            {talent.verified && <VerifiedBadge />}
            {isMe && streak > 0 && (
              <div className="ml-1 flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30">
                <Flame className="w-3 h-3 text-orange-400" />
                <span className="text-[10px] font-bold text-orange-400 tnum">{streak}</span>
              </div>
            )}
          </div>
          <p className="text-sm text-text-muted mt-1 leading-relaxed">{talent.bio}</p>

          <div className="flex items-center gap-6 mt-4">
            <Stat label="Followers" value={formatNumber(talent.followers)} />
            <Stat label="Likes" value={formatNumber(talent.likes)} />
            <Stat label="Submissions" value={String(talent.submissions)} />
            {isMe && <Stat label="Day Streak" value={`${streak} 🔥`} />}
          </div>

          {isMe && (
            <div className="mt-5">
              <ProfileProgress
                profile={{
                  name: talent.name,
                  bio: talent.bio,
                  photo: talent.photo,
                  cover: talent.cover,
                  typecast: talent.typecast as any,
                }}
                action={
                  <button onClick={() => setShowEdit(true)} className="text-[11px] text-gold font-semibold">
                    Complete →
                  </button>
                }
              />
            </div>
          )}

          {/* Who viewed you */}
          {isMe && (
            <div className="mt-4 rounded-2xl bg-bg-elevated border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-gold" />
                  <span className="text-xs font-semibold text-gold">Who viewed you</span>
                </div>
                <span className="text-[10px] text-text-muted tnum">12 this week</span>
              </div>
              <div className="flex items-center gap-2">
                {MOCK_VIEWERS.map((v, i) => (
                  <div key={i} className={cn("flex-1 flex flex-col items-center gap-1", i === 2 && "relative")}>
                    <div className="relative">
                      <img
                        src={v.photo}
                        alt={v.name}
                        className={cn(
                          "w-12 h-12 rounded-full object-cover border-2 border-border",
                          i === 2 && "blur-sm"
                        )}
                      />
                      {i === 2 && (
                        <div className="absolute inset-0 rounded-full grid place-items-center">
                          <Lock className="w-4 h-4 text-white drop-shadow" />
                        </div>
                      )}
                    </div>
                    {i < 2 && (
                      <>
                        <span className="text-[10px] font-medium truncate w-full text-center">{v.name}</span>
                        <span className="text-[9px] text-text-muted truncate w-full text-center">{v.role}</span>
                      </>
                    )}
                  </div>
                ))}
                <div className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-full bg-bg border-2 border-dashed border-border grid place-items-center">
                    <span className="text-xs font-bold text-text-muted">+9</span>
                  </div>
                </div>
              </div>
              <button className="mt-3 w-full h-9 rounded-xl border border-gold/30 text-gold text-xs font-semibold bg-gold/5">
                Upgrade to see all viewers
              </button>
            </div>
          )}

          <div className="flex gap-2 mt-4">
            {isMe ? (
              <>
                <button
                  onClick={() => setShowEdit(true)}
                  className="flex-1 h-11 rounded-full bg-bg-elevated border border-border text-sm font-semibold"
                >
                  Edit profile
                </button>
                <button
                  onClick={() => router.push("/saved")}
                  className="h-11 px-4 rounded-full bg-bg-elevated border border-border text-sm font-semibold"
                >
                  Saved
                </button>
                <button
                  onClick={() => router.push("/calendar")}
                  className="h-11 px-4 rounded-full bg-bg-elevated border border-border text-sm font-semibold"
                >
                  Calendar
                </button>
              </>
            ) : isPro ? (
              <>
                <button
                  onClick={() => setShowInvite(true)}
                  className="flex-1 h-11 rounded-full bg-gold text-bg text-sm font-semibold inline-flex items-center justify-center gap-1.5"
                >
                  <Send className="w-4 h-4" /> Send audition
                </button>
                <button
                  onClick={handleMessage}
                  className="h-11 px-4 rounded-full bg-bg-elevated border border-border text-sm font-semibold inline-flex items-center gap-1.5"
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <button className="flex-1 h-11 rounded-full bg-gold text-bg text-sm font-semibold">Follow</button>
                <button
                  onClick={handleMessage}
                  className="h-11 px-4 rounded-full bg-bg-elevated border border-border text-sm font-semibold inline-flex items-center gap-1.5"
                >
                  <MessageCircle className="w-4 h-4" /> Message
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 px-5">
        <div className="flex gap-1 border-b border-border">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 h-10 text-xs font-semibold uppercase tracking-wider border-b-2 -mb-px transition-colors",
                tab === t ? "border-gold text-gold" : "border-transparent text-text-muted"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="px-5 pt-4 pb-8"
        >
          {tab === "Reels" && (
            <div className="grid grid-cols-3 gap-1">
              {(myReels.length ? myReels : REELS.slice(0, 6)).map((r) => (
                <div key={r.id} className="aspect-[3/4] rounded-md overflow-hidden bg-bg-elevated relative">
                  <img src={r.poster} alt="" className="w-full h-full object-cover" />
                  <div className="absolute bottom-1 left-1 text-[10px] text-white font-semibold drop-shadow tnum">▶ {formatNumber(r.likes)}</div>
                </div>
              ))}
            </div>
          )}
          {tab === "Headshots" && (
            <div className="grid grid-cols-2 gap-2">
              {[talent.photo, talent.cover, talent.photo, talent.cover].map((src, i) => (
                <div key={i} className="aspect-[3/4] rounded-2xl overflow-hidden bg-bg-elevated">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
          {tab === "Typecast" && <TypecastCard talent={talent} />}
        </motion.div>
      </AnimatePresence>

      {showEdit && (
        <EditProfileModal
          talent={talent}
          onClose={() => setShowEdit(false)}
          onSave={(updates) => {
            setProfile(updates);
            setShowEdit(false);
          }}
          userId={userId}
        />
      )}

      <SendAuditionSheet
        open={showInvite}
        onClose={() => setShowInvite(false)}
        talent={{ id: talent.id, name: talent.name, photo: talent.photo }}
      />

      {/* Optional pro-only notes panel — appears on talent profile when viewed by a pro */}
      {isPro && !isMe && (
        <div className="px-5 pb-6 pt-2">
          <TalentNotes talentId={talent.id} talentName={talent.name} />
        </div>
      )}
    </div>
  );
}

function EditProfileModal({
  talent, onClose, onSave, userId,
}: {
  talent: any; onClose: () => void; onSave: (u: any) => void; userId: string | null;
}) {
  const [name, setName] = useState(talent.name);
  const [bio, setBio] = useState(talent.bio);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    if (loading) return;
    setLoading(true);
    if (userId) await updateProfile(userId, { name, bio });
    setSaved(true);
    setTimeout(() => onSave({ name, bio }), 900);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm px-4 pb-6">
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-[440px] bg-bg-elevated border border-border rounded-3xl p-6 space-y-5"
      >
        {saved ? (
          <div className="flex flex-col items-center py-6 gap-3">
            <div className="w-14 h-14 rounded-full bg-success/15 grid place-items-center">
              <Check className="w-7 h-7 text-success" strokeWidth={2.5} />
            </div>
            <p className="font-display text-xl">Profile updated!</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl">Edit profile</h2>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-bg grid place-items-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <img src={talent.photo} alt="" className="w-20 h-20 rounded-full object-cover" />
                <button className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-gold text-bg grid place-items-center shadow">
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-text-muted">Tap to change photo</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-text-muted uppercase tracking-wider">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5 w-full h-12 px-4 rounded-2xl bg-bg border border-border outline-none text-sm focus:border-gold/50 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-text-muted uppercase tracking-wider">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="mt-1.5 w-full px-4 py-3 rounded-2xl bg-bg border border-border outline-none text-sm resize-none focus:border-gold/50 transition-colors"
                />
              </div>
            </div>

            <button
              onClick={save}
              disabled={loading}
              className="w-full h-12 rounded-2xl bg-gold text-bg font-semibold disabled:opacity-60"
            >
              {loading ? "Saving…" : "Save changes"}
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-display text-xl tnum">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-text-muted">{label}</div>
    </div>
  );
}

function TypecastCard({ talent }: { talent: any }) {
  const tc = talent.typecast;
  return (
    <div className="rounded-3xl p-6 bg-gradient-to-br from-bg-elevated to-bg border border-border">
      <div className="flex items-center justify-between mb-5">
        <div className="text-[10px] uppercase tracking-widest text-gold">Typecast Card</div>
        <div className="text-[10px] text-text-muted tnum">@{talent.username}</div>
      </div>
      <div className="grid grid-cols-2 gap-y-5">
        <Field icon={Ruler} label="Height" value={`${tc.heightCm} cm`} />
        <Field icon={Ruler} label="Weight" value={`${tc.weightKg} kg`} />
        <Field icon={Globe} label="Gender" value={tc.gender} />
        <Field icon={Globe} label="Age range" value={`${tc.ageRange[0]}–${tc.ageRange[1]}`} />
        <ColorField label="Skin" color={tc.skinTone} paletteName={nameOf(SKIN_TONES, tc.skinTone)} />
        <ColorField label="Eyes" color={tc.eyeColor} paletteName={nameOf(EYE_COLORS, tc.eyeColor)} />
        <ColorField label="Hair" color={tc.hairColor} paletteName={nameOf(HAIR_COLORS, tc.hairColor)} />
        <Field icon={Languages} label="Hair length" value={tc.hairLength} />
      </div>
      <div className="mt-6 pt-5 border-t border-border">
        <div className="text-[10px] uppercase tracking-widest text-text-muted mb-2">Languages</div>
        <div className="flex flex-wrap gap-1.5">
          {tc.languages.map((l: string) => <TypecastBadge key={l}>{l}</TypecastBadge>)}
        </div>
      </div>
      {tc.skills?.length > 0 && (
        <div className="mt-5">
          <div className="text-[10px] uppercase tracking-widest text-text-muted mb-2">Skills</div>
          <div className="flex flex-wrap gap-1.5">
            {tc.skills.map((s: string) => <TypecastBadge key={s}>{s}</TypecastBadge>)}
          </div>
        </div>
      )}
      {tc.genres?.length > 0 && (
        <div className="mt-5">
          <div className="text-[10px] uppercase tracking-widest text-text-muted mb-2">Genres</div>
          <div className="flex flex-wrap gap-1.5">
            {tc.genres.map((g: string) => <TypecastBadge key={g}>{g}</TypecastBadge>)}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-text-muted mb-1 flex items-center gap-1">
        <Icon className="w-2.5 h-2.5" /> {label}
      </div>
      <div className="font-display text-lg leading-none">{value}</div>
    </div>
  );
}

function ColorField({ label, color, paletteName }: { label: string; color: string; paletteName: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-text-muted mb-1.5">{label}</div>
      <div className="flex items-center gap-2">
        <span
          className="w-6 h-6 rounded-full border border-white/10 shadow-[inset_-2px_-3px_5px_rgba(0,0,0,0.3),inset_2px_2px_4px_rgba(255,255,255,0.12)]"
          style={{ background: color }}
        />
        <span className="text-xs text-text font-medium">{paletteName}</span>
      </div>
    </div>
  );
}
