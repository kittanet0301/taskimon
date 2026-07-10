import type { Stage } from './types'

export const CREATURE_SPECIES = ['ember-sail'] as const

export type CreatureSpecies = (typeof CREATURE_SPECIES)[number]

/** Default species for new eggs and saves while creature art is the POC focus. */
export const DEFAULT_CREATURE_SPECIES: CreatureSpecies = 'ember-sail'

export const CREATURE_FRAME_SIZE = 128

/** Single on-screen scale for legacy dino sprites (not used for creature target sizes). */
export const CREATURE_PIXEL_SCALE = 2

/** Target on-screen sprite size (px) for creature UI — egg/baby share one size. */
export const CREATURE_DISPLAY_SIZE = {
  egg: 250,
  baby: 250,
  adult: 500
} as const

export function creatureDisplaySize(stage: Stage): number {
  return stage === 'adult' ? CREATURE_DISPLAY_SIZE.adult : CREATURE_DISPLAY_SIZE.egg
}

export type CreatureStageFolder = 'egg' | 'baby' | 'adult'

export const CREATURE_PREVIEW_COLORS: Record<CreatureSpecies, string> = {
  'ember-sail': '#c0392b'
}

export function isCreatureSpecies(value: string): value is CreatureSpecies {
  return (CREATURE_SPECIES as readonly string[]).includes(value)
}

export function creatureStageFolder(stage: Stage): CreatureStageFolder {
  if (stage === 'egg') return 'egg'
  if (stage === 'baby') return 'baby'
  return 'adult'
}

export function creatureRenderStage(stage: Stage): CreatureStageFolder {
  return creatureStageFolder(stage)
}

export function creatureAssetBase(
  species: CreatureSpecies,
  stageFolder: CreatureStageFolder,
  clip: string
): string {
  return `/creatures/${species}/${stageFolder}/${clip}.png`
}
