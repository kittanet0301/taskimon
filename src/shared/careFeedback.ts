import type { AnimationState, ItemType } from './types'

export const CARE_FEEDBACK_MS = 1600

export type CareStatDeltaKind = 'health' | 'emotion' | 'evolution'

export interface CareStatDelta {
  kind: CareStatDeltaKind
  amount: number
}

export interface CareFeedback {
  anim: AnimationState
  deltas: CareStatDelta[]
}

/** Matches apply effects in items.ts — used for hub sprite + floating VFX. */
export const CARE_FEEDBACK: Partial<Record<ItemType, CareFeedback>> = {
  food_basic: {
    anim: 'eat',
    deltas: [{ kind: 'emotion', amount: 15 }]
  },
  food_premium: {
    anim: 'eat',
    deltas: [
      { kind: 'emotion', amount: 30 },
      { kind: 'health', amount: 10 }
    ]
  },
  water: {
    anim: 'eat',
    deltas: [
      { kind: 'emotion', amount: 10 },
      { kind: 'health', amount: 5 }
    ]
  },
  medicine: {
    anim: 'happy',
    deltas: [{ kind: 'health', amount: 40 }]
  },
  toy: {
    anim: 'happy',
    deltas: [{ kind: 'emotion', amount: 25 }]
  },
  dev_vitamin: {
    anim: 'happy',
    deltas: [{ kind: 'evolution', amount: 50 }]
  }
}

export function getCareFeedback(type: ItemType): CareFeedback | null {
  return CARE_FEEDBACK[type] ?? null
}

export function careDeltaLabel(kind: CareStatDeltaKind): string {
  if (kind === 'health') return 'HP'
  if (kind === 'emotion') return 'Mood'
  return 'Evo'
}
