import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'

// Sends a phone notification to another user. The caller signs in with their
// own Supabase session; push_targets() only returns the recipient's phones if
// the two already talk or share an audition and neither blocked the other.
// The text is built here from a fixed list of kinds.

export const runtime = 'nodejs'

const BodySchema = z.object({
  to: z.string().uuid(),
  kind: z.enum(['message', 'invite', 'callback', 'avail_check', 'offered', 'booked', 'tape', 'avail', 'offer', 'joined']),
  href: z.string().regex(/^\/(?!\/)[^\s]*$/).max(300).default('/'),
  text: z.string().max(400).optional(),
  role: z.string().max(80).optional(),
})

type Kind = z.infer<typeof BodySchema>['kind']

function compose(kind: Kind, he: boolean, sender: string, role: string, text: string): { title: string; body: string } {
  const who = sender || (he ? 'מישהו' : 'Someone')
  const r = role ? (he ? ` לתפקיד ${role}` : ` for ${role}`) : ''
  switch (kind) {
    case 'message': return { title: who, body: text || (he ? 'הודעה חדשה' : 'New message') }
    case 'invite': return { title: he ? 'הזמנה לאודישן' : 'Audition invite', body: he ? `${who} הזמין/ה אותך${r}` : `${who} invited you${r}` }
    case 'callback': return { title: he ? 'קיבלת קולבק!' : 'You got a callback!', body: `${who}${r}` }
    case 'avail_check': return { title: he ? 'בדיקת זמינות' : 'Availability check', body: he ? `${who} שואל/ת אם את/ה פנוי/ה${r}` : `${who} is checking your availability${r}` }
    case 'offered': return { title: he ? 'קיבלת הצעה!' : 'You got an offer!', body: `${who}${r}` }
    case 'booked': return { title: he ? 'נבחרת!' : "You're booked!", body: `${who}${r}` }
    case 'tape': return { title: he ? 'טייפ חדש' : 'New tape', body: he ? `${who} שלח/ה טייפ${r}` : `${who} sent a tape${r}` }
    case 'avail': return { title: he ? 'תשובה על זמינות' : 'Availability answer', body: he ? `${who} ענה/תה${r}` : `${who} answered${r}` }
    case 'offer': return { title: he ? 'תשובה להצעה' : 'Offer answer', body: he ? `${who} ענה/תה על ההצעה${r}` : `${who} answered your offer${r}` }
    case 'joined': return { title: he ? 'שחקן/ית הצטרף/ה מהקישור' : 'An actor joined from your link', body: `${who}${r}` }
  }
}

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
  const { to, kind, href, text, role } = parsed.data

  const sb = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: user } = await sb.auth.getUser(token)
  if (!user.user) return Response.json({ error: 'unauthorized' }, { status: 401 })
  if (!rateLimit(`push:${user.user.id}`, { max: 60, windowMs: 60_000 }).ok) {
    return Response.json({ error: 'slow down' }, { status: 429 })
  }

  const { data: targets, error } = await sb.rpc('push_targets', { p_to: to })
  if (error || !targets?.length) return new Response(null, { status: 204 })

  const host = req.headers.get('host') ?? 'castit.app'
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || `https://${host}`, pub, priv)

  await Promise.all((targets as { endpoint: string; p256dh: string; auth: string; lang: string; sender_name: string }[]).map(async (t) => {
    const { title, body } = compose(kind, t.lang !== 'en', t.sender_name, role ?? '', (text ?? '').slice(0, 140))
    const payload = JSON.stringify({ title, body, href, tag: `${kind}:${href}` })
    try {
      await webpush.sendNotification({ endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } }, payload, { TTL: 60 * 60 * 24 })
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) await sb.rpc('drop_push_endpoint', { p_endpoint: t.endpoint })
      else console.warn('[push]', status, (e as Error).message)
    }
  }))
  return new Response(null, { status: 204 })
}
