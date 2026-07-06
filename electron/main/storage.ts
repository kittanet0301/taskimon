import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import type { GameSave } from '../../src/shared/types'
import { createDefaultSave, migrateSave } from '../../src/shared/growth'
import { applyMoodDecay } from '../../src/shared/stats'
import { applyDailyResets } from '../../src/shared/missions'

const SAVE_FILE = 'pet-save.json'

function getSavePath(): string {
  return join(app.getPath('userData'), SAVE_FILE)
}

export function loadSave(): GameSave {
  const path = getSavePath()
  if (!existsSync(path)) {
    const save = createDefaultSave()
    writeSave(save)
    return save
  }
  try {
    const raw = readFileSync(path, 'utf-8')
    const save = migrateSave(JSON.parse(raw) as GameSave)
    return applyOfflineDecay(save)
  } catch {
    const save = createDefaultSave()
    writeSave(save)
    return save
  }
}

export function writeSave(save: GameSave): void {
  const dir = app.getPath('userData')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  save.lastSaved = new Date().toISOString()
  writeFileSync(getSavePath(), JSON.stringify(save, null, 2), 'utf-8')
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
