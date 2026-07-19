export const SAVE_VERSION = 7

export const PET_SLOT_BASE = 5
export const PET_SLOT_MAX = 36
export const PET_SLOTS_PER_PAGE = 12
export const WEEKLY_SLOT_REWARD = 5
export const QUICK_ITEM_SLOT_COUNT = 6

/** Flip to false before release builds. */
export const TEST_FAST_EVO = true

/** Instant hatch/evolve while testing creature art. */
export const DEV_POINTS_HATCH = TEST_FAST_EVO ? 0 : 100
export const DEV_POINTS_ADULT = TEST_FAST_EVO ? 0 : 500
export const ADULT_MIN_HOURS = TEST_FAST_EVO ? 0 : 48
export const CLICKS_PER_DEV = TEST_FAST_EVO ? 10 : 100
export const KEYS_PER_DEV = TEST_FAST_EVO ? 50 : 500
export const MAX_DEV_PER_HOUR = TEST_FAST_EVO ? 999 : 10

/** Cooldown before a bred pet can breed again. */
export const BREED_COOLDOWN_MS = TEST_FAST_EVO ? 60_000 : 6 * 60 * 60 * 1000
/** Extra pure-element chance bonus when both parents are pure of the same element. */
export const BREED_PURE_BONUS = 0.05

import type { PetSpecies } from './types'
import { CREATURE_PREVIEW_COLORS } from './creatureCharacters'
import { DINO_PREVIEW_COLORS } from './dinoCharacters'
import { isCreatureSpecies } from './creatureCharacters'

export { DINO_PREVIEW_COLORS, CREATURE_PREVIEW_COLORS }

export function petPreviewColor(species: PetSpecies): string {
  if (isCreatureSpecies(species)) return CREATURE_PREVIEW_COLORS[species]
  return DINO_PREVIEW_COLORS[species]
}
