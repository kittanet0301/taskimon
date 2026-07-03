import type { GameSave } from '@shared/types'
import { CLICKS_PER_DEV, KEYS_PER_DEV, MAX_DEV_PER_HOUR } from '@shared/constants'
import { addDevPoints } from '@shared/stats'
import { updateMissionProgress } from '@shared/missions'
import { applyGamePatch } from '@shared/gameMutators'
import { applyDailyResets } from '@shared/missions'
import { loadSave, writeSave } from './storage'
import {
  bootstrapGameSaveInDb,
  canUseCloudStorage,
  loadGameSaveFromDb,
  resetGameDataInDb,
  resetSystemDataInDb,
  saveGameSaveToDb
} from './cloudStorage'
import { getSession } from './supabase'

let saveRef: GameSave = loadSave()
let currentUserId: string | null = null
let cloudSaveTimer: ReturnType<typeof setTimeout> | null = null
let cloudSavePromise: Promise<void> | null = null
let cloudSaveGeneration = 0
let cloudSyncing = false

type SaveListener = (save: GameSave) => void
const listeners = new Set<SaveListener>()

function broadcast(): void {
  for (const listener of listeners) listener(saveRef)
}

async function persistCloudIfCurrent(generation: number): Promise<void> {
  if (!currentUserId || generation !== cloudSaveGeneration) return
  await saveGameSaveToDb(currentUserId, saveRef)
}

function scheduleCloudPersist(): void {
  if (!currentUserId || !canUseCloudStorage()) return
  if (cloudSaveTimer) clearTimeout(cloudSaveTimer)
  cloudSaveTimer = setTimeout(() => {
    cloudSaveTimer = null
    const generation = cloudSaveGeneration
    cloudSyncing = true
    const promise = persistCloudIfCurrent(generation)
      .then(() => {
        if (generation === cloudSaveGeneration) console.log('[cloud] saved')
      })
      .catch((err) => {
        if (generation === cloudSaveGeneration) console.error('[cloud] save failed:', err)
      })
      .finally(() => {
        if (cloudSavePromise === promise) cloudSavePromise = null
        if (generation === cloudSaveGeneration) cloudSyncing = false
      })
    cloudSavePromise = promise
  }, 1500)
}

export function getGameSave(): GameSave {
  const next = applyDailyResets(saveRef)
  if (next !== saveRef) {
    saveRef = next
    writeSave(saveRef)
    scheduleCloudPersist()
    broadcast()
  }
  return saveRef
}

export function isDbMode(): boolean {
  return currentUserId !== null && canUseCloudStorage()
}

