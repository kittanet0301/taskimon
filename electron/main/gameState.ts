import type { BrowserWindow } from 'electron'
import type { GameSave } from '../../src/shared/types'
import { SAVE_VERSION, getClicksPerDev, getKeysPerDev, getMaxDevPerHour } from '../../src/shared/constants'
import { createDefaultSave, migrateSave } from '../../src/shared/growth'
import { addDevPoints } from '../../src/shared/stats'
import { updateMissionProgress, applyDailyResets } from '../../src/shared/missions'
import { applyMinigameDailyReset } from '../../src/shared/minigame'
import { getPetLevel } from '../../src/shared/activityScore'
import { rollGrowthCardOffers } from '../../src/shared/combatStats'
import type { GrowthCardId } from '../../src/shared/combatStats'
import { loadSave, writeSave } from './storage'
import { refreshTray } from './tray'
import {
  bootstrapGameSaveInDb,
  loadGameSaveFromDb,
  resetGameDataInDb,
  saveGameSaveToDb,
  canUseCloudStorage
} from './cloudStorage'
import { getSession, getProfile } from './supabase'
import { setSessionIsAdmin } from '../../src/shared/gameMutators'
import { isAdminRole } from '../../src/shared/userRole'

let hookStarted = false
let rendererFallback = false
let trackerReady = false
let saveRef: GameSave = loadSave()
let currentUserId: string | null = null
let cloudSaveTimer: ReturnType<typeof setTimeout> | null = null
let cloudSavePromise: Promise<void> | null = null
let cloudSaveGeneration = 0
/** Sticky until a cloud persist that includes inventory succeeds. */
let pendingSyncInventory = false
let cloudSyncing = false

type ActivityListener = (save: GameSave) => void
const listeners = new Set<ActivityListener>()

export function getCurrentUserId(): string | null {
  return currentUserId
}

export function isUserLoggedIn(): boolean {
  return currentUserId !== null
}

