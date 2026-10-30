import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'

const TypecastSchema = z.object({
  heightCm: z.number().optional(),
  weightKg: z.number().optional(),
  gender: z.string().optional(),
  skinTone: z.string().optional(),
  eyeColor: z.string().optional(),
  hairColor: z.string().optional(),
  hairLength: z.string().optional(),
  languages: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  ageRangeMin: z.number().optional(),
  ageRangeMax: z.number().optional(),
  genres: z.array(z.string()).optional(),
}).optional()

const BodySchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1).max(4000),
  })).min(1).max(40),
  userName: z.string().max(80).optional(),
  userTypecast: TypecastSchema,
  mode: z.enum(['agent', 'scene_partner', 'coach', 'custom_scene']).optional(),
  scene: z.object({
    title: z.string(),
    yourCharacter: z.string(),
    partnerCharacter: z.string(),
    context: z.string().optional(),
    script: z.string().max(20_000).optional(),
    voiceProfile: z.enum(['man', 'woman', 'boy', 'girl', 'old_man', 'old_woman', 'teen_male', 'teen_female']).optional(),
    tone: z.enum(['neutral', 'excited', 'happy', 'sad', 'scared', 'worried', 'angry', 'tender', 'sarcastic', 'tense', 'flirtatious', 'cold']).optional(),
    intensity: z.enum(['subtle', 'moderate', 'strong']).optional(),
    // Multi-line turn support: the consecutive partner lines that should be delivered now
    upcomingLines: z.array(z.object({
      character: z.string(),
      text: z.string(),
      direction: z.string().optional(),
    })).max(20).optional(),
    expectedUserLine: z.string().max(2000).optional(),
  }).optional(),
  tools: z.array(z.string()).optional(),
  // Live snapshot of the talent's auditions, calendar and pending actions
  briefing: z.string().max(12_000).optional(),
  lang: z.enum(['he', 'en']).optional(),
})

// Agent tools are executed in the browser (the calendar lives on the device
// and syncs to the account). The client applies them and shows an undo chip.
const TOOLS: Anthropic.Tool[] = [
  {
    name: 'add_calendar_event',
    description: 'Add an event to the talent\'s in-app calendar: an audition, callback, shoot day, self-tape session or personal plan. Use the user\'s local time. A reminder fires automatically before it.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Short title, in the user\'s language' },
        start: { type: 'string', description: 'Local date-time YYYY-MM-DDTHH:mm, or YYYY-MM-DD for an all-day event' },
        kind: { type: 'string', enum: ['audition', 'callback', 'shoot', 'self_tape', 'personal'] },
        location: { type: 'string' },
        note: { type: 'string' },
      },
      required: ['title', 'start', 'kind'],
    },
  },
  {
    name: 'set_reminder',
    description: 'Schedule a one-off reminder notification at a specific local time (e.g. "remind me tomorrow at 9 to learn the sides").',
    input_schema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'What to remind about, in the user\'s language' },
        at: { type: 'string', description: 'Local date-time YYYY-MM-DDTHH:mm' },
      },
      required: ['text', 'at'],
    },
  },
  {
    name: 'block_calendar',
    description: 'Mark days as busy (or available) so casting pros see the talent\'s availability.',
    input_schema: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'YYYY-MM-DD' },
        to: { type: 'string', description: 'YYYY-MM-DD (same as from for one day)' },
        status: { type: 'string', enum: ['busy', 'available'] },
        reason: { type: 'string' },
      },
      required: ['from', 'to', 'status'],
    },
  },
]

