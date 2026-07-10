import type { GameSave, PetData } from './types'
import { SAVE_VERSION, TEST_FAST_EVO, PET_SLOT_BASE } from './constants'
import { createDefaultMissions, ensureAllMissions } from './missions'
import { clampSlotLimit } from './petCollection'
import { getDefaultInventory, getDefaultQuickItemSlots, normalizeQuickItemSlots } from './items'
import { createDefaultMinigameState } from './minigame'
import { DEFAULT_CREATURE_SPECIES } from './creatureCharacters'
import { hatchEgg, defaultPetName, normalizePetSpecies } from './dinoCharacters'

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
    name: defaultPetName(hatch.character),
    character: hatch.character,
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

/** Keep character/stats; rewind to egg (e.g. after clear-data / test bootstrap). */
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

function migratePet(pet: PetData & { species?: string; element?: string }): PetData {
  const character = pet.character
    ? normalizePetSpecies(pet.character)
    : pet.species
      ? normalizePetSpecies(pet.species)
      : DEFAULT_CREATURE_SPECIES
  const { species: _species, element: _element, ...rest } = pet
  return { ...rest, character }
}

function normalizeMinigameFields(save: GameSave): GameSave {
  return {
    ...save,
    minigame: save.minigame ?? createDefaultMinigameState()
  }
}

function normalizeCollectionFields(save: GameSave): GameSave {
  return normalizeMinigameFields({
    ...save,
    collection: save.collection ?? [],
    petSlotLimit: clampSlotLimit(
      typeof save.petSlotLimit === 'number' ? save.petSlotLimit : PET_SLOT_BASE
    ),
    quickItemSlots: normalizeQuickItemSlots(save.quickItemSlots),
    missions: ensureAllMissions(save.missions)
  })
}

/** One-time save upgrades (test mode egg rewind on v2; dino characters on v3; collection on v4; quick slots on v5). */
export function migrateSave(save: GameSave): GameSave {
  let next = normalizeCollectionFields(save)

  if (next.version < SAVE_VERSION) {
    if (next.version < 4) {
      next = { ...next, collection: next.collection ?? [], petSlotLimit: PET_SLOT_BASE }
    }
    if (next.version < 5) {
      next = { ...next, quickItemSlots: getDefaultQuickItemSlots(next.inventory) }
    }
    if (next.version < 6) {
      next = { ...next, minigame: createDefaultMinigameState() }
    }
    if (TEST_FAST_EVO && save.version < 2 && next.pet?.stage !== 'egg') {
      next = { ...next, pet: resetPetToEggStage(next.pet) }
    }
    next = { ...next, version: SAVE_VERSION }
  }

  if (next.pet) {
    next = { ...next, pet: migratePet(next.pet) }
  }
  if (next.collection.length > 0) {
    next = { ...next, collection: next.collection.map(migratePet) }
  }

  return next
}

export function createDefaultSave(): GameSave {
  const now = new Date().toISOString()
  return {
    version: SAVE_VERSION,
    pet: createEggPet(),
    collection: [],
    petSlotLimit: PET_SLOT_BASE,
    inventory: getDefaultInventory(),
    quickItemSlots: getDefaultQuickItemSlots(),
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
    lastDailyMissionDay: null,
    minigame: createDefaultMinigameState()
  }
}
