import type { GameSave } from '@shared/types'
import { createDefaultSave, migrateSave } from '@shared/growth'
import { applyMoodDecay } from '@shared/stats'
import { applyDailyResets } from '@shared/missions'

const STORAGE_KEY = 'taskino-save'
const LEGACY_STORAGE_KEY = 'taskimon-save'

function readStoredSave(): string | null {
  const current = localStorage.getItem(STORAGE_KEY)
  if (current) return current
  const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
  if (legacy) {
    localStorage.setItem(STORAGE_KEY, legacy)
    return legacy
  }
  return null
}

function applyOfflineDecay(save: GameSave): GameSave {
  const lastSaved = new Date(save.lastSaved).getTime()
  const hoursAway = (Date.now() - lastSaved) / 3_600_000
  let next = applyDailyResets(save)
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
    const raw = readStoredSave()
    if (!raw) {
      const save = createDefaultSave()
      writeSave(save)
      return save
    }
    return applyOfflineDecay(migrateSave(JSON.parse(raw) as GameSave))
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
