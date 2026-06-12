'use client'

import { supabase } from './supabase'
import {
  TALENTS, REELS, CASTINGS, DAILY_TASKS, STARS_OF_WEEK,
  type Talent, type ReelPost, type Casting,
} from './mock-data'

// ── Minimal row types matching supabase-schema.sql ────────────────────────
// Source of truth: the CREATE TABLE statements in /supabase-schema.sql.
// Update both files together when changing columns.

export type ProfileRow = {
  id: string
  username: string
  name: string | null
  bio: string | null
  photo_url: string | null
  cover_url: string | null
  role: string | null
  verified: boolean | null
  followers: number | null
  likes: number | null
  created_at?: string
}

export type ConversationRow = {
  id: string
  participant_a: string
  participant_b: string
  last_message: string | null
  last_at: string
  participant_a_profile?: ProfileRow | null
  participant_b_profile?: ProfileRow | null
}

export type MessageRow = {
  id: string
  conversation_id: string
  sender_id: string
  text: string
  sent_at: string
  sender?: Pick<ProfileRow, 'username' | 'name' | 'photo_url'> | null
}

export type NotificationRow = {
  id: string
  profile_id: string
  type: string | null
  title: string | null
  body: string | null
  read: boolean
  created_at: string
}

const configured = () =>
  typeof process !== 'undefined' &&
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('YOUR_')

// ── Reels ─────────────────────────────────────────────────────────────────

export async function getReels(): Promise<ReelPost[]> {
  if (!configured()) return REELS
  const { data } = await supabase
    .from('reels')
    .select('*, profiles(*)')
    .order('created_at', { ascending: false })
  if (!data?.length) return REELS
  return data.map((r) => ({
    id: r.id,
    talentId: r.profile_id,
    videoUrl: r.video_url,
    poster: r.poster_url || '',
    caption: r.caption || '',
    likes: r.likes ?? 0,
    comments: r.comments ?? 0,
    shares: r.shares ?? 0,
  }))
}

// ── Talents / Profiles ────────────────────────────────────────────────────

export async function getTalents(): Promise<Talent[]> {
  if (!configured()) return TALENTS
  const { data } = await supabase
    .from('profiles')
    .select('*, typecasts(*)')
    .limit(20)
  if (!data?.length) return TALENTS
  return data.map((p) => {
    const tc = p.typecasts?.[0] ?? {}
    return {
      id: p.id,
      username: p.username,
      name: p.name || p.username,
      verified: p.verified ?? false,
      photo: p.photo_url || '',
      cover: p.cover_url || '',
      bio: p.bio || '',
      followers: p.followers ?? 0,
      likes: p.likes ?? 0,
      submissions: 0,
      typecast: {
        heightCm: tc.height ?? 175,
        weightKg: tc.weight ?? 65,
        ageRange: [tc.age_range?.split('-')[0] ?? 20, tc.age_range?.split('-')[1] ?? 35] as [number, number],
        gender: tc.gender ?? 'Female',
        ethnicity: '',
        skinTone: tc.skin_tone ?? '#EBC8A7',
        eyeColor: tc.eye_color ?? '#6B8E4E',
        hairColor: tc.hair_color ?? '#3B2A1E',
        hairLength: tc.hair_length ?? 'Medium',
        languages: tc.languages ?? ['English'],
        skills: tc.skills ?? [],
        genres: tc.genres ?? [],
      },
    }
  })
}

export async function getProfileById(id: string): Promise<ProfileRow | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()
  return (data as ProfileRow | null) ?? null
}

export async function updateProfile(id: string, updates: {
  name?: string; bio?: string; photo_url?: string; cover_url?: string
}) {
  const { error } = await supabase.from('profiles').update(updates).eq('id', id)
  return { error }
}

// ── Castings ──────────────────────────────────────────────────────────────

