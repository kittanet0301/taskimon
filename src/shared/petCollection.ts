import type { GameSave } from './types'
import { PET_SLOT_BASE, PET_SLOT_MAX } from './constants'

export function clampSlotLimit(n: number): number {
  return Math.max(PET_SLOT_BASE, Math.min(PET_SLOT_MAX, n))
}

export function getUsedSlots(save: GameSave): number {
  return (save.pet ? 1 : 0) + save.collection.length
}

export function getFreeSlots(save: GameSave): number {
  return Math.max(0, save.petSlotLimit - getUsedSlots(save))
}

export function canAddPet(save: GameSave): boolean {
  return getFreeSlots(save) > 0
}

export function getCollectionPageCount(slotLimit: number, slotsPerPage: number): number {
  return Math.max(1, Math.ceil(slotLimit / slotsPerPage))
}
