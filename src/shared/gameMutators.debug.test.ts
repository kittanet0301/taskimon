import { describe, expect, it } from 'vitest'
import { applyGamePatch } from './gameMutators'
import { createDefaultSave, createEggPet } from './growth'
import { TEST_FAST_EVO } from './constants'

describe('TEST debug buttons', () => {
  it('is enabled in test-fast mode', () => {
    expect(TEST_FAST_EVO).toBe(true)
  })

  it('debugSetSpecies switches active pet species and name', () => {
    const save = createDefaultSave()
    const next = applyGamePatch(save, 'debugSetSpecies', ['garden'])
    expect(next.pet?.character).toBe('garden')
    expect(next.pet?.name.toLowerCase()).toContain('garden')
  })

  it('debugSetStage egg→baby rolls a skill loadout', () => {
    const save = { ...createDefaultSave(), pet: createEggPet('ember-sail') }
    expect(save.pet?.stage).toBe('egg')
    expect(save.pet?.skillLoadout).toBeNull()

    const baby = applyGamePatch(save, 'debugSetStage', ['baby'])
    expect(baby.pet?.stage).toBe('baby')
    expect(baby.pet?.skillLoadout?.slots.length).toBe(4)

    const adult = applyGamePatch(save, 'debugSetStage', ['adult'])
    expect(adult.pet?.stage).toBe('adult')
    expect(adult.pet?.skillLoadout?.slots.length).toBe(4)
  })

  it('debugSetStage adult→egg clears skills', () => {
    let save = { ...createDefaultSave(), pet: createEggPet('garden') }
    save = applyGamePatch(save, 'debugSetStage', ['adult'])
    save = applyGamePatch(save, 'debugSetStage', ['egg'])
    expect(save.pet?.stage).toBe('egg')
    expect(save.pet?.skillLoadout).toBeNull()
  })

  it('debugBoostDev grants skill points / growth offers on level-up', () => {
    let save = { ...createDefaultSave(), pet: createEggPet('garden') }
    save = applyGamePatch(save, 'debugSetStage', ['baby'])
    const before = save.pet!
    expect(before.skillUpgradePoints).toBe(0)

    // Baby level = 2 + floor(evolution/80). +80 evolution → +1 level.
    save = applyGamePatch(save, 'debugBoostDev', [80])
    expect(save.pet?.stats.evolution).toBe(80)
    expect(save.pet!.skillUpgradePoints).toBeGreaterThan(before.skillUpgradePoints)
    expect(save.pet?.pendingGrowthOffers?.length).toBeGreaterThan(0)
  })

  it('newEgg adds a species-specific egg into collection', () => {
    const save = createDefaultSave()
    const used = 1 + save.collection.length
    const next = applyGamePatch(save, 'newEgg', ['ember-sail'])
    expect(next.collection.length).toBe(save.collection.length + 1)
    const egg = next.collection[next.collection.length - 1]!
    expect(egg.stage).toBe('egg')
    expect(egg.character).toBe('ember-sail')
    expect(egg.elementPrimary).toBeTruthy()
    expect(used + 1).toBe(1 + next.collection.length)
  })
})
