import type { GameSave } from '@shared/types'
import { createDefaultSave } from '@shared/growth'
import { applyMoodDecay } from '@shared/stats'
import { resetExpiredMissions } from '@shared/missions'

const STORAGE_KEY = 'taskimon-save'

function applyOfflineDecay(save: GameSave): GameSave {
  const lastSaved = new Date(save.lastSaved).getTime()
  const hoursAway = (Date.now() - lastSaved) / 3_600_000
  let next = { ...save }
  next.missions = resetExpiredMissions(next.missions)
  if (next.pet && hoursAway > 0.1) {
    next.pet = {
      ...next.pet,
      stats: applyMoodDecay(next.pet.stats, hoursAway)
    }
  }
  return next
}

export function loadSave(): GameSave {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const save = createDefaultSave()
      writeSave(save)
      return save
    }
    return applyOfflineDecay(JSON.parse(raw) as GameSave)
  } catch {
    const save = createDefaultSave()
    writeSave(save)
    return save
  }
}

export function writeSave(save: GameSave): void {
  const next = { ...save, lastSaved: new Date().toISOString() }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}
