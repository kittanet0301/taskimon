import type { GameSave, PetData } from './types'
import { SAVE_VERSION } from './constants'
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

export function evolvePet(pet: PetData): PetData {
  return {
    ...pet,
    stage: 'adult',
    animationState: 'evolve'
  }
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
