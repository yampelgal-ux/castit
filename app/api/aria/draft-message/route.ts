import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'

const BodySchema = z.object({
  intent: z.enum([
    'callback', 'hold', 'avail_check', 'offered', 'rejected',
    'request_tape', 'invite', 'follow_up',
  ]),
  talentName: z.string().min(1).max(120),
  roleName: z.string().min(1).max(160),
  projectTitle: z.string().min(1).max(160),
  proName: z.string().max(120).optional(),
  // Optional flavor
  tone: z.enum(['warm', 'professional', 'brief', 'enthusiastic']).default('professional'),
  language: z.enum(['hebrew', 'english', 'auto']).default('auto'),
  // Context details Aria can weave in
  shootDates: z.string().max(200).optional(),
  payOffered: z.string().max(120).optional(),
  holdHours: z.number().int().min(1).max(168).optional(),
  customNote: z.string().max(500).optional(),
})

const INTENT_BRIEFS: Record<z.infer<typeof BodySchema>['intent'], string> = {
  callback: 'You loved their tape and want them back for a callback. Mention new sides will follow if relevant.',
  hold: 'Strong work but undecided — putting them on hold (first refusal). Be warm, set expectation that you\'ll update soon.',
  avail_check: 'You need to check their availability for the shoot dates. Be clear that this is NOT yet an offer.',
  offered: 'Formal offer extended. Reference pay and shoot dates if provided.',
  rejected: 'Polite, brief pass. Acknowledge their work, leave the door open for future projects. No "wrong fit" language.',
  request_tape: 'Asking them to submit a self-tape. Mention sides and any specific instructions.',
  invite: 'Initial invite to read for the role. Warm, professional, gives them confidence they were chosen specifically.',
  follow_up: 'Friendly check-in if they haven\'t responded. No pressure.',
}

const TONE_NOTES: Record<z.infer<typeof BodySchema>['tone'], string> = {
  warm: 'Warm and personal. Use their first name. Sign off with care.',
  professional: 'Professional and respectful. Clear and friendly.',
  brief: 'Very concise. 1-3 sentences total. No filler.',
  enthusiastic: 'Genuinely enthusiastic about their work. Specific praise.',
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = rateLimit(`draft-message:${ip}`, { max: 30, windowMs: 60_000 })
  if (!rl.ok) {
    return Response.json({ error: 'Too many requests' }, { status: 429 })
  }

  let body: z.infer<typeof BodySchema>
  try {
    body = BodySchema.parse(await req.json())
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey.startsWith('YOUR_')) {
    // Fallback canned messages so the UI still works without a key
    const CANNED: Record<typeof body.intent, string> = {
      callback: `Loved your tape — we'd like to bring you back for a callback. New sides incoming.`,
      hold: `Strong work — we're holding your tape as we narrow down. I'll be in touch within ${body.holdHours ?? 48}h.`,
      avail_check: `Checking your availability${body.shootDates ? ` for ${body.shootDates}` : ''}. This is not yet an offer — confirming dates work for you.`,
      offered: `Formal offer for ${body.roleName} in ${body.projectTitle}${body.payOffered ? `. ${body.payOffered}` : ''}.`,
      rejected: `Thank you for your tape. We've gone in a different direction this time — keep us in mind for future projects.`,
      request_tape: `Please submit a self-tape for ${body.roleName} — full instructions and sides are in the role brief.`,
      invite: `We'd love you to read for ${body.roleName} in ${body.projectTitle}. Sides and instructions attached.`,
      follow_up: `Just checking in on the tape — let us know if you need anything to wrap it up.`,
    }
    return Response.json({ text: CANNED[body.intent] })
  }

  const langDirective =
    body.language === 'hebrew' ? 'Respond in Hebrew.'
    : body.language === 'english' ? 'Respond in English.'
    : `Detect the talent\'s likely working language from their name (${body.talentName}) and reply in that language. If unclear, default to Hebrew.`

  const contextLines = [
    `Project: "${body.projectTitle}"`,
    `Role: "${body.roleName}"`,
    `Talent: ${body.talentName}`,
    body.proName ? `From: ${body.proName} (casting director)` : null,
    body.shootDates ? `Shoot dates: ${body.shootDates}` : null,
    body.payOffered ? `Pay: ${body.payOffered}` : null,
    body.holdHours ? `Hold duration: ${body.holdHours} hours` : null,
    body.customNote ? `Additional context the pro wants included: ${body.customNote}` : null,
  ].filter(Boolean).join('\n')

  const client = new Anthropic({ apiKey })

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 350,
      system: `You are drafting a short professional message from a casting pro to a talent. Output ONLY the message body — no greeting envelope, no signature line, no "Subject:" header, no surrounding quotes. ${TONE_NOTES[body.tone]} ${langDirective}`,
      messages: [{
        role: 'user',
        content: `Write a message to send to the talent now.

Intent: ${INTENT_BRIEFS[body.intent]}

Context:
${contextLines}

Constraints:
- 2-5 sentences max
- No emoji
- Personal but professional
- The talent should know exactly what to do (if anything) after reading`,
      }],
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim()

    return Response.json({ text })
  } catch (err) {
    console.error('draft-message error:', err)
    return Response.json({ error: 'Draft failed' }, { status: 502 })
  }
}
