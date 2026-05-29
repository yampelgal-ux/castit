import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'

const BodySchema = z.object({
  // Base64-encoded audio/video file (Whisper accepts both)
  mediaBase64: z.string().min(100),
  mediaMimeType: z.string().default('audio/webm'),
  filename: z.string().default('tape.webm'),
  role: z.object({
    name: z.string(),
    description: z.string().optional(),
    sides: z.string().optional(),
  }),
  takeCount: z.number().optional(),
  durationSec: z.number().optional(),
})

const ANALYSIS_TOOL: Anthropic.Tool = {
  name: 'set_tape_analysis',
  description: 'Analyze a self-tape transcript against the role brief and return a structured assessment for the casting pro.',
  input_schema: {
    type: 'object',
    properties: {
      slateComplete: {
        type: 'boolean',
        description: 'Did the talent slate? (state their name, height, agent at the start)',
      },
      linesAccuracy: {
        type: 'number',
        description: 'Percent 0-100 of how closely the spoken lines match the sides script. 100 = verbatim. If no sides provided, set to 50.',
      },
      pacingNote: {
        type: 'string',
        description: 'One-sentence pacing observation (e.g., "rushed final beat" or "well-placed pauses"). Max 14 words.',
      },
      emotionalChoice: {
        type: 'string',
        description: 'One-sentence note on the emotional/tonal choice and whether it serves the role. Max 18 words.',
      },
      strengths: {
        type: 'array',
        items: { type: 'string' },
        description: '1-3 concrete strengths visible in the transcript. Each under 12 words.',
      },
      concerns: {
        type: 'array',
        items: { type: 'string' },
        description: '0-3 specific concerns. Each under 12 words. Empty array if none.',
      },
      recommendation: {
        type: 'string',
        enum: ['callback', 'hold', 'pass'],
        description: 'Top-level recommendation for the casting pro.',
      },
      summary: {
        type: 'string',
        description: 'One-sentence executive summary. Max 22 words.',
      },
    },
    required: ['slateComplete', 'strengths', 'concerns', 'recommendation', 'summary'],
  },
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = rateLimit(`analyze-tape:${ip}`, { max: 10, windowMs: 60_000 })
  if (!rl.ok) {
    return Response.json({ error: 'Too many requests' }, { status: 429 })
  }

  let body: z.infer<typeof BodySchema>
  try {
    body = BodySchema.parse(await req.json())
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const openaiKey = process.env.OPENAI_API_KEY
  const anthropicKey = process.env.ANTHROPIC_API_KEY

  if (!openaiKey || openaiKey.startsWith('YOUR_')) {
    return Response.json(
      { error: 'Transcription unavailable — set OPENAI_API_KEY' },
      { status: 503 }
    )
  }
  if (!anthropicKey || anthropicKey.startsWith('YOUR_')) {
    return Response.json(
      { error: 'Analysis unavailable — set ANTHROPIC_API_KEY' },
      { status: 503 }
    )
  }

  // ─── Step 1: Transcribe via OpenAI Whisper ──────────
  let transcript = ''
  try {
    // Decode base64 to a Buffer/Uint8Array
    const audioBuffer = Buffer.from(body.mediaBase64, 'base64')

    const formData = new FormData()
    formData.append(
      'file',
      new Blob([audioBuffer], { type: body.mediaMimeType }),
      body.filename
    )
    formData.append('model', 'whisper-1')
    formData.append('response_format', 'text')

    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openaiKey}` },
      body: formData,
    })

    if (!whisperRes.ok) {
      const errText = await whisperRes.text()
      console.error('Whisper error:', whisperRes.status, errText)
      return Response.json(
        { error: 'Transcription failed' },
        { status: 502 }
      )
    }

    transcript = (await whisperRes.text()).trim()
  } catch (err) {
    console.error('Whisper call failed:', err)
    return Response.json({ error: 'Transcription error' }, { status: 502 })
  }

  if (!transcript) {
    return Response.json({ error: 'Empty transcript — tape may be silent' }, { status: 422 })
  }

  // ─── Step 2: Analyze transcript with Claude ─────────
  const client = new Anthropic({ apiKey: anthropicKey })

  const userPrompt = `Analyze this self-tape audition for a casting pro.

ROLE: ${body.role.name}
${body.role.description ? `BRIEF: ${body.role.description}` : ''}
${body.role.sides ? `EXPECTED SIDES:\n${body.role.sides}` : 'No sides provided — assess slate and general performance only.'}
${body.takeCount ? `Talent recorded ${body.takeCount} takes.` : ''}
${body.durationSec ? `This take is ${body.durationSec}s long.` : ''}

ACTUAL TRANSCRIPT (what the talent said):
---
${transcript}
---

Evaluate against the role brief and sides. Be honest and specific — pros use this to triage 50+ tapes. If the transcript is too short, note that as a concern. Call set_tape_analysis with your assessment. Match the original language (Hebrew/English).`

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      tools: [ANALYSIS_TOOL],
      tool_choice: { type: 'tool', name: 'set_tape_analysis' },
      system: 'You are an experienced casting director assistant. Your job is to give honest, specific, fast assessments of self-tape transcripts. Avoid generic compliments. Match the language of the source.',
      messages: [{ role: 'user', content: userPrompt }],
    })

    const toolUse = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    )
    if (!toolUse) {
      return Response.json({ error: 'No analysis returned' }, { status: 500 })
    }

    const input = toolUse.input as Record<string, unknown>
    return Response.json({
      ...input,
      transcript,
      generatedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Claude analysis error:', err)
    return Response.json({ error: 'Analysis failed' }, { status: 502 })
  }
}
