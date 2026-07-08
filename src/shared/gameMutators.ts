import type { GameSave, ItemType } from './types'
import { hatchPet, evolvePet, createEggPet } from './growth'
import { canEvolveToAdult, canHatchEgg } from './stats'
import { ITEMS, normalizeQuickItemSlots, useItem } from './items'
import { getMissionDefinition, applyDailyResets, recordDailyMissionClaim } from './missions'
import { canAddPet, clampSlotLimit } from './petCollection'

export function applyGamePatch(save: GameSave, mutatorName: string, args: unknown[] = []): GameSave {
  if (mutatorName === 'hatch') {
    if (!save.pet || !canHatchEgg(save.pet)) return save
    let next = { ...save, pet: hatchPet(save.pet) }
    next = applyDailyResets(next)
    next.missions = next.missions.map((m) =>
      m.missionId === 'weekly_hatch_1' ? { ...m, progress: m.progress + 1, completed: m.progress + 1 >= 1 } : m
    )
    return next
  }
  if (mutatorName === 'evolve') {
    if (!save.pet || !canEvolveToAdult(save.pet)) return save
    return { ...save, pet: evolvePet(save.pet) }
  }
  if (mutatorName === 'newEgg') {
    if (!canAddPet(save)) return save
    return { ...save, collection: [...save.collection, createEggPet()] }
  }
  if (mutatorName === 'setActivePet' && typeof args[0] === 'string') {
    const petId = args[0] as string
    const idx = save.collection.findIndex((p) => p.id === petId)
    if (idx < 0) return save
    const selected = save.collection[idx]
    const newCollection = [...save.collection]
    newCollection.splice(idx, 1)
    if (save.pet) newCollection.push(save.pet)
    return { ...save, pet: selected, collection: newCollection }
  }
  if (mutatorName === 'releasePet' && typeof args[0] === 'string') {
    const petId = args[0] as string
    if (save.pet?.id === petId) return save
    return { ...save, collection: save.collection.filter((p) => p.id !== petId) }
  }
  if (mutatorName === 'rename' && typeof args[0] === 'string') {
    if (!save.pet) return save
    return { ...save, pet: { ...save.pet, name: args[0] as string } }
  }
  if (mutatorName === 'useItem' && typeof args[0] === 'string') {
    const itemType = args[0] as ItemType
    if (!save.pet) return save
    const inv = [...save.inventory]
    const idx = inv.findIndex((i) => i.type === itemType && i.quantity > 0)
    if (idx < 0) return save
    inv[idx] = { ...inv[idx], quantity: inv[idx].quantity - 1 }
    const stats = useItem(itemType, save.pet.stats)
    let missions = save.missions
    if (itemType === 'food_basic' || itemType === 'food_premium' || itemType === 'water') {
      missions = missions.map((m) =>
        m.missionId === 'daily_feed_3'
          ? {
              ...m,
              progress: m.progress + 1,
              completed: m.progress + 1 >= (getMissionDefinition('daily_feed_3')?.target ?? 3)
            }
          : m
      )
    }
    return {
      ...save,
      inventory: inv.filter((i) => i.quantity > 0),
      missions,
      pet: {
        ...save.pet,
        stats,
        feedCount: save.pet.feedCount + (itemType === 'food_basic' || itemType === 'food_premium' || itemType === 'water' ? 1 : 0),
        animationState:
          itemType === 'food_basic' || itemType === 'food_premium' || itemType === 'water'
            ? 'eat'
            : save.pet.animationState
      }
    }
  }
  if (mutatorName === 'setQuickItemSlot' && typeof args[0] === 'number') {
    const index = args[0] as number
    const itemType = args[1] as ItemType | null
    const quickItemSlots = normalizeQuickItemSlots(save.quickItemSlots)
    if (index < 0 || index >= quickItemSlots.length) return save
    if (itemType !== null && !(itemType in ITEMS)) return save
    quickItemSlots[index] = itemType
    return { ...save, quickItemSlots }
  }
  if (mutatorName === 'claimMission' && typeof args[0] === 'string') {
    const missionId = args[0] as string
    const mission = save.missions.find((m) => m.missionId === missionId)
    const def = getMissionDefinition(missionId)
    if (!mission || !def || !mission.completed) return save

    const reward = def.reward
    if ('newEgg' in reward && !canAddPet(save)) return save

    let inventory = [...save.inventory]
    let pet = save.pet
    let collection = [...save.collection]
    let petSlotLimit = save.petSlotLimit

    if ('type' in reward) {
      const existing = inventory.find((i) => i.type === reward.type)
      if (existing) existing.quantity += reward.quantity
      else inventory.push({ type: reward.type, quantity: reward.quantity })
    } else if ('mood' in reward && pet) {
      pet = { ...pet, stats: { ...pet.stats, mood: Math.min(100, pet.stats.mood + reward.mood) } }
    } else if ('devPoints' in reward && pet) {
      pet = { ...pet, stats: { ...pet.stats, devPoints: Math.min(999, pet.stats.devPoints + reward.devPoints) } }
    } else if ('newEgg' in reward) {
      collection = [...collection, createEggPet()]
    } else if ('slots' in reward) {
      petSlotLimit = clampSlotLimit(petSlotLimit + reward.slots)
    }

    const missions = save.missions.map((m) =>
      m.missionId === missionId ? { ...m, completed: false, progress: 0 } : m
    )
    let next: GameSave = { ...save, inventory, pet, collection, petSlotLimit, missions }
    if (def.kind === 'daily') next = recordDailyMissionClaim(next)
    return next
  }
  return save
}
