import type { ElementId } from './elements'
import { isPureElements } from './elements'

export interface PrimaryStats {
  str: number
  dex: number
  int: number
  con: number
}

export interface DerivedCombatStats {
  maxHp: number
  maxMp: number
  atk: number
  def: number
  eva: number
}

/** Base primaries at egg (~80 total) per element. */
export const ELEMENT_BASE_STATS: Record<ElementId, PrimaryStats> = {
  fire: { str: 28, dex: 18, int: 20, con: 14 },
  grass: { str: 16, dex: 18, int: 22, con: 24 },
  ground: { str: 22, dex: 12, int: 14, con: 32 },
  electric: { str: 18, dex: 30, int: 22, con: 10 },
  water: { str: 18, dex: 20, int: 24, con: 18 },
  ice: { str: 16, dex: 16, int: 28, con: 20 },
  dragon: { str: 26, dex: 16, int: 18, con: 20 },
  dark: { str: 20, dex: 24, int: 22, con: 14 },
  neutral: { str: 20, dex: 20, int: 20, con: 20 }
}

export type GrowthCardId =
  | 'power_up'
  | 'swift'
  | 'focus'
  | 'tough'
  | 'bruiser'
  | 'magelet'
  | 'all_round'

export interface GrowthCard {
  id: GrowthCardId
  deltas: Partial<PrimaryStats>
  /** Relative weight when rolling 3 offers */
  weight: number
}

export const GROWTH_CARDS: GrowthCard[] = [
  { id: 'power_up', deltas: { str: 3 }, weight: 3 },
  { id: 'swift', deltas: { dex: 3 }, weight: 3 },
  { id: 'focus', deltas: { int: 3 }, weight: 3 },
  { id: 'tough', deltas: { con: 3 }, weight: 3 },
  { id: 'bruiser', deltas: { str: 2, con: 1 }, weight: 2 },
  { id: 'magelet', deltas: { int: 2, dex: 1 }, weight: 2 },
  { id: 'all_round', deltas: { str: 1, dex: 1, int: 1, con: 1 }, weight: 1 }
]

export function primariesForElements(
  primary: ElementId,
  secondary: ElementId | null,
  rng: () => number = Math.random
): PrimaryStats {
  if (isPureElements(primary, secondary)) {
    return { ...ELEMENT_BASE_STATS[primary] }
  }
  const a = ELEMENT_BASE_STATS[primary]
  const b = ELEMENT_BASE_STATS[secondary!]
  const noise = () => (rng() < 0.5 ? -1 : rng() < 0.5 ? 1 : 0)
  return {
    str: Math.max(1, Math.round((a.str + b.str) / 2) + noise()),
    dex: Math.max(1, Math.round((a.dex + b.dex) / 2) + noise()),
    int: Math.max(1, Math.round((a.int + b.int) / 2) + noise()),
    con: Math.max(1, Math.round((a.con + b.con) / 2) + noise())
  }
}

export function deriveCombatStats(p: PrimaryStats): DerivedCombatStats {
  const eva = Math.max(0.05, Math.min(0.35, 0.05 + p.dex * 0.003))
  return {
    maxHp: 40 + p.con * 5,
    maxMp: p.int * 10,
    atk: p.str,
    def: p.con,
    eva
  }
}

export function applyGrowthCard(stats: PrimaryStats, card: GrowthCard): PrimaryStats {
  return {
    str: stats.str + (card.deltas.str ?? 0),
    dex: stats.dex + (card.deltas.dex ?? 0),
    int: stats.int + (card.deltas.int ?? 0),
    con: stats.con + (card.deltas.con ?? 0)
  }
}

function pickWeighted(cards: GrowthCard[], rng: () => number): GrowthCard {
  const total = cards.reduce((s, c) => s + c.weight, 0)
  let roll = rng() * total
  for (const card of cards) {
    roll -= card.weight
    if (roll <= 0) return card
  }
  return cards[cards.length - 1]!
}

/** Offer 3 distinct growth cards. */
export function rollGrowthCardOffers(rng: () => number = Math.random): GrowthCard[] {
  const pool = [...GROWTH_CARDS]
  const offers: GrowthCard[] = []
  while (offers.length < 3 && pool.length > 0) {
    const card = pickWeighted(pool, rng)
    offers.push(card)
    const idx = pool.findIndex((c) => c.id === card.id)
    if (idx >= 0) pool.splice(idx, 1)
  }
  return offers
}
