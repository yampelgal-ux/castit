import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'

// A casting director just listed a role on the open auditions board: tell the
// actors whose card matches it. open_call_push_targets() checks the caller owns
// the call and is approved, and only answers once per call.

export const runtime = 'nodejs'
export const maxDuration = 60

const BodySchema = z.object({
  code: z.string().regex(/^[A-Za-z0-9_-]{4,40}$/),
  role: z.string().max(80).optional(),
  project: z.string().max(80).optional(),
})

type Target = { endpoint: string; p256dh: string; auth: string; lang: string; sender_name: string }

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!url || !anon || !pub || !priv) return new Response(null, { status: 204 })

  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return Response.json({ error: 'unauthorized' }, { status: 401 })

  const parsed = BodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: 'bad request' }, { status: 400 })
  const { code, role, project } = parsed.data

  const sb = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: user } = await sb.auth.getUser(token)
  if (!user.user) return Response.json({ error: 'unauthorized' }, { status: 401 })
  if (!rateLimit(`push-open:${user.user.id}`, { max: 10, windowMs: 60 * 60_000 }).ok) {
    return Response.json({ error: 'slow down' }, { status: 429 })
  }

  const { data, error } = await sb.rpc('open_call_push_targets', { p_code: code })
  const targets = (data ?? []) as Target[]
  if (error || !targets.length) return Response.json({ sent: 0 })

  const host = req.headers.get('host') ?? 'castit.app'
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || `https://${host}`, pub, priv)
  const href = `/auditions/${code}`

  let sent = 0
  for (let i = 0; i < targets.length; i += 50) {
    await Promise.all(targets.slice(i, i + 50).map(async (t) => {
      const he = t.lang !== 'en'
      const what = [role, project].filter(Boolean).join(he ? ' · ' : ' · ')
      const payload = JSON.stringify({
        title: he ? 'אודישן פתוח חדש שמתאים לך' : 'A new open audition fits you',
        body: what ? `${what}${t.sender_name ? ` (${t.sender_name})` : ''}` : (t.sender_name || (he ? 'פתחו להגשה עכשיו' : 'Open to apply now')),
        href,
        tag: `open:${code}`,
      })
      try {
        await webpush.sendNotification({ endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } }, payload, { TTL: 60 * 60 * 24 })
        sent++
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) await sb.rpc('drop_push_endpoint', { p_endpoint: t.endpoint })
      }
    }))
  }
  return Response.json({ sent })
}