function buildSystemPrompt(b: z.infer<typeof BodySchema>): string {
  const tc = b.userTypecast || {}
  const tcLines: string[] = []
  if (tc.gender) tcLines.push(`- Gender: ${tc.gender}`)
  if (tc.ageRangeMin && tc.ageRangeMax) tcLines.push(`- Plays age: ${tc.ageRangeMin}–${tc.ageRangeMax}`)
  if (tc.heightCm) tcLines.push(`- Height: ${tc.heightCm}cm`)
  if (tc.weightKg) tcLines.push(`- Weight: ${tc.weightKg}kg`)
  if (tc.hairColor) tcLines.push(`- Hair: ${tc.hairLength || ''} ${tc.hairColor}`)
  if (tc.eyeColor) tcLines.push(`- Eyes: ${tc.eyeColor}`)
  if (tc.skinTone) tcLines.push(`- Skin tone: ${tc.skinTone}`)
  if (tc.languages?.length) tcLines.push(`- Languages: ${tc.languages.join(', ')}`)
  if (tc.skills?.length) tcLines.push(`- Skills: ${tc.skills.join(', ')}`)
  if (tc.genres?.length) tcLines.push(`- Preferred genres: ${tc.genres.join(', ')}`)

  const profileBlock = tcLines.length
    ? `\nUser typecast profile:\n${tcLines.join('\n')}\nALWAYS factor this in when recommending roles, applications, or coaching notes.`
    : `\nThe user has not filled their typecast yet. If recommending roles, gently nudge them to complete their profile.`

  if (b.mode === 'scene_partner' && b.scene) {
    return `You are Aria, an acting scene partner playing "${b.scene.partnerCharacter}" in "${b.scene.title}".
The user plays "${b.scene.yourCharacter}".
${b.scene.context ? `Scene context: ${b.scene.context}\n` : ''}
Stay strictly IN CHARACTER as ${b.scene.partnerCharacter}.
Respond with ONE short line of dialogue at a time — never narrate stage directions.
React emotionally to the user's tone. Keep pace natural — 1-2 sentences max per turn.
If the user says "cut", "stop", or "break character", drop character and give a brief acting note (specific, not generic).
Respond in the language the user is using.${profileBlock}`
  }

  if (b.mode === 'custom_scene' && b.scene) {
    const VOICE_LABELS: Record<string, string> = {
      man: 'an adult man (deep, mature)',
      woman: 'an adult woman (warm, mature)',
      boy: 'a young boy (~8-12 years old)',
      girl: 'a young girl (~8-12 years old)',
      old_man: 'an elderly man (frail, weathered)',
      old_woman: 'an elderly woman (frail, weathered)',
      teen_male: 'a teenage boy (~14-18 years old)',
      teen_female: 'a teenage girl (~14-18 years old)',
    }
    const TONE_LABELS: Record<string, string> = {
      neutral: 'neutral and grounded',
      excited: 'excited and energetic',
      happy: 'happy and warm',
      sad: 'sad, with a heavy heart',
      scared: 'scared and shaky',
      worried: 'worried and uncertain',
      angry: 'angry, with controlled fury',
      tender: 'tender and gentle',
      sarcastic: 'sarcastic with sharp edges',
      tense: 'tense, holding things back',
      flirtatious: 'flirtatious and playful',
      cold: 'cold and emotionally distant',
    }
    const voice = b.scene.voiceProfile ? VOICE_LABELS[b.scene.voiceProfile] : null
    const tone = b.scene.tone ? TONE_LABELS[b.scene.tone] : 'natural'
    const intensity = b.scene.intensity || 'moderate'

    const upcomingBlock = b.scene.upcomingLines?.length
      ? `\nThe next ${b.scene.upcomingLines.length} consecutive partner line(s) to deliver NOW:\n${b.scene.upcomingLines.map((l, i) => `${i + 1}. [${l.character}]${l.direction ? ` (${l.direction})` : ''} ${l.text}`).join('\n')}\n\nExpected user line that just came (for matching): "${b.scene.expectedUserLine ?? '—'}"`
      : ''

    return `You are Aria — an acting scene partner. The user is rehearsing a scene and you are playing ALL characters EXCEPT "${b.scene.yourCharacter}".

Scene: "${b.scene.title}"
The user plays: "${b.scene.yourCharacter}"
${b.scene.context ? `Context: ${b.scene.context}` : ''}
${voice ? `Voice profile: you sound like ${voice}.` : ''}
Tone: ${tone}. Intensity: ${intensity}.

${b.scene.script ? `Full scene script:\n---\n${b.scene.script}\n---\n` : ''}${upcomingBlock}

Rules:
- Deliver the upcoming partner line(s) above, in order, AS WRITTEN — preserve original wording.
- If multiple lines are listed, output EACH ONE on its own row, separated by the delimiter "|||" (three pipes). The client splits on this delimiter.
- Format every output line as: [CHARACTER_NAME] line text
- Stay strictly in character. NEVER narrate stage directions or break the fourth wall.
- Apply the requested voice/tone through word choice and rhythm (NOT by adding emotion labels).
- If the user clearly improvised or said something off-script, adapt naturally — stay close to the script's beats, but you may modify wording to react to what they actually said.
- If the user says "cut", "stop", "break", or "פסק זמן": drop character, give ONE specific acting note (breath, eye-line, subtext, pace, button), ask if they want to continue. Do NOT use [CHARACTER] format in that case.
- Respond in the same language as the script.
- After delivering all upcoming lines, STOP. Wait for the user's next line.${profileBlock}`
  }

  if (b.mode === 'coach') {
    return `You are Aria, an acting coach for ${b.userName || 'a talent'}.
Give specific, actionable, kind feedback. Reference concrete craft elements: breath, eye-line, pace, subtext, stakes, button.
Keep responses under 4 sentences. Respond in the user's language.${profileBlock}`
  }

  const lang = b.lang === 'en' ? 'English' : 'Hebrew'
  return `You are Aria, the personal manager inside CastIt for ${b.userName || 'an actor'}.
Your job is to keep their acting career organized: track every audition, self-tape deadline, callback, hold and offer; plan their week; and make sure nothing slips.

How you work:
- Ground every answer in the briefing below. It is the live state of their auditions and calendar. Never invent auditions, dates, castings or replies from casting directors; if something isn't in the briefing, say you don't see it.
- When they mention a date (an audition, callback, shoot, class, or anything that blocks their time), add it to the calendar with add_calendar_event. When they ask to be reminded, use set_reminder. When they say they're unavailable or free on certain days, use block_calendar. Convert relative dates ("next Tuesday", "מחר") using the current time in the briefing.
- Whenever you call a tool, also write one short sentence saying what you added.
- When asked what's next, lead with what is urgent: deadlines within 48 hours, pending availability checks and offers, then upcoming callbacks.
- For prep questions, give concrete, practical advice (self-tape setup, slate, learning sides, what to wear to a callback).
- Be warm, direct and brief: 1-4 short sentences or a tight list. Write in ${lang} unless the user writes in another language.${profileBlock}

Briefing:
${b.briefing || '(no data yet)'}`
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? 'unknown'
  const rl = rateLimit(`aria:${ip}`, { max: 20, windowMs: 60_000 })
  if (!rl.ok) {
    return Response.json(
      { error: 'Too many requests. Try again in a moment.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  let body: z.infer<typeof BodySchema>
  try {
    body = BodySchema.parse(await req.json())
  } catch (e) {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey.startsWith('YOUR_')) {
    // graceful demo fallback per mode
    if (body.mode === 'custom_scene' && body.scene?.upcomingLines?.length) {
      // Demo fallback: just echo the script's upcoming lines verbatim
      const text = body.scene.upcomingLines
        .map((l) => `[${l.character}] ${l.text}`)
        .join(' ||| ')
      return Response.json({ text })
    }
    if ((body.mode === 'scene_partner' || body.mode === 'custom_scene') && body.scene) {
      return Response.json({
        text: `I hear you. But that doesn't change what I have to do.`,
      })
    }
    return Response.json({
      text: body.lang === 'en'
        ? "Aria isn't connected yet (no ANTHROPIC_API_KEY on the server). Your calendar and reminders still work."
        : 'Aria עדיין לא מחוברת (חסר ANTHROPIC_API_KEY בשרת). היומן והתזכורות עובדים גם בלעדיה.',
    })
  }

  const client = new Anthropic({ apiKey })

  try {
    const isScene = body.mode === 'scene_partner' || body.mode === 'custom_scene'
    const response = await client.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: isScene ? 8000 : 16000,
      // Scene partner / coach replies must be fast; the manager gets more room to reason.
      output_config: { effort: body.mode === 'agent' || !body.mode ? 'medium' : 'low' },
      tools: body.mode === 'agent' || !body.mode ? TOOLS : undefined,
      system: buildSystemPrompt(body),
      messages: body.messages,
    })

    if (response.stop_reason === 'refusal') {
      return Response.json({ text: body.lang === 'en' ? "I can't help with that one." : 'בזה אני לא יכולה לעזור.', toolCalls: [] })
    }

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')

    const toolCalls = response.content
      .filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
      .map((b) => ({ name: b.name, input: b.input, id: b.id }))

    return Response.json({ text, toolCalls })
  } catch (err: any) {
    console.error('Aria API error:', err)
    return Response.json(
      { error: 'Aria is temporarily unavailable. Try again shortly.' },
      { status: 502 }
    )
  }
}