export async function getCastings(): Promise<Casting[]> {
  if (!configured()) return CASTINGS
  const { data } = await supabase
    .from('castings')
    .select('*')
    .order('created_at', { ascending: false })
  if (!data?.length) return CASTINGS
  return data.map((c) => ({
    id: c.id,
    title: c.title,
    studio: c.studio || '',
    studioLogo: '',
    type: c.type || 'Feature Film',
    location: c.location || '',
    paid: c.paid ?? true,
    deadline: c.deadline || '',
    description: c.description || '',
    requirements: {},
    applicants: 0,
  }))
}

export async function applyToCasting(castingId: string, profileId: string, message: string) {
  const { error } = await supabase.from('applications').upsert({
    casting_id: castingId,
    profile_id: profileId,
    message,
  }, { onConflict: 'profile_id,casting_id' })
  return { error }
}

export async function getMyApplications(profileId: string): Promise<string[]> {
  if (!configured()) return []
  const { data } = await supabase
    .from('applications')
    .select('casting_id')
    .eq('profile_id', profileId)
  return data?.map((a) => a.casting_id) ?? []
}

// ── Reel uploads ──────────────────────────────────────────────────────────

export async function uploadReel(
  file: File,
  profileId: string,
  caption: string
): Promise<{ url: string | null; error: string | null }> {
  if (!configured()) {
    // Local-only preview fallback when Supabase isn't wired
    return { url: URL.createObjectURL(file), error: null }
  }
  const ext = file.name.split('.').pop() || 'mp4'
  const path = `${profileId}/${Date.now()}.${ext}`

  const { error: upErr } = await supabase.storage
    .from('reels')
    .upload(path, file, { contentType: file.type, upsert: false })
  if (upErr) return { url: null, error: upErr.message }

  const { data: pub } = supabase.storage.from('reels').getPublicUrl(path)
  const url = pub.publicUrl

  const { error: insErr } = await supabase.from('reels').insert({
    profile_id: profileId,
    video_url: url,
    caption,
  })
  if (insErr) return { url, error: insErr.message }
  return { url, error: null }
}

// ── DM / Messages ─────────────────────────────────────────────────────────

export async function getConversations(profileId: string): Promise<ConversationRow[]> {
  if (!configured()) return []
  const { data } = await supabase
    .from('conversations')
    .select('*, participant_a_profile:profiles!conversations_participant_a_fkey(*), participant_b_profile:profiles!conversations_participant_b_fkey(*)')
    .or(`participant_a.eq.${profileId},participant_b.eq.${profileId}`)
    .order('last_at', { ascending: false })
  return (data as ConversationRow[] | null) ?? []
}

export async function getOrCreateConversation(myId: string, otherId: string) {
  const a = myId < otherId ? myId : otherId
  const b = myId < otherId ? otherId : myId
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('participant_a', a)
    .eq('participant_b', b)
    .single()
  if (existing) return existing.id as string
  const { data, error } = await supabase
    .from('conversations')
    .insert({ participant_a: a, participant_b: b })
    .select('id')
    .single()
  if (error) throw error
  return data.id as string
}

export async function getMessages(conversationId: string): Promise<MessageRow[]> {
  const { data } = await supabase
    .from('messages')
    .select('*, sender:profiles(username, name, photo_url)')
    .eq('conversation_id', conversationId)
    .order('sent_at', { ascending: true })
  return (data as MessageRow[] | null) ?? []
}

export async function sendMessage(conversationId: string, senderId: string, text: string) {
  const { error } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_id: senderId,
    text,
  })
  if (!error) {
    await supabase
      .from('conversations')
      .update({ last_message: text, last_at: new Date().toISOString() })
      .eq('id', conversationId)
  }
  return { error }
}

// ── Notifications ─────────────────────────────────────────────────────────

export async function getNotifications(profileId: string): Promise<NotificationRow[]> {
  if (!configured()) return []
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(50)
  return (data as NotificationRow[] | null) ?? []
}

export async function markAllRead(profileId: string) {
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('profile_id', profileId)
    .eq('read', false)
}

export async function getUnreadCount(profileId: string): Promise<number> {
  if (!configured()) return 0
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', profileId)
    .eq('read', false)
  return count ?? 0
}
