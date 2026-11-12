// Tells the app whether Aria (the Claude API key) is set up, so screens can
// hide Aria buttons until it is.
export const dynamic = 'force-dynamic'

export function GET() {
  const key = process.env.ANTHROPIC_API_KEY
  return Response.json({ ready: !!key && !key.startsWith('YOUR_') })
}
