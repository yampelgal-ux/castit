import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'

// Constrained vocabulary — mirrors the manual filter UI in /pro/search.
// Aria can ONLY pick values from these lists; anything else is dropped.
const GENDERS = ['Female', 'Male', 'Non-binary'] as const
const ETHNICITIES = ['Mediterranean', 'European', 'Middle Eastern', 'Mixed', 'Ashkenazi', 'Mizrahi', 'African', 'Asian', 'Latinx', 'Mixed European'] as const
const BODY_TYPES = ['Slim', 'Athletic', 'Average', 'Curvy', 'Muscular', 'Plus-size'] as const
const HAIR_LENGTHS = ['Short', 'Medium', 'Long'] as const
const VOICE_TYPES = ['Soprano', 'Mezzo', 'Alto', 'Tenor', 'Baritone', 'Bass', 'Spoken only'] as const
const UNION = ['Union', 'Non-union', 'Eligible'] as const
const LEVELS = ['Beginner', 'Emerging', 'Established', 'Veteran'] as const
const LANGUAGES = ['Hebrew', 'English', 'French', 'German', 'Russian', 'Spanish', 'Arabic', 'Italian'] as const
const ACCENTS = ['British RP', 'American Standard', 'American Southern', 'Brooklyn', 'Russian', 'German', 'Arabic', 'Spanish', 'Parisian French', 'Mizrahi'] as const
const SKILLS = ['Stage Combat', 'Krav Maga', 'Boxing', 'Horseback Riding', 'Motorcycle', 'Singing (Mezzo)', 'Improv', 'Tap Dance', 'Method Acting', 'Guitar', 'Piano', 'Yoga', 'Surfing', 'Skateboarding', 'Runway', 'Dialects'] as const
const LOCATIONS = ['Tel Aviv', 'Jerusalem', 'Haifa', 'Eilat', 'Berlin', 'London', 'NYC', 'LA'] as const

const FiltersSchema = z.object({
  gender: z.array(z.enum(GENDERS)).default([]),
  ageRange: z.tuple([z.number().min(16).max(75), z.number().min(16).max(75)]).optional(),
  heightRange: z.tuple([z.number().min(140).max(210), z.number().min(140).max(210)]).optional(),
  ethnicities: z.array(z.enum(ETHNICITIES)).default([]),
  bodyTypes: z.array(z.enum(BODY_TYPES)).default([]),
  hairLengths: z.array(z.enum(HAIR_LENGTHS)).default([]),
  languages: z.array(z.enum(LANGUAGES)).default([]),
  accents: z.array(z.enum(ACCENTS)).default([]),
  voiceTypes: z.array(z.enum(VOICE_TYPES)).default([]),
  skills: z.array(z.enum(SKILLS)).default([]),
  unionStatus: z.array(z.enum(UNION)).default([]),
  experienceLevels: z.array(z.enum(LEVELS)).default([]),
  locations: z.array(z.enum(LOCATIONS)).default([]),
  notes: z.string().max(200).optional(), // anything Aria couldn't map → shown to pro as advisory
})

const BodySchema = z.object({
  brief: z.string().min(3).max(800),
})

const PARSE_TOOL: Anthropic.Tool = {
  name: 'set_search_filters',
  description: 'Translate a casting brief into structured search filters. Only use values from the enumerated lists in the schema. If a concept does not fit, put it in `notes` instead of inventing a value.',
  input_schema: {
    type: 'object',
    properties: {
      gender: { type: 'array', items: { type: 'string', enum: [...GENDERS] } },
      ageRange: {
        type: 'array', minItems: 2, maxItems: 2,
        items: { type: 'number', minimum: 16, maximum: 75 },
        description: '[min, max] playing-age range',
      },
      heightRange: {
        type: 'array', minItems: 2, maxItems: 2,
        items: { type: 'number', minimum: 140, maximum: 210 },
        description: '[min, max] in cm',
      },
      ethnicities:      { type: 'array', items: { type: 'string', enum: [...ETHNICITIES] } },
      bodyTypes:        { type: 'array', items: { type: 'string', enum: [...BODY_TYPES] } },
      hairLengths:      { type: 'array', items: { type: 'string', enum: [...HAIR_LENGTHS] } },
      languages:        { type: 'array', items: { type: 'string', enum: [...LANGUAGES] } },
      accents:          { type: 'array', items: { type: 'string', enum: [...ACCENTS] } },
      voiceTypes:       { type: 'array', items: { type: 'string', enum: [...VOICE_TYPES] } },
      skills:           { type: 'array', items: { type: 'string', enum: [...SKILLS] } },
      unionStatus:      { type: 'array', items: { type: 'string', enum: [...UNION] } },
      experienceLevels: { type: 'array', items: { type: 'string', enum: [...LEVELS] } },
      locations:        { type: 'array', items: { type: 'string', enum: [...LOCATIONS] } },
      notes: { type: 'string', description: 'Up to 200 chars. Any concept from the brief that did not map to a filter (e.g. niche traits, vibes).' },
    },
  },
}

