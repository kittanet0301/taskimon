import type { PetData, PetStats, Stage } from './types'
import { ADULT_MIN_HOURS, DEV_POINTS_ADULT, DEV_POINTS_HATCH } from './constants'

export function clampStat(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value))
}

export function applyMoodDecay(stats: PetStats, hoursAway: number): PetStats {
  const moodLoss = Math.floor(hoursAway * 2)
  const hpLoss = Math.floor(hoursAway * 0.5)
  return {
    ...stats,
    mood: clampStat(stats.mood - moodLoss),
    hp: clampStat(stats.hp - hpLoss)
  }
}

export function getMoodLabel(mood: number): 'happy' | 'neutral' | 'sad' {
  if (mood >= 70) return 'happy'
  if (mood >= 40) return 'neutral'
  return 'sad'
}

export function shouldBeSick(stats: PetStats): boolean {
  return stats.hp < 30
}

export function canHatchEgg(pet: PetData): boolean {
  return pet.stage === 'egg' && pet.stats.devPoints >= DEV_POINTS_HATCH
}

export function canEvolveToAdult(pet: PetData): boolean {
  if (pet.stage !== 'baby' || !pet.hatchedAt) return false
  const hoursSinceHatch = (Date.now() - new Date(pet.hatchedAt).getTime()) / 3_600_000
  return pet.stats.devPoints >= DEV_POINTS_ADULT && hoursSinceHatch >= ADULT_MIN_HOURS
}

export function getNextStage(pet: PetData): Stage {
  if (pet.stage === 'egg') return 'baby'
  if (pet.stage === 'baby' && canEvolveToAdult(pet)) return 'adult'
  return pet.stage
}

export function feedPet(stats: PetStats, amount: number): PetStats {
  return { ...stats, mood: clampStat(stats.mood + amount) }
}

export function healPet(stats: PetStats, amount: number): PetStats {
  return { ...stats, hp: clampStat(stats.hp + amount) }
}

export function addDevPoints(stats: PetStats, amount: number): PetStats {
  return { ...stats, devPoints: Math.min(999, stats.devPoints + amount) }
}
