import { describe, expect, it } from 'vitest'
import {
  ELEMENT_BASE_STATS,
  applyGrowthCard,
  deriveCombatStats,
  primariesForElements,
  rollGrowthCardOffers
} from './combatStats'

describe('combatStats', () => {
  it('uses the locked per-element base table for pure pets', () => {
    expect(primariesForElements('fire', null)).toEqual(ELEMENT_BASE_STATS.fire)
    expect(primariesForElements('neutral', null)).toEqual(ELEMENT_BASE_STATS.neutral)
  })

  it('averages dual-element bases (no noise when rng is fixed)', () => {
    const stats = primariesForElements('fire', 'water', () => 0.75)
    expect(stats).toEqual({
      str: Math.round((28 + 18) / 2),
      dex: Math.round((18 + 20) / 2),
      int: Math.round((20 + 24) / 2),
      con: Math.round((14 + 18) / 2)
    })
  })

  it('derives battle HP/MP/ATK/DEF/EVA from primaries', () => {
    const derived = deriveCombatStats({ str: 20, dex: 20, int: 20, con: 20 })
    expect(derived.maxHp).toBe(40 + 20 * 5)
    expect(derived.maxMp).toBe(20 * 10)
    expect(derived.atk).toBe(20)
    expect(derived.def).toBe(20)
    expect(derived.eva).toBeCloseTo(0.05 + 20 * 0.003, 5)
  })

  it('clamps EVA between 5% and 35%', () => {
    expect(deriveCombatStats({ str: 1, dex: 0, int: 1, con: 1 }).eva).toBe(0.05)
    expect(deriveCombatStats({ str: 1, dex: 200, int: 1, con: 1 }).eva).toBe(0.35)
  })

  it('applies growth cards to primaries', () => {
    const base = { str: 20, dex: 20, int: 20, con: 20 }
    expect(applyGrowthCard(base, { id: 'power_up', deltas: { str: 3 }, weight: 1 })).toEqual({
      str: 23,
      dex: 20,
      int: 20,
      con: 20
    })
    expect(applyGrowthCard(base, { id: 'all_round', deltas: { str: 1, dex: 1, int: 1, con: 1 }, weight: 1 })).toEqual({
      str: 21,
      dex: 21,
      int: 21,
      con: 21
    })
  })

  it('rolls 3 distinct growth card offers', () => {
    let i = 0
    const seq = [0.01, 0.2, 0.4, 0.6, 0.8, 0.99]
    const offers = rollGrowthCardOffers(() => seq[i++ % seq.length]!)
    expect(offers).toHaveLength(3)
    const ids = offers.map((o) => o.id)
    expect(new Set(ids).size).toBe(3)
  })
})
