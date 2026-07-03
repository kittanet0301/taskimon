import { app, BrowserWindow, ipcMain } from 'electron'
import { loadEnvFile } from './env'
import { createPetWindow, getPetWindow, setPetIgnoreMouse } from './petWindow'
import { createHubWindow, getHubWindow } from './hubWindow'
import { createTray, destroyTray } from './tray'
import {
  broadcastToWindows,
  forceCloudSave,
  getGameSave,
  hydrateFromSession,
  isDbMode,
  onSaveChange,
  registerPlaytimeTick,
  resetAllGameData,
  setCurrentUser,
  setGameSave,
  startActivityTracker,
  stopActivityTracker,
  updateSave
} from './gameState'
import type { GameSave, PetData } from '../../src/shared/types'
import { applyGamePatch } from '../../src/shared/gameMutators'
import { simulateBattle, randomBattleActions } from '../../src/shared/battle'
import {
  getSession,
  signIn,
  signOut,
  signUp,
  getProfile,
  syncPetToCloud,
  getActivePet,
  isSupabaseConfigured,
  searchProfileByFriendCode,
  sendFriendRequest,
  respondFriendRequest,
  listFriends,
  listPendingRequests,
  getFriendPet,
  saveBattleLog,
  sendChatMessage,
  getChatMessages,
  subscribeToChat,
  syncInventory,
  syncMissions
} from './supabase'

loadEnvFile()

const isDev = !app.isPackaged

function getAllWindows(): BrowserWindow[] {
  return BrowserWindow.getAllWindows()
}

function notifyAll(): void {
  broadcastToWindows(getAllWindows())
}

function setupIpc(): void {
  ipcMain.handle('game:get', () => getGameSave())

  ipcMain.handle('game:update', (_event, payload: string) => {
    const save = JSON.parse(payload) as GameSave
    return setGameSave(save)
  })

  ipcMain.handle('game:patch', (_event, mutatorName: string, args: unknown[]) => {
    return updateSave((save) => applyGamePatch(save, mutatorName, args))
  })

  ipcMain.handle('pet:setIgnoreMouse', (_event, ignore: boolean) => {
    setPetIgnoreMouse(ignore, true)
  })

  ipcMain.handle('hub:open', () => createHubWindow())

  ipcMain.handle('supabase:configured', () => isSupabaseConfigured())
  ipcMain.handle('cloud:isDbMode', () => isDbMode())
  ipcMain.handle('cloud:forceSave', async () => forceCloudSave())
  ipcMain.handle('cloud:resetAll', async () => resetAllGameData())
  ipcMain.handle('cloud:reload', async () => hydrateFromSession())

  ipcMain.handle('auth:signup', async (_e, email: string, password: string, username: string) => {
    const data = await signUp(email, password, username)
    if (data.session?.user?.id) await setCurrentUser(data.session.user.id)
    return data
  })
  ipcMain.handle('auth:signin', async (_e, email: string, password: string) => {
    const data = await signIn(email, password)
    if (data.session?.user?.id) await setCurrentUser(data.session.user.id)
    return data
  })
  ipcMain.handle('auth:signout', async () => {
    await signOut()
    await setCurrentUser(null)
  })
  ipcMain.handle('auth:session', async () => getSession())
  ipcMain.handle('auth:profile', async (_e, userId: string) => getProfile(userId))

  ipcMain.handle('cloud:syncPet', async (_e, userId: string, pet: PetData) => {
    const mapped = {
      id: pet.id,
      name: pet.name,
      species: pet.species,
      element: pet.element,
      gender: pet.gender,
      stage: pet.stage,
      hp: pet.stats.hp,
      mood: pet.stats.mood,
      dev_points: pet.stats.devPoints,
      hatched_at: pet.hatchedAt,
      created_at: pet.createdAt
    }
    return syncPetToCloud(userId, mapped)
  })

  ipcMain.handle('cloud:getPet', async (_e, userId: string) => getActivePet(userId))

  ipcMain.handle('friends:search', async (_e, code: string) => searchProfileByFriendCode(code))
  ipcMain.handle('friends:request', async (_e, userId: string, friendId: string) =>
    sendFriendRequest(userId, friendId)
  )
  ipcMain.handle('friends:respond', async (_e, requestId: string, accept: boolean) =>
    respondFriendRequest(requestId, accept)
  )
  ipcMain.handle('friends:list', async (_e, userId: string) => listFriends(userId))
  ipcMain.handle('friends:pending', async (_e, userId: string) => listPendingRequests(userId))
  ipcMain.handle('friends:pet', async (_e, ownerId: string) => getFriendPet(ownerId))

  ipcMain.handle('battle:simulate', async (_e, challenger: PetData, defender: PetData) => {
    const result = simulateBattle(challenger, defender, randomBattleActions(), randomBattleActions())
    if (isSupabaseConfigured()) {
      await saveBattleLog({
        challenger_pet_id: challenger.id,
        defender_pet_id: defender.id,
        winner_pet_id: result.winnerPetId,
        battle_log: result.log
      }).catch(() => undefined)
    }
    return result
  })

  ipcMain.handle('chat:send', async (_e, senderId: string, receiverId: string, content: string) =>
    sendChatMessage(senderId, receiverId, content)
  )
  ipcMain.handle('chat:history', async (_e, userId: string, friendId: string) =>
    getChatMessages(userId, friendId)
  )
  ipcMain.handle('chat:subscribe', (event, userId: string) => {
    const wc = event.sender
    const unsubscribe = subscribeToChat(userId, (payload) => {
      wc.send('chat:message', payload)
    })
    return true
  })

  ipcMain.handle('cloud:syncInventory', async (_e, userId: string, inventory: GameSave['inventory']) =>
    syncInventory(
      userId,
      inventory.map((i) => ({ item_type: i.type, quantity: i.quantity }))
    )
  )

  ipcMain.handle('cloud:syncMissions', async (_e, userId: string, missions: GameSave['missions']) =>
    syncMissions(
      userId,
      missions.map((m) => ({
        mission_id: m.missionId,
        progress: m.progress,
        completed: m.completed,
        reset_at: m.resetAt
      }))
    )
  )
}

app.whenReady().then(async () => {
  setupIpc()
  createPetWindow()
  createTray({
    getSave: getGameSave,
    onTogglePet: () => {
      const win = getPetWindow()
      if (!win) return
      if (win.isVisible()) win.hide()
      else win.show()
    },
    onQuit: () => app.quit()
  })

  await startActivityTracker()
  registerPlaytimeTick()
  await hydrateFromSession()

  onSaveChange(() => notifyAll())

  if (isDev) {
    createHubWindow()
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createPetWindow()
    } else {
      getHubWindow()?.focus()
    }
  })
})

app.on('before-quit', () => {
  stopActivityTracker()
  destroyTray()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
