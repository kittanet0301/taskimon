import type { GameSave, ItemType } from './types'
import { hatchPet, evolvePet, createEggPet } from './growth'
import { canEvolveToAdult } from './stats'
import { useItem } from './items'
import { getMissionDefinition, resetExpiredMissions } from './missions'

export function applyGamePatch(save: GameSave, mutatorName: string, args: unknown[] = []): GameSave {
  if (mutatorName === 'hatch') {
    if (!save.pet) return save
    let next = { ...save, pet: hatchPet(save.pet) }
    next.missions = resetExpiredMissions(next.missions)
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
    return { ...save, pet: createEggPet() }
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
    if (itemType === 'food_basic' || itemType === 'food_premium') {
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
        feedCount: save.pet.feedCount + (itemType.startsWith('food') ? 1 : 0),
        animationState: itemType.startsWith('food') ? 'eat' : save.pet.animationState
      }
    }
  }
  if (mutatorName === 'claimMission' && typeof args[0] === 'string') {
    const missionId = args[0] as string
    const mission = save.missions.find((m) => m.missionId === missionId)
    const def = getMissionDefinition(missionId)
    if (!mission || !def || !mission.completed) return save
    let inventory = [...save.inventory]
    let pet = save.pet
    const reward = def.reward
    if ('type' in reward) {
      const existing = inventory.find((i) => i.type === reward.type)
      if (existing) existing.quantity += reward.quantity
      else inventory.push({ type: reward.type, quantity: reward.quantity })
    } else if ('mood' in reward && pet) {
      pet = { ...pet, stats: { ...pet.stats, mood: Math.min(100, pet.stats.mood + reward.mood) } }
    } else if ('devPoints' in reward && pet) {
      pet = { ...pet, stats: { ...pet.stats, devPoints: Math.min(999, pet.stats.devPoints + reward.devPoints) } }
    }
    const missions = save.missions.map((m) =>
      m.missionId === missionId ? { ...m, completed: false, progress: 0 } : m
    )
    return { ...save, inventory, pet, missions }
  }
  return save
}