const SYSTEM = `You translate casting director briefs into structured search filters.

Rules:
- ONLY use values from the enumerated lists in the tool schema. Never invent values.
- Be conservative: if a concept is ambiguous, leave it out and mention it in \`notes\`.
- "Israeli" or "Sabra" → Mediterranean or Mizrahi (pick the most likely; if unsure, add both).
- "20-something" → ageRange [22, 29]. "30s" → [30, 39]. "kid" → [16, 18] (we don't list under-16).
- Map languages/skills to the closest listed value. If a skill isn't listed (e.g. "fencing"), put it in \`notes\` — don't pick an unrelated skill.
- Respond by calling set_search_filters exactly once. No prose.`

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? 'unknown'
  const rl = rateLimit(`aria-brief:${ip}`, { max: 15, windowMs: 60_000 })
  if (!rl.ok) {
    return Response.json(
      { error: 'Too many requests. Try again in a moment.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
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
    // Demo fallback — naive keyword scan so the feature still works without a key
    return Response.json({ filters: naiveParse(body.brief), demo: true })
  }

  const client = new Anthropic({ apiKey })

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: SYSTEM,
      tools: [PARSE_TOOL],
      tool_choice: { type: 'tool', name: 'set_search_filters' },
      messages: [{ role: 'user', content: body.brief }],
    })

    const toolUse = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    )
    if (!toolUse) {
      return Response.json({ error: 'Aria could not parse the brief.' }, { status: 502 })
    }

    const parsed = FiltersSchema.safeParse(toolUse.input)
    if (!parsed.success) {
      return Response.json({ error: 'Aria returned invalid filters.', details: parsed.error.format() }, { status: 502 })
    }
    return Response.json({ filters: parsed.data })
  } catch (err) {
    console.error('Aria parse-brief error:', err)
    return Response.json({ error: 'Aria is temporarily unavailable.' }, { status: 502 })
  }
}

// Naive demo fallback — used when ANTHROPIC_API_KEY is missing.
function naiveParse(brief: string): z.infer<typeof FiltersSchema> {
  const b = brief.toLowerCase()
  const out: z.infer<typeof FiltersSchema> = {
    gender: [], ethnicities: [], bodyTypes: [], hairLengths: [],
    languages: [], accents: [], voiceTypes: [], skills: [],
    unionStatus: [], experienceLevels: [], locations: [],
  }
  if (/\b(female|woman|אישה|נשית)\b/.test(b)) out.gender.push('Female')
  if (/\b(male|man|גבר|זכר)\b/.test(b)) out.gender.push('Male')
  if (/non.?binary|א.בינא/i.test(b)) out.gender.push('Non-binary')
  for (const lang of LANGUAGES) if (b.includes(lang.toLowerCase())) out.languages.push(lang)
  if (/\bערבית\b/.test(brief)) out.languages.push('Arabic')
  if (/\bעברית\b/.test(brief)) out.languages.push('Hebrew')
  for (const sk of SKILLS) if (b.includes(sk.toLowerCase())) out.skills.push(sk)
  for (const loc of LOCATIONS) if (b.includes(loc.toLowerCase())) out.locations.push(loc)
  for (const eth of ETHNICITIES) if (b.includes(eth.toLowerCase())) out.ethnicities.push(eth)
  const ageMatch = b.match(/\b(\d{2})\s*[-–to]+\s*(\d{2})\b/)
  if (ageMatch) {
    const lo = Math.max(16, Math.min(75, +ageMatch[1]))
    const hi = Math.max(16, Math.min(75, +ageMatch[2]))
    if (lo <= hi) out.ageRange = [lo, hi]
  }
  return out
}
