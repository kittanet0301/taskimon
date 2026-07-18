import type { AnimationState, PetData } from './types'
import { getMoodLabel, shouldBeSick } from './stats'
import { isCreatureSpecies } from './creatureCharacters'
import type { PetSpriteFolder } from './petSprites'
import {
  DINO_HAPPY_BURST,
  DINO_HAPPY_CYCLE
} from './dinoTiming'

export interface ResolvedPetClip {
  folder: PetSpriteFolder
  clip: string
  flipX: boolean
}

export type ResolvedDinoClip = ResolvedPetClip

/** Creature sprites face left in the art; mirror when the pet faces/moves right. */
export function flipXForFacing(facing: 'left' | 'right'): boolean {
  return facing === 'right'
}

function bodyFolder(pet: PetData): PetSpriteFolder {
  if (pet.stage === 'egg') return 'egg'
  if (isCreatureSpecies(pet.character)) {
    return pet.stage === 'baby' ? 'baby' : 'adult'
  }
  return 'base'
}

export function resolvePetClip(
  pet: PetData,
  frame: number,
  movementAnim: AnimationState,
  hatching = false
): ResolvedPetClip {
  if (pet.stage === 'egg') {
    if (hatching || pet.animationState === 'egg_hatch') {
      return { folder: 'egg', clip: 'hatch', flipX: false }
    }
    return { folder: 'egg', clip: 'move', flipX: false }
  }

  const folder = bodyFolder(pet)

  if (pet.animationState === 'eat') return { folder, clip: 'bite', flipX: false }
  if (pet.animationState === 'sleep') return { folder, clip: 'idle', flipX: false }
  if (pet.animationState === 'evolve') return { folder, clip: 'jump', flipX: false }
  if (pet.animationState === 'battle_attack') return { folder, clip: 'bite', flipX: false }
  if (pet.animationState === 'battle_hurt') return { folder, clip: 'hurt', flipX: false }
  if (pet.stats.health <= 0) return { folder, clip: 'hurt', flipX: false }

  if (shouldBeSick(pet.stats)) return { folder, clip: 'hurt', flipX: false }

  const mood = getMoodLabel(pet.stats.emotion)
  if (mood === 'happy' && frame % DINO_HAPPY_CYCLE < DINO_HAPPY_BURST) return { folder, clip: 'jump', flipX: false }
  if (mood === 'sad') return { folder, clip: 'hurt', flipX: false }

  if (movementAnim === 'walk_left') return { folder, clip: 'move', flipX: false }
  if (movementAnim === 'walk_right') return { folder, clip: 'move', flipX: true }

  return { folder, clip: 'idle', flipX: false }
}

export const resolveDinoClip = resolvePetClip

export function hubPreviewClip(pet: PetData, hatching = false): ResolvedPetClip {
  if (pet.stage === 'egg') {
    if (hatching) return { folder: 'egg', clip: 'hatch', flipX: false }
    return { folder: 'egg', clip: 'move', flipX: false }
  }
  return { folder: bodyFolder(pet), clip: 'idle', flipX: false }
}
