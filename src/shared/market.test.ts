import { describe, expect, it } from 'vitest'
import { applyGamePatch } from './gameMutators'
import { createDefaultSave, createEggPet } from './growth'
import { PET_SLOT_MAX } from './constants'
import { getMarketOffer, MARKET_OFFERS } from './market'

describe('buyMarket', () => {
  it('has catalog offers for egg, slots, items, and care bundle', () => {
    expect(getMarketOffer('egg_random')?.kind).toBe('egg')
    expect(getMarketOffer('slots_1')?.kind).toBe('slots')
    expect(getMarketOffer('bundle_care')?.kind).toBe('bundle')
    expect(MARKET_OFFERS.some((o) => o.kind === 'item')).toBe(true)
  })

  it('buys a random egg and deducts gems', () => {
    const save = { ...createDefaultSave(), gems: 30 }
    const next = applyGamePatch(save, 'buyMarket', ['egg_random'])
    expect(next.gems).toBe(5)
    expect(next.collection.length).toBe(save.collection.length + 1)
    expect(next.collection[next.collection.length - 1]!.stage).toBe('egg')
  })

  it('does not buy egg when gems are insufficient', () => {
    const save = { ...createDefaultSave(), gems: 10 }
    const next = applyGamePatch(save, 'buyMarket', ['egg_random'])
    expect(next).toBe(save)
  })

  it('does not buy egg when pet slots are full', () => {
    const base = createDefaultSave()
    const fill = Array.from({ length: base.petSlotLimit - 1 }, () => createEggPet())
    const save = { ...base, gems: 100, collection: fill }
    const next = applyGamePatch(save, 'buyMarket', ['egg_random'])
    expect(next).toBe(save)
  })

  it('buys +1 slot and clamps to max', () => {
    const save = { ...createDefaultSave(), gems: 20, petSlotLimit: 10 }
    const next = applyGamePatch(save, 'buyMarket', ['slots_1'])
    expect(next.gems).toBe(8)
    expect(next.petSlotLimit).toBe(11)

    const atMax = { ...createDefaultSave(), gems: 100, petSlotLimit: PET_SLOT_MAX }
    expect(applyGamePatch(atMax, 'buyMarket', ['slots_1'])).toBe(atMax)
  })

  it('buys +5 slots', () => {
    const save = { ...createDefaultSave(), gems: 60, petSlotLimit: 5 }
    const next = applyGamePatch(save, 'buyMarket', ['slots_5'])
    expect(next.gems).toBe(10)
    expect(next.petSlotLimit).toBe(10)
  })

  it('buys a single item', () => {
    const save = createDefaultSave()
    const before = save.inventory.find((i) => i.type === 'toy')?.quantity ?? 0
    const next = applyGamePatch({ ...save, gems: 5 }, 'buyMarket', ['item_toy'])
    expect(next.gems).toBe(2)
    expect(next.inventory.find((i) => i.type === 'toy')?.quantity).toBe(before + 1)
  })

  it('buys the care bundle', () => {
    const save = createDefaultSave()
    const foodBefore = save.inventory.find((i) => i.type === 'food_basic')?.quantity ?? 0
    const waterBefore = save.inventory.find((i) => i.type === 'water')?.quantity ?? 0
    const medBefore = save.inventory.find((i) => i.type === 'medicine')?.quantity ?? 0
    const next = applyGamePatch({ ...save, gems: 10 }, 'buyMarket', ['bundle_care'])
    expect(next.gems).toBe(2)
    expect(next.inventory.find((i) => i.type === 'food_basic')?.quantity).toBe(foodBefore + 3)
    expect(next.inventory.find((i) => i.type === 'water')?.quantity).toBe(waterBefore + 2)
    expect(next.inventory.find((i) => i.type === 'medicine')?.quantity).toBe(medBefore + 1)
  })

  it('ignores unknown offer ids', () => {
    const save = { ...createDefaultSave(), gems: 100 }
    expect(applyGamePatch(save, 'buyMarket', ['nope'])).toBe(save)
  })
})
