import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'

const LineSchema = z.object({
  character: z.string(),
  text: z.string(),
})

const BodySchema = z.object({
  scene: z.object({
    title: z.string(),
    summary: z.string().optional(),
    context: z.string().optional(),
    yourCharacter: z.string(),
    lines: z.array(LineSchema).min(1).max(120),
  }),
})

const HINT_TOOL: Anthropic.Tool = {
  name: 'set_acting_hints',
  description: 'For each user-character line, return a short acting hint covering intent, physicality, and a craft note. Keep each field under 12 words.',
  input_schema: {
    type: 'object',
    properties: {
      hints: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            lineIdx: { type: 'number', description: 'Original index in scene.lines (0-based).' },
            intent: { type: 'string', description: 'What the character WANTS in this beat. Verb-driven. Max 10 words.' },
            physicality: { type: 'string', description: 'Body, breath, eye-line, or proximity note. Max 12 words.' },
            note: { type: 'string', description: 'One craft tip (subtext, beat, button, pace, status). Max 14 words.' },
          },
          required: ['lineIdx', 'intent', 'physicality', 'note'],
        },
      },
    },
    required: ['hints'],
  },
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = rateLimit(`directions:${ip}`, { max: 8, windowMs: 60_000 })
  if (!rl.ok) {
    return Response.json(
      { error: 'Too many requests. Try again in a moment.' },
      { status: 429 }
    )
  }

  let body: z.infer<typeof BodySchema>
  try {
    body = BodySchema.parse(await req.json())
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Collect indices + text of user-character lines
  const userLines = body.scene.lines
    .map((l, i) => ({ idx: i, text: l.text, character: l.character }))
    .filter((l) => l.character === body.scene.yourCharacter)

  if (userLines.length === 0) {
    return Response.json({ hints: [] })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey.startsWith('YOUR_')) {
    // Demo fallback: generic hint per line
    return Response.json({
      hints: userLines.map((l) => ({
        lineIdx: l.idx,
        intent: 'Stay grounded — react truthfully.',
        physicality: 'Breath low, eye-line steady.',
        note: 'Land the button. Let it sit.',
      })),
    })
  }

  const client = new Anthropic({ apiKey })

  const scriptPreview = body.scene.lines
    .map((l, i) => `${i}. ${l.character}: ${l.text}`)
    .join('\n')

  const targets = userLines
    .map((l) => `Line ${l.idx}: "${l.text}"`)
    .join('\n')

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      tools: [HINT_TOOL],
      tool_choice: { type: 'tool', name: 'set_acting_hints' },
      system: `You are an experienced acting coach. Generate concise, actionable hints for an actor preparing to deliver specific lines in a scene. Avoid generic platitudes — be specific to the line and the scene's stakes. Match the script's language (Hebrew/English/etc).`,
      messages: [{
        role: 'user',
        content: `Scene: "${body.scene.title}"
${body.scene.summary ? `Summary: ${body.scene.summary}` : ''}
${body.scene.context ? `Context: ${body.scene.context}` : ''}
Actor plays: ${body.scene.yourCharacter}

Full script:
${scriptPreview}

For these lines (by index), return hints via set_acting_hints:
${targets}`,
      }],
    })

    const toolUse = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    )
    if (!toolUse) {
      return Response.json({ error: 'Could not generate hints' }, { status: 500 })
    }
    return Response.json(toolUse.input)
  } catch (err) {
    console.error('coach-directions error:', err)
    return Response.json({ error: 'Hint generation failed' }, { status: 502 })
  }
}
