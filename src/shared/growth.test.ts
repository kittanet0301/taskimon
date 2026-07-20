import { describe, expect, it } from 'vitest'
import {
  createDefaultSave,
  createEggPet,
  evolvePet,
  hatchPet,
  migrateSave,
  resetPetToEggStage
} from './growth'
import { PET_SLOT_BASE, SAVE_VERSION } from './constants'

describe('growth helpers', () => {
  it('creates a default save with a random creature egg', () => {
    const save = createDefaultSave()

    expect(save.version).toBe(SAVE_VERSION)
    expect(save.pet?.stage).toBe('egg')
    expect(['ember-sail', 'garden', 'crag-shell']).toContain(save.pet?.character)
    expect(save.collection).toEqual([])
    expect(save.petSlotLimit).toBe(PET_SLOT_BASE)
    expect(save.inventory.length).toBeGreaterThan(0)
    expect(save.missions.length).toBeGreaterThan(0)
  })

  it('migrates legacy dino species to ember-sail', () => {
    const save = createDefaultSave()
    if (!save.pet) throw new Error('expected pet')
    save.pet.character = 'cole'

    const migrated = migrateSave(save)

    expect(migrated.pet?.character).toBe('ember-sail')
  })

  it('moves pets through hatch, reset, and evolve stages', () => {
    const egg = createEggPet()
    const baby = hatchPet(egg)
    const reset = resetPetToEggStage(baby)
    const adult = evolvePet(baby)

    expect(baby.stage).toBe('baby')
    expect(baby.hatchedAt).not.toBeNull()
    expect(reset.stage).toBe('egg')
    expect(reset.hatchedAt).toBeNull()
    expect(adult.stage).toBe('adult')
    expect(adult.animationState).toBe('evolve')
  })

  it('migrates old saves to the current version and normalizes collection fields', () => {
    const legacy = createDefaultSave()
    legacy.version = 1
    legacy.collection = undefined as never
    legacy.petSlotLimit = 999

    const migrated = migrateSave(legacy)

    expect(migrated.version).toBe(SAVE_VERSION)
    expect(migrated.collection).toEqual([])
    expect(migrated.petSlotLimit).toBeGreaterThanOrEqual(PET_SLOT_BASE)
  })
})
