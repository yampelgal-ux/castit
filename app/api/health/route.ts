// Health check + keep-alive. A daily Vercel cron (vercel.json) calls this so
// the free Supabase project sees activity and is never paused for inactivity.
// Also handy to check by hand: /api/health shows whether the database answers.
export const dynamic = 'force-dynamic'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return Response.json({ ok: true, database: 'not-configured' })
  const started = Date.now()
  try {
    const res = await fetch(`${url}/rest/v1/profiles?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
    const ms = Date.now() - started
    if (!res.ok) return Response.json({ ok: false, database: 'error', status: res.status, ms }, { status: 503 })
    return Response.json({ ok: true, database: 'up', ms })
  } catch (e) {
    return Response.json({ ok: false, database: 'unreachable', error: e instanceof Error ? e.message : String(e) }, { status: 503 })
  }
}
