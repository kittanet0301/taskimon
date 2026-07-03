import type { BrowserWindow } from 'electron'
import type { GameSave } from '../../src/shared/types'
import {
  CLICKS_PER_DEV,
  KEYS_PER_DEV,
  MAX_DEV_PER_HOUR
} from '../../src/shared/constants'
import { addDevPoints } from '../../src/shared/stats'
import { updateMissionProgress } from '../../src/shared/missions'
import { loadSave, writeSave } from './storage'
import { refreshTray } from './tray'
import {
  bootstrapGameSaveInDb,
  loadGameSaveFromDb,
  saveGameSaveToDb,
  canUseCloudStorage
} from './cloudStorage'
import { getSession } from './supabase'

let hookStarted = false
let saveRef: GameSave = loadSave()
let currentUserId: string | null = null
let cloudSaveTimer: ReturnType<typeof setTimeout> | null = null
let cloudSyncing = false

type ActivityListener = (save: GameSave) => void
const listeners = new Set<ActivityListener>()

export function getCurrentUserId(): string | null {
  return currentUserId
}

export function isDbMode(): boolean {
  return currentUserId !== null && canUseCloudStorage()
}

export async function hydrateFromSession(): Promise<GameSave> {
  if (!canUseCloudStorage()) return saveRef
  const session = await getSession()
  if (!session?.user?.id) return saveRef
  return setCurrentUser(session.user.id)
}

export async function setCurrentUser(userId: string | null): Promise<GameSave> {
  currentUserId = userId
  if (!userId) {
    saveRef = loadSave()
    broadcast()
    refreshTray(getGameSave)
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
  refreshTray(getGameSave)
  return saveRef
}

export function getGameSave(): GameSave {
  return saveRef
}

function scheduleCloudPersist(save: GameSave): void {
  if (!currentUserId || !canUseCloudStorage() || cloudSyncing) return
  if (cloudSaveTimer) clearTimeout(cloudSaveTimer)
  cloudSaveTimer = setTimeout(() => {
    cloudSyncing = true
    saveGameSaveToDb(currentUserId!, save)
      .then(() => console.log('[cloud] saved'))
      .catch((err) => console.error('[cloud] save failed:', err))
      .finally(() => {
        cloudSyncing = false
      })
  }, 1500)
}

export function setGameSave(save: GameSave, options?: { skipCloud?: boolean }): GameSave {
  saveRef = save
  writeSave(saveRef)
  if (!options?.skipCloud) scheduleCloudPersist(saveRef)
  broadcast()
  refreshTray(getGameSave)
  return saveRef
}

export function updateSave(mutator: (save: GameSave) => GameSave): GameSave {
  return setGameSave(mutator(saveRef))
}

function broadcast(): void {
  for (const listener of listeners) listener(saveRef)
}

export function onSaveChange(listener: ActivityListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
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

function onClick(): void {
  updateSave((save) => {
    let next = {
      ...save,
      activity: {
        ...save.activity,
        clicks: save.activity.clicks + 1
      }
    }
    next.missions = updateMissionProgress(next.missions, 'daily_click_200', 1)
    if (next.activity.clicks % CLICKS_PER_DEV === 0) {
      next = grantDevPoint(next)
    }
    return next
  })
}

function onKey(): void {
  updateSave((save) => {
    let next = {
      ...save,
      activity: {
        ...save.activity,
        keystrokes: save.activity.keystrokes + 1
      }
    }
    next.missions = updateMissionProgress(next.missions, 'daily_type_500', 1)
    if (next.activity.keystrokes % KEYS_PER_DEV === 0) {
      next = grantDevPoint(next)
    }
    return next
  })
}

export async function startActivityTracker(): Promise<void> {
  if (hookStarted) return
  try {
    const { uIOhook, UiohookKey } = await import('uiohook-napi')
    uIOhook.on('mousedown', onClick)
    uIOhook.on('keydown', (event) => {
      if (event.keycode === UiohookKey.ESC) return
      onKey()
    })
    uIOhook.start()
    hookStarted = true
    console.log('[activity] Global input tracker started')
  } catch (error) {
    console.warn('[activity] uiohook unavailable, using in-app fallback only:', error)
  }
}

export function stopActivityTracker(): void {
  if (!hookStarted) return
  import('uiohook-napi')
    .then(({ uIOhook }) => uIOhook.stop())
    .catch(() => undefined)
  hookStarted = false
}

export function registerPlaytimeTick(): void {
  setInterval(() => {
    updateSave((save) => {
      const next = {
        ...save,
        totalPlaySeconds: save.totalPlaySeconds + 60
      }
      next.missions = updateMissionProgress(next.missions, 'daily_play_1h', 60)
      return next
    })
  }, 60_000)
}

export function broadcastToWindows(windows: BrowserWindow[]): void {
  const payload = JSON.stringify(saveRef)
  for (const win of windows) {
    if (!win.isDestroyed()) {
      win.webContents.send('game:updated', payload)
    }
  }
}

export async function forceCloudSave(): Promise<void> {
  if (!currentUserId) throw new Error('Not logged in')
  if (cloudSaveTimer) {
    clearTimeout(cloudSaveTimer)
    cloudSaveTimer = null
  }
  cloudSyncing = true
  try {
    await saveGameSaveToDb(currentUserId, saveRef)
  } finally {
    cloudSyncing = false
  }
}
