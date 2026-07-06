import type { AnimationState, PetData } from './types'
import { getMoodLabel, shouldBeSick } from './stats'
import type { DinoSpriteFolder } from './dinoSprites'
import {
  DINO_EGG_CRACK_FRAMES,
  DINO_HAPPY_BURST,
  DINO_HAPPY_CYCLE
} from './dinoTiming'

export interface ResolvedDinoClip {
  folder: DinoSpriteFolder
  clip: string
  flipX: boolean
}

export function resolveDinoClip(
  pet: PetData,
  frame: number,
  movementAnim: AnimationState,
  hatching = false
): ResolvedDinoClip {
  if (pet.stage === 'egg') {
    if (hatching || pet.animationState === 'egg_hatch') {
      return { folder: 'egg', clip: frame < DINO_EGG_CRACK_FRAMES ? 'crack' : 'hatch', flipX: false }
    }
    return { folder: 'egg', clip: 'move', flipX: false }
  }

  if (pet.animationState === 'eat') return { folder: 'base', clip: 'bite', flipX: false }
  if (pet.animationState === 'sleep') return { folder: 'base', clip: 'idle', flipX: false }
  if (pet.animationState === 'evolve') return { folder: 'base', clip: 'jump', flipX: false }
  if (pet.animationState === 'battle_attack') return { folder: 'base', clip: 'bite', flipX: false }
  if (pet.animationState === 'battle_hurt') return { folder: 'base', clip: 'hurt', flipX: false }
  if (pet.stats.hp <= 0) return { folder: 'base', clip: 'dead', flipX: false }

  if (shouldBeSick(pet.stats)) return { folder: 'base', clip: 'hurt', flipX: false }

  const mood = getMoodLabel(pet.stats.mood)
  if (mood === 'happy' && frame % DINO_HAPPY_CYCLE < DINO_HAPPY_BURST) return { folder: 'base', clip: 'jump', flipX: false }
  if (mood === 'sad') return { folder: 'base', clip: 'hurt', flipX: false }

  if (movementAnim === 'walk_left') return { folder: 'base', clip: 'move', flipX: true }
  if (movementAnim === 'walk_right') return { folder: 'base', clip: 'move', flipX: false }

  return { folder: 'base', clip: 'idle', flipX: false }
}

export function hubPreviewClip(pet: PetData, hatching = false): ResolvedDinoClip {
  if (pet.stage === 'egg') {
    if (hatching) return { folder: 'egg', clip: 'hatch', flipX: false }
    return { folder: 'egg', clip: 'move', flipX: false }
  }
  if (pet.stage === 'baby') return { folder: 'base', clip: 'idle', flipX: false }
  return { folder: 'base', clip: 'idle', flipX: false }
}
