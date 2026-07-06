import type { GameSave, PetData } from './types'
import { SAVE_VERSION, TEST_FAST_EVO } from './constants'
import { createDefaultMissions } from './missions'
import { getDefaultInventory } from './items'
import { hatchEgg, defaultPetName } from './species'

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function createEggPet(): PetData {
  const hatch = hatchEgg()
  return {
    id: uuid(),
    name: defaultPetName(hatch.species),
    species: hatch.species,
    element: hatch.element,
    gender: hatch.gender,
    stage: 'egg',
    stats: { hp: 100, mood: 80, devPoints: 0 },
    hatchedAt: null,
    createdAt: new Date().toISOString(),
    animationState: 'egg_idle',
    feedCount: 0
  }
}

export function hatchPet(pet: PetData): PetData {
  return {
    ...pet,
    stage: 'baby',
    hatchedAt: new Date().toISOString(),
    animationState: 'idle'
  }
}

/** Keep species/stats; rewind to egg (e.g. after clear-data / test bootstrap). */
export function resetPetToEggStage(pet: PetData): PetData {
  return {
    ...pet,
    stage: 'egg',
    hatchedAt: null,
    animationState: 'egg_idle'
  }
}

export function evolvePet(pet: PetData): PetData {
  return {
    ...pet,
    stage: 'adult',
    animationState: 'evolve'
  }
}

/** One-time save upgrades (e.g. test mode: rewind hatched pets to egg on v2). */
export function migrateSave(save: GameSave): GameSave {
  if (save.version >= SAVE_VERSION) return save
  let next = { ...save, version: SAVE_VERSION }
  if (TEST_FAST_EVO && next.pet && next.pet.stage !== 'egg') {
    next = { ...next, pet: resetPetToEggStage(next.pet) }
  }
  return next
}

export function createDefaultSave(): GameSave {
  const now = new Date().toISOString()
  return {
    version: SAVE_VERSION,
    pet: createEggPet(),
    inventory: getDefaultInventory(),
    missions: createDefaultMissions(),
    activity: {
      clicks: 0,
      keystrokes: 0,
      devPointsThisHour: 0,
      hourStartedAt: now
    },
    sessionStartedAt: now,
    lastSaved: now,
    totalPlaySeconds: 0,
    dailyMissionsCompletedDays: 0,
    lastDailyMissionDay: null
  }
}
