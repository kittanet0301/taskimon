import type { SpeechBubble } from './types'

const BUBBLE_MS = 7000

export function upsertBubble(
  bubbles: Map<string, SpeechBubble>,
  userId: string,
  content: string,
  now = Date.now()
): Map<string, SpeechBubble> {
  const next = new Map(bubbles)
  next.set(userId, { userId, content, expiresAt: now + BUBBLE_MS })
  return next
}

export function pruneBubbles(bubbles: Map<string, SpeechBubble>, now = Date.now()): Map<string, SpeechBubble> {
  const next = new Map<string, SpeechBubble>()
  for (const [id, bubble] of bubbles) {
    if (bubble.expiresAt > now) next.set(id, bubble)
  }
  return next
}
