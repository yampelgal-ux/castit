// Server-only: how Aria reaches Claude.
// 1. ANTHROPIC_API_KEY set  -> straight to the Anthropic API.
// 2. Otherwise, on Vercel   -> through Vercel AI Gateway, signed in with the
//    deployment's own OIDC token (no key to create or paste; usage is billed
//    to the Vercel account, which includes a free monthly AI credit).
import Anthropic from '@anthropic-ai/sdk'
import { getVercelOidcToken } from '@vercel/oidc'

const GATEWAY_URL = 'https://ai-gateway.vercel.sh'

// Anthropic model ids -> AI Gateway model ids.
const GATEWAY_MODELS: Record<string, string> = {
  'claude-opus-5-5': 'anthropic/claude-opus-5.5',
  'claude-sonnet-4-5-20250929': 'anthropic/claude-sonnet-4.5',
  'claude-haiku-4-5-20251001': 'anthropic/claude-haiku-4.5',
}

function directKey(): string | null {
  const k = process.env.ANTHROPIC_API_KEY
  return k && !k.startsWith('YOUR_') ? k : null
}

export type AriaClient = { client: Anthropic; model: (id: string) => string; via: 'anthropic' | 'gateway' }

/** A ready Claude client, or null when Aria has no way to reach Claude. Call inside a request handler. */
export async function getAriaClient(): Promise<AriaClient | null> {
  const key = directKey()
  if (key) return { client: new Anthropic({ apiKey: key }), model: (id) => id, via: 'anthropic' }
  const gwKey = process.env.AI_GATEWAY_API_KEY
  let token: string | undefined = gwKey || undefined
  if (!token && process.env.VERCEL) {
    try { token = await getVercelOidcToken() } catch { token = undefined }
  }
  if (!token) return null
  return {
    client: new Anthropic({ apiKey: token, baseURL: GATEWAY_URL }),
    model: (id) => GATEWAY_MODELS[id] ?? (id.includes('/') ? id : `anthropic/${id}`),
    via: 'gateway',
  }
}

let gatewayCheck: { at: number; ok: boolean } | null = null

/** Is Aria usable right now? For the gateway, checks (cached 10 min) that the account has AI credit. */
export async function ariaReady(): Promise<{ ready: boolean; via?: string; reason?: string }> {
  if (directKey()) return { ready: true, via: 'anthropic' }
  const aria = await getAriaClient()
  if (!aria) return { ready: false, reason: 'no-credentials' }
  if (gatewayCheck && Date.now() - gatewayCheck.at < 10 * 60_000) return { ready: gatewayCheck.ok, via: 'gateway' }
  let ok = false
  let reason: string | undefined
  try {
    const token = (aria.client as unknown as { apiKey: string }).apiKey
    const res = await fetch(`${GATEWAY_URL}/v1/credits`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: AbortSignal.timeout(5000) })
    if (res.ok) {
      const d = (await res.json()) as { balance?: string | number }
      ok = Number(d.balance ?? 0) > 0
      if (!ok) reason = 'no-credit'
    } else reason = `gateway-${res.status}`
  } catch (e) { reason = e instanceof Error ? e.message : 'gateway-error' }
  gatewayCheck = { at: Date.now(), ok }
  return { ready: ok, via: 'gateway', reason }
}
