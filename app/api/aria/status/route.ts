// Tells the app whether Aria can reach Claude (direct key or Vercel AI Gateway),
// so screens can hide Aria buttons until it can.
import { ariaReady } from '@/lib/aria-client'

export const dynamic = 'force-dynamic'

export async function GET() {
  return Response.json(await ariaReady())
}
