import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'

const VOICE_IDS: Record<string, string> = {
  man:           'nPczCjzI2devNBz1zQrb', // Brian — mature American male
  woman:         'EXAVITQu4vr4xnSDxMaL', // Sarah — warm American female
  boy:           'TX3LPaxmHKxFdv7VOQHJ', // Liam — younger male, pitched up
  girl:          'pFZP5JQG7iQjIQuC4Bku', // Lily — warm British female, pitched up
  old_man:       'pqHfZKP75CvOlQylNhV4', // Bill — mature American male
  old_woman:     'Xb7hH8MSUJpSbSDYk0k2', // Alice — British female, mature
  teen_male:     'bIHbv24MWmeRgasZH58o', // Will — friendly young male
  teen_female:   'FGY2WhTYpPnrIDTdsKH5', // Laura — young female
}

const BodySchema = z.object({
  text: z.string().min(1).max(800),
  voiceProfile: z.enum([
    'man', 'woman', 'boy', 'girl', 'old_man', 'old_woman', 'teen_male', 'teen_female',
  ]).default('woman'),
  tone: z.enum([
    'neutral', 'excited', 'happy', 'sad', 'scared',
    'worried', 'angry', 'tender', 'sarcastic', 'tense',
    'flirtatious', 'cold',
  ]).default('neutral'),
  intensity: z.enum(['subtle', 'moderate', 'strong']).default('moderate'),
})

type Tone = z.infer<typeof BodySchema>['tone']
type Intensity = z.infer<typeof BodySchema>['intensity']

const TONE_SETTINGS: Record<Tone, { stability: number; style: number }> = {
  neutral:     { stability: 0.6, style: 0.0 },
  excited:     { stability: 0.3, style: 0.55 },
  happy:       { stability: 0.45, style: 0.35 },
  sad:         { stability: 0.55, style: 0.4 },
  scared:      { stability: 0.3, style: 0.6 },
  worried:     { stability: 0.5, style: 0.35 },
  angry:       { stability: 0.3, style: 0.65 },
  tender:      { stability: 0.65, style: 0.3 },
  sarcastic:   { stability: 0.45, style: 0.45 },
  tense:       { stability: 0.4, style: 0.5 },
  flirtatious: { stability: 0.4, style: 0.5 },
  cold:        { stability: 0.8, style: 0.05 },
}

const INTENSITY_MULT: Record<Intensity, number> = {
  subtle: 0.7,
  moderate: 1.0,
  strong: 1.4,
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = rateLimit(`speak:${ip}`, { max: 30, windowMs: 60_000 })
  if (!rl.ok) {
    return Response.json({ error: 'Too many requests' }, { status: 429 })
  }

  let body: z.infer<typeof BodySchema>
  try {
    body = BodySchema.parse(await req.json())
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey || apiKey.startsWith('YOUR_')) {
    return Response.json({ error: 'TTS unavailable — set ELEVENLABS_API_KEY' }, { status: 503 })
  }

  const voiceId = VOICE_IDS[body.voiceProfile]
  const baseTone = TONE_SETTINGS[body.tone]
  const mult = INTENSITY_MULT[body.intensity]
  const style = Math.min(1, Math.max(0, baseTone.style * mult))
  const stability = Math.min(1, Math.max(0, baseTone.stability))

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text: body.text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability,
            similarity_boost: 0.8,
            style,
            use_speaker_boost: true,
          },
        }),
      }
    )

    if (!res.ok) {
      const errText = await res.text()
      console.error('ElevenLabs error:', res.status, errText)
      return Response.json({ error: 'TTS provider error' }, { status: 502 })
    }

    const audio = await res.arrayBuffer()
    return new Response(audio, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('speak error:', err)
    return Response.json({ error: 'TTS request failed' }, { status: 502 })
  }
}