function toDisplaySave(save: GameSave): GameSave {
  if (isUserLoggedIn() || !save.pet) return save
  return {
    ...save,
    pet: {
      ...save.pet,
      stage: 'egg',
      animationState: 'egg_idle'
    }
  }
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
    setSessionIsAdmin(false)
    saveRef = loadSave()
    broadcast()
    refreshTray(getGameSave)
    return saveRef
  }

  try {
    const profile = await getProfile(userId)
    setSessionIsAdmin(isAdminRole((profile as { role?: string } | null)?.role))
  } catch {
    setSessionIsAdmin(false)
  }

  try {
    const cloudSave = await loadGameSaveFromDb(userId)
    if (cloudSave) {
      const priorVersion = cloudSave.version
      saveRef = migrateSave(cloudSave)
      writeSave(saveRef)
      if (priorVersion < SAVE_VERSION) {
        saveRef = await saveGameSaveToDb(userId, saveRef)
        writeSave(saveRef)
      }
    } else {
      saveRef = await bootstrapGameSaveInDb(userId, createDefaultSave())
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
  let next = applyDailyResets(saveRef)
  const minigameReset = applyMinigameDailyReset(next)
  if (minigameReset !== next) next = minigameReset
  if (next !== saveRef) {
    saveRef = next
    writeSave(saveRef)
    scheduleCloudPersist()
    broadcast()
    refreshTray(getGameSave)
  }
  return toDisplaySave(saveRef)
}

function scheduleCloudPersist(options?: { syncInventory?: boolean }): void {
  if (!currentUserId || !canUseCloudStorage()) return
  if (options?.syncInventory) pendingSyncInventory = true
  if (cloudSaveTimer) clearTimeout(cloudSaveTimer)
  // Invalidate older scheduled/in-flight saves so they cannot overwrite a newer local state.
  const generation = ++cloudSaveGeneration
  const syncInventory = pendingSyncInventory
  cloudSaveTimer = setTimeout(() => {
    cloudSaveTimer = null
    if (generation !== cloudSaveGeneration) return
    cloudSyncing = true
    const promise = persistCloudIfCurrent(generation, { syncInventory })
      .then(() => {
        if (generation === cloudSaveGeneration) {
          if (syncInventory) pendingSyncInventory = false
          console.log('[cloud] saved')
        }
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

async function persistCloudIfCurrent(
  generation: number,
  options?: { syncInventory?: boolean }
): Promise<void> {
  if (!currentUserId || generation !== cloudSaveGeneration) return
  // Activity autosaves must not rewrite inventory — that wipes gifts still only on the server.
  const saved = await saveGameSaveToDb(currentUserId, saveRef, {
    skipInventory: !options?.syncInventory
  })
  if (generation !== cloudSaveGeneration) return
  if (saved !== saveRef) {
    saveRef = saved
    writeSave(saveRef)
    broadcast()
    refreshTray(getGameSave)
  }
}

export function setGameSave(
  save: GameSave,
  options?: { skipCloud?: boolean; syncInventory?: boolean }
): GameSave {
  saveRef = save
  writeSave(saveRef)
  if (!options?.skipCloud) scheduleCloudPersist({ syncInventory: options?.syncInventory })
  broadcast()
  refreshTray(getGameSave)
  return saveRef
}

export function updateSave(mutator: (save: GameSave) => GameSave): GameSave {
  let reset = applyDailyResets(saveRef)
  const minigameReset = applyMinigameDailyReset(reset)
  if (minigameReset !== reset) reset = minigameReset
  if (reset !== saveRef) saveRef = reset
  const prevInventory = JSON.stringify(saveRef.inventory)
  const next = mutator(saveRef)
  const syncInventory = JSON.stringify(next.inventory) !== prevInventory
  return setGameSave(next, { syncInventory })
}

function broadcast(): void {
  const display = toDisplaySave(saveRef)
  for (const listener of listeners) listener(display)
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
        evolutionThisHour: 0,
        hourStartedAt: new Date().toISOString()
      }
    }
  }
  return save
}

function grantDevPoint(save: GameSave): GameSave {
  save = maybeResetHourlyCap(save)
  if (save.activity.evolutionThisHour >= getMaxDevPerHour()) return save
  if (!save.pet) return save

  const prevPet = save.pet
  const nextStats = addDevPoints(save.pet.stats, 1)
  let nextPet = { ...save.pet, stats: nextStats }
  if (prevPet.stage !== 'egg') {
    const prevLvl = getPetLevel(prevPet.stage, prevPet.stats.evolution)
    const nextLvl = getPetLevel(nextPet.stage, nextPet.stats.evolution)
    const gained = nextLvl - prevLvl
    if (gained > 0) {
      const pending: GrowthCardId[] = nextPet.pendingGrowthOffers ?? []
      for (let i = 0; i < gained; i++) {
        for (const o of rollGrowthCardOffers()) pending.push(o.id)
      }
      nextPet = {
        ...nextPet,
        skillUpgradePoints: nextPet.skillUpgradePoints + gained,
        pendingGrowthOffers: pending.length > 0 ? pending : null
      }
    }
  }

  let next = {
    ...save,
    activity: {
      ...save.activity,
      evolutionThisHour: save.activity.evolutionThisHour + 1
    },
    pet: nextPet
  }
  next.missions = updateMissionProgress(next.missions, 'weekly_dev_100', 1)
  next.missions = updateMissionProgress(next.missions, 'weekly_egg_1', 1)
  return next
}

function onClick(): void {
  if (!isUserLoggedIn()) return
  updateSave((save) => {
    let next = {
      ...save,
      activity: {
        ...save.activity,
        clicks: save.activity.clicks + 1
      }
    }
    next.missions = updateMissionProgress(next.missions, 'daily_click_200', 1)
    if (next.activity.clicks % getClicksPerDev() === 0) {
      next = grantDevPoint(next)
    }
    return next
  })
}

function onKey(): void {
  if (!isUserLoggedIn()) return
  updateSave((save) => {
    let next = {
      ...save,
      activity: {
        ...save.activity,
        keystrokes: save.activity.keystrokes + 1
      }
    }
    next.missions = updateMissionProgress(next.missions, 'daily_type_500', 1)
    if (next.activity.keystrokes % getKeysPerDev() === 0) {
      next = grantDevPoint(next)
    }
    return next
  })
}

export function isGlobalActivityTracking(): boolean {
  return hookStarted
}

export function needsRendererActivityFallback(): boolean {
  return rendererFallback
}

export function isActivityTrackerReady(): boolean {
  return trackerReady
}

export function recordActivityClick(): void {
  if (!isUserLoggedIn()) return
  onClick()
}

export function recordActivityKey(): void {
  if (!isUserLoggedIn()) return
  onKey()
}

export async function startActivityTracker(): Promise<void> {
  if (hookStarted || rendererFallback) return
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
    rendererFallback = true
    console.warn('[activity] uiohook unavailable, using in-app fallback only:', error)
  } finally {
    trackerReady = true
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
    if (!isUserLoggedIn()) return
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
  const payload = JSON.stringify(toDisplaySave(saveRef))
  for (const win of windows) {
    if (!win.isDestroyed()) {
      win.webContents.send('game:updated', payload)
    }
  }
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
    // Full save including inventory, reconciling any gifts received since last pull.
    saveRef = await saveGameSaveToDb(currentUserId, saveRef)
    writeSave(saveRef)
    pendingSyncInventory = false
    broadcast()
    refreshTray(getGameSave)
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
    refreshTray(getGameSave)
    return saveRef
  } finally {
    cloudSyncing = false
  }
}