export function onSaveChange(listener: SaveListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function setGameSave(save: GameSave, options?: { skipCloud?: boolean }): GameSave {
  saveRef = save
  writeSave(saveRef)
  if (!options?.skipCloud) scheduleCloudPersist()
  broadcast()
  return saveRef
}

export function updateSave(mutator: (save: GameSave) => GameSave): GameSave {
  const reset = applyDailyResets(saveRef)
  if (reset !== saveRef) saveRef = reset
  return setGameSave(mutator(saveRef))
}

export function patchSave(mutatorName: string, args: unknown[] = []): GameSave {
  return updateSave((save) => applyGamePatch(save, mutatorName, args))
}

export async function forceCloudSave(): Promise<void> {
  if (!currentUserId) throw new Error('Not logged in')
  cloudSaveGeneration++
  if (cloudSaveTimer) {
    clearTimeout(cloudSaveTimer)
    cloudSaveTimer = null
  }
  if (cloudSavePromise) {
    await cloudSavePromise.catch(() => {})
  }
  cloudSyncing = true
  try {
    await saveGameSaveToDb(currentUserId, saveRef)
  } finally {
    cloudSyncing = false
  }
}

export async function clearMyGameData(): Promise<GameSave> {
  if (!currentUserId) throw new Error('Not logged in')
  cloudSaveGeneration++
  if (cloudSaveTimer) {
    clearTimeout(cloudSaveTimer)
    cloudSaveTimer = null
  }
  if (cloudSavePromise) {
    await cloudSavePromise.catch(() => {})
  }
  cloudSyncing = true
  try {
    saveRef = await resetGameDataInDb(currentUserId)
    writeSave(saveRef)
    broadcast()
    return saveRef
  } finally {
    cloudSyncing = false
  }
}

export async function resetSystemGameData(): Promise<GameSave> {
  if (!currentUserId) throw new Error('Not logged in')
  cloudSaveGeneration++
  if (cloudSaveTimer) {
    clearTimeout(cloudSaveTimer)
    cloudSaveTimer = null
  }
  if (cloudSavePromise) {
    await cloudSavePromise.catch(() => {})
  }
  cloudSyncing = true
  try {
    saveRef = await resetSystemDataInDb(currentUserId)
    writeSave(saveRef)
    broadcast()
    return saveRef
  } finally {
    cloudSyncing = false
  }
}

export async function setCurrentUser(userId: string | null): Promise<GameSave> {
  currentUserId = userId
  if (!userId) {
    saveRef = loadSave()
    broadcast()
    return saveRef
  }

  try {
    const cloudSave = await loadGameSaveFromDb(userId)
    if (cloudSave) {
      saveRef = cloudSave
      writeSave(saveRef)
    } else {
      saveRef = await bootstrapGameSaveInDb(userId, saveRef)
      writeSave(saveRef)
    }
  } catch (error) {
    console.error('[cloud] load failed, using local cache:', error)
    saveRef = loadSave()
  }

  broadcast()
  return saveRef
}

export async function hydrateFromSession(): Promise<GameSave> {
  if (!canUseCloudStorage()) return saveRef
  const session = await getSession()
  if (!session?.user?.id) return saveRef
  return setCurrentUser(session.user.id)
}

function maybeResetHourlyCap(save: GameSave): GameSave {
  const hourMs = 3_600_000
  const started = new Date(save.activity.hourStartedAt).getTime()
  if (Date.now() - started >= hourMs) {
    return {
      ...save,
      activity: {
        ...save.activity,
        devPointsThisHour: 0,
        hourStartedAt: new Date().toISOString()
      }
    }
  }
  return save
}

function grantDevPoint(save: GameSave): GameSave {
  save = maybeResetHourlyCap(save)
  if (save.activity.devPointsThisHour >= MAX_DEV_PER_HOUR) return save
  if (!save.pet) return save

  let next = {
    ...save,
    activity: {
      ...save.activity,
      devPointsThisHour: save.activity.devPointsThisHour + 1
    },
    pet: {
      ...save.pet,
      stats: addDevPoints(save.pet.stats, 1)
    }
  }
  next.missions = updateMissionProgress(next.missions, 'weekly_dev_100', 1)
  return next
}

export function recordClick(): void {
  updateSave((save) => {
    let next = {
      ...save,
      activity: { ...save.activity, clicks: save.activity.clicks + 1 }
    }
    next.missions = updateMissionProgress(next.missions, 'daily_click_200', 1)
    if (next.activity.clicks % CLICKS_PER_DEV === 0) next = grantDevPoint(next)
    return next
  })
}

export function recordKey(): void {
  updateSave((save) => {
    let next = {
      ...save,
      activity: { ...save.activity, keystrokes: save.activity.keystrokes + 1 }
    }
    next.missions = updateMissionProgress(next.missions, 'daily_type_500', 1)
    if (next.activity.keystrokes % KEYS_PER_DEV === 0) next = grantDevPoint(next)
    return next
  })
}

export function registerPlaytimeTick(): () => void {
  const id = setInterval(() => {
    updateSave((save) => {
      const next = { ...save, totalPlaySeconds: save.totalPlaySeconds + 60 }
      next.missions = updateMissionProgress(next.missions, 'daily_play_1h', 60)
      return next
    })
  }, 60_000)
  return () => clearInterval(id)
}
