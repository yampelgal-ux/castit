import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'

const BodySchema = z.object({
  text: z.string().min(3).max(20_000).optional(),
  imageBase64: z.string().min(100).max(8_000_000).optional(),
  imageMediaType: z.enum(['image/jpeg', 'image/png', 'image/webp']).optional(),
  mode: z.enum(['full', 'quick']).default('full'),
}).refine((b) => !!b.text || !!b.imageBase64, {
  message: 'Provide either text or an image',
})

const PARSE_TOOL: Anthropic.Tool = {
  name: 'set_roles',
  description: 'Parse a casting breakdown into a list of distinct roles to fill. One role per character/type to cast.',
  input_schema: {
    type: 'object',
    properties: {
      roles: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Role/character name (e.g. "Maya — Lead", "Background — Bartender"). Keep short.',
            },
            description: {
              type: 'string',
              description: 'Character brief: age, gender, traits, languages, requirements. 1-3 sentences.',
            },
            sides: {
              type: 'string',
              description: 'Optional scene text or self-tape direction if provided in the breakdown. Empty if not.',
            },
            payRange: {
              type: 'string',
              description: 'Pay/rate if mentioned. Empty if not.',
            },
            shootDates: {
              type: 'string',
              description: 'Shoot dates if mentioned. Empty if not.',
            },
          },
          required: ['name', 'description'],
        },
      },
    },
    required: ['roles'],
  },
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = rateLimit(`parse-breakdown:${ip}`, { max: 10, windowMs: 60_000 })
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
    // Demo fallback: split text by blank lines as crude role-per-paragraph parse
    if (body.text) {
      const blocks = body.text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean)
      return Response.json({
        roles: blocks.map((b, i) => {
          const firstLine = b.split('\n')[0].slice(0, 60)
          return {
            name: firstLine || `Role ${i + 1}`,
            description: b.length > 60 ? b.slice(0, 500) : firstLine,
          }
        }),
      })
    }
    return Response.json(
      { error: 'AI parsing requires ANTHROPIC_API_KEY' },
      { status: 503 }
    )
  }

  const client = new Anthropic({ apiKey })
  const userContent: Anthropic.ContentBlockParam[] = []

  const guidance = body.mode === 'quick'
    ? 'This is a QUICK CAST breakdown (extras, models, background, day-players). Roles tend to be type-based ("Bartender, male 30s"), often grouped. Create ONE role per distinct type — do not multiply by quantity.'
    : 'This is a PRINCIPAL CASTING breakdown. Each named character is one role. Include all named roles (leads, supporting, day players).'

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
      text: `${guidance} Extract every role from the image via set_roles. Preserve original language. Skip headers, page numbers, and production notes.`,
    })
  } else {
    userContent.push({
      type: 'text',
      text: `${guidance} Parse this casting breakdown via set_roles. Preserve original language:\n\n${body.text}`,
    })
  }

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      tools: [PARSE_TOOL],
      tool_choice: { type: 'tool', name: 'set_roles' },
      messages: [{ role: 'user', content: userContent }],
    })

    const toolUse = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    )
    if (!toolUse) {
      return Response.json({ error: 'Could not parse breakdown' }, { status: 500 })
    }
    return Response.json(toolUse.input)
  } catch (err) {
    console.error('parse-breakdown error:', err)
    return Response.json(
      { error: 'Breakdown parsing failed. Try clearer text or a sharper image.' },
      { status: 502 }
    )
  }
}
