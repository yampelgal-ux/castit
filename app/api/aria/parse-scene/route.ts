import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'

const BodySchema = z.object({
  // Either send raw text or a base64 image (jpeg/png/webp)
  text: z.string().min(3).max(20_000).optional(),
  imageBase64: z.string().min(100).max(8_000_000).optional(),
  imageMediaType: z.enum(['image/jpeg', 'image/png', 'image/webp']).optional(),
}).refine((b) => !!b.text || !!b.imageBase64, {
  message: 'Provide either text or an image',
})

const PARSE_TOOL: Anthropic.Tool = {
  name: 'set_scene',
  description: 'Convert an audition side or script into a structured dialogue. Preserve original wording.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Short title or "Untitled scene".' },
      summary: { type: 'string', description: 'One-sentence context: setting, mood, stakes.' },
      characters: {
        type: 'array',
        items: { type: 'string' },
        description: 'All characters with dialogue, ordered by appearance.',
      },
      lines: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            character: { type: 'string' },
            text: { type: 'string', description: 'Dialogue line, no stage directions.' },
            direction: { type: 'string', description: 'Optional acting direction in parentheses (e.g. "softly", "angry"). Empty if none.' },
          },
          required: ['character', 'text'],
        },
      },
    },
    required: ['title', 'characters', 'lines'],
  },
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = rateLimit(`parse-scene:${ip}`, { max: 10, windowMs: 60_000 })
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

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey.startsWith('YOUR_')) {
    // Demo fallback: parse simple "NAME: line" format from text
    if (body.text) {
      const lines = body.text.split('\n').map((l) => l.trim()).filter(Boolean)
      const parsed: { character: string; text: string }[] = []
      const chars = new Set<string>()
      for (const line of lines) {
        const m = line.match(/^([A-Za-zא-ת][A-Za-zא-ת\s]{0,30}):\s*(.+)$/)
        if (m) {
          parsed.push({ character: m[1].trim(), text: m[2].trim() })
          chars.add(m[1].trim())
        }
      }
      return Response.json({
        title: 'Untitled scene',
        summary: '',
        characters: Array.from(chars),
        lines: parsed,
      })
    }
    return Response.json({ error: 'Vision parsing requires ANTHROPIC_API_KEY' }, { status: 503 })
  }

  const client = new Anthropic({ apiKey })

  const userContent: Anthropic.ContentBlockParam[] = []
  if (body.imageBase64) {
    userContent.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: body.imageMediaType ?? 'image/jpeg',
        data: body.imageBase64,
      },
    })
    userContent.push({
      type: 'text',
      text: 'This image contains an audition side or scene script. Extract all dialogue exactly as written and structure it via the set_scene tool. Preserve original language (Hebrew/English/etc). Skip page numbers, scene headers, and stage directions that are not character actions.',
    })
  } else {
    userContent.push({
      type: 'text',
      text: `Parse the following audition side or scene into structured dialogue. Preserve original wording and language:\n\n${body.text}`,
    })
  }

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      tools: [PARSE_TOOL],
      tool_choice: { type: 'tool', name: 'set_scene' },
      messages: [{ role: 'user', content: userContent }],
    })

    const toolUse = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    )
    if (!toolUse) {
      return Response.json({ error: 'Could not parse scene' }, { status: 500 })
    }

    return Response.json(toolUse.input)
  } catch (err) {
    console.error('parse-scene error:', err)
    return Response.json(
      { error: 'Scene parsing failed. Try a clearer image or paste the text.' },
      { status: 502 }
    )
  }
}
