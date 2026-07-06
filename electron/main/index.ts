import { app, BrowserWindow, ipcMain } from 'electron'
import { loadEnvFile } from './env'
import { createPetWindow, getPetWindow, setPetIgnoreMouse } from './petWindow'
import { createHubWindow, getHubWindow } from './hubWindow'
import { createTray, destroyTray, refreshTray } from './tray'
import { setMainLocale } from './locale'
import {
  broadcastToWindows,
  forceCloudSave,
  getGameSave,
  hydrateFromSession,
  isDbMode,
  onSaveChange,
  registerPlaytimeTick,
  clearMyGameData,
  resetSystemGameData,
  setCurrentUser,
  setGameSave,
  startActivityTracker,
  stopActivityTracker,
  isGlobalActivityTracking,
  needsRendererActivityFallback,
  isActivityTrackerReady,
  recordActivityClick,
  recordActivityKey,
  updateSave
} from './gameState'
import type { GameSave, PetData } from '../../src/shared/types'
import { applyGamePatch } from '../../src/shared/gameMutators'
import {
  getSession,
  signIn,
  signOut,
  signUp,
  resetPasswordByBirthdate,
  updatePassword,
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
  createBattleRoom,
  joinBattleRoom,
  leaveBattleRoom,
  forfeitBattleRoom,
  listPublicRooms,
  getRoomMembers,
  startRoomDuel,
  submitBattleAction,
  listBattles,
  getBattleTurns,
  subscribeToBattles,
  subscribeToBattleRoom,
  sendChatMessage,
  getChatMessages,
  subscribeToChat,
  listChatRooms,
  joinChatRoom,
  leaveChatRoom,
  getChatRoomMembers,
  sendChatRoomMessage,
  updateChatRoomPosition,
  subscribeToChatRoom,
  syncInventory,
  syncMissions
} from './supabase'

let activeBattleRoomId: string | null = null
let chatRoomUnsubscribe: (() => void) | null = null

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

  ipcMain.handle('activity:status', () => ({
    global: isGlobalActivityTracking(),
    fallback: needsRendererActivityFallback(),
    ready: isActivityTrackerReady()
  }))
  ipcMain.handle('activity:click', () => {
    recordActivityClick()
  })
  ipcMain.handle('activity:key', () => {
    recordActivityKey()
  })

  ipcMain.handle('pet:setIgnoreMouse', (_event, ignore: boolean) => {
    setPetIgnoreMouse(ignore, true)
  })

  ipcMain.handle('hub:open', () => createHubWindow())

  ipcMain.handle('supabase:configured', () => isSupabaseConfigured())
  ipcMain.handle('cloud:isDbMode', () => isDbMode())
  ipcMain.handle('cloud:forceSave', async () => forceCloudSave())
  ipcMain.handle('cloud:clearMyData', async () => clearMyGameData())
  ipcMain.handle('cloud:resetSystem', async () => resetSystemGameData())
  ipcMain.handle('cloud:reload', async () => hydrateFromSession())

  ipcMain.handle('auth:signup', async (_e, email: string, password: string, username: string, birthDate: string) => {
    const data = await signUp(email, password, username, birthDate)
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
  ipcMain.handle('auth:updatePassword', async (_e, password: string) => {
    await updatePassword(password)
  })
  ipcMain.handle('auth:resetPasswordByBirthdate', async (_e, email: string) => {
    await resetPasswordByBirthdate(email)
  })
  ipcMain.handle('auth:session', async () => getSession())
  ipcMain.handle('auth:profile', async (_e, userId: string) => getProfile(userId))
  ipcMain.handle('locale:set', (_e, locale: 'en' | 'th') => {
    setMainLocale(locale)
    refreshTray(getGameSave)
  })

  ipcMain.handle('cloud:syncPet', async (_e, userId: string, pet: PetData) => {
    const mapped = {
      id: pet.id,
      name: pet.name,
      species: pet.character,
      element: 'none',
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

  ipcMain.handle('room:create', async (_e, name?: string) => {
    const room = await createBattleRoom(name)
    if (room && typeof room === 'object' && 'id' in room) {
      activeBattleRoomId = String((room as { id: string }).id)
    }
    return room
  })
  ipcMain.handle('room:join', async (_e, roomCode: string) => {
    const room = await joinBattleRoom(roomCode)
    if (room && typeof room === 'object' && 'id' in room) {
      activeBattleRoomId = String((room as { id: string }).id)
    }
    return room
  })
  ipcMain.handle('room:leave', async (_e, roomId: string) => {
    await leaveBattleRoom(roomId)
    if (activeBattleRoomId === roomId) activeBattleRoomId = null
  })
  ipcMain.handle('room:forfeit', async (_e, roomId: string) => {
    await forfeitBattleRoom(roomId)
    if (activeBattleRoomId === roomId) activeBattleRoomId = null
  })
  ipcMain.handle('room:listPublic', async () => listPublicRooms())
  ipcMain.handle('room:getMembers', async (_e, roomId: string) => getRoomMembers(roomId))
  ipcMain.handle('room:startDuel', async (_e, roomId: string, opponentUserId: string) =>
    startRoomDuel(roomId, opponentUserId)
  )
  ipcMain.handle('room:subscribe', (event, roomId: string) => {
    const wc = event.sender
    subscribeToBattleRoom(roomId, (payload) => {
      wc.send('battle:update', payload)
    })
    return true
  })

  ipcMain.handle('battle:submitAction', async (_e, sessionId: string, action: string) =>
    submitBattleAction(sessionId, action)
  )
  ipcMain.handle('battle:list', async () => listBattles())
  ipcMain.handle('battle:getTurns', async (_e, sessionId: string) => getBattleTurns(sessionId))
  ipcMain.handle('battle:subscribe', (event, userId: string) => {
    const wc = event.sender
    const unsubscribe = subscribeToBattles(userId, (payload) => {
      wc.send('battle:update', payload)
    })
    return true
  })
  ipcMain.handle('battle:setActiveRoom', (_e, roomId: string | null) => {
    activeBattleRoomId = roomId
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

  ipcMain.handle('chatRoom:list', async () => listChatRooms())
  ipcMain.handle('chatRoom:join', async (_e, roomId: string) => joinChatRoom(roomId))
  ipcMain.handle('chatRoom:leave', async (_e, roomId: string) => leaveChatRoom(roomId))
  ipcMain.handle('chatRoom:members', async (_e, roomId: string) => getChatRoomMembers(roomId))
  ipcMain.handle('chatRoom:send', async (_e, roomId: string, content: string) =>
    sendChatRoomMessage(roomId, content)
  )
  ipcMain.handle(
    'chatRoom:updatePosition',
    async (_e, roomId: string, pos: { x: number; y: number; facing: string; anim: string }) =>
      updateChatRoomPosition(roomId, pos)
  )
  ipcMain.handle('chatRoom:subscribe', (event, roomId: string) => {
    if (chatRoomUnsubscribe) chatRoomUnsubscribe()
    const wc = event.sender
    chatRoomUnsubscribe = subscribeToChatRoom(roomId, (payload) => {
      wc.send('chatRoom:update', payload)
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
  await startActivityTracker()
  await hydrateFromSession()

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

  registerPlaytimeTick()

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
  if (activeBattleRoomId) {
    forfeitBattleRoom(activeBattleRoomId).catch(() => undefined)
    activeBattleRoomId = null
  }
  stopActivityTracker()
  destroyTray()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
