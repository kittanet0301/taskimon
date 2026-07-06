import type { GameAPI } from '@api/types'
import {
  forceCloudSave,
  getGameSave,
  hydrateFromSession,
  isDbMode,
  onSaveChange,
  patchSave,
  clearMyGameData,
  resetSystemGameData,
  setCurrentUser,
  setGameSave,
} from './gameStore'
import {
  getSession,
  signIn,
  signOut,
  signUp,
  resetPasswordByBirthdate,
  updatePassword,
  getProfile,
  updateProfile,
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

const chatRoomListeners = new Set<(payload: unknown) => void>()
const battleListeners = new Set<(payload: unknown) => void>()
let chatRoomUnsubscribe: (() => void) | null = null
let battleUnsubscribe: (() => void) | null = null
let roomUnsubscribe: (() => void) | null = null

export function createWebApi(): GameAPI {
  return {
    getGame: async () => getGameSave(),
    patchGame: async (mutator, args = []) => patchSave(mutator, args),
    updateGame: async (save) => setGameSave(save),
    forceCloudSave: async () => forceCloudSave(),
    clearMyGameData: async () => clearMyGameData(),
    resetSystemGameData: async () => resetSystemGameData(),
    isDbMode: async () => isDbMode(),
    reloadFromCloud: async () => hydrateFromSession(),
    onGameUpdated: (callback) => onSaveChange(callback),
    onHubOpened: () => () => {},
    openHub: async () => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    supabaseConfigured: async () => isSupabaseConfigured(),
    signUp: async (email, password, username, birthDate) => {
      const data = await signUp(email, password, username, birthDate)
      if (data.session?.user?.id) await setCurrentUser(data.session.user.id)
      return data
    },
    signIn: async (email, password) => {
      const data = await signIn(email, password)
      if (data.session?.user?.id) await setCurrentUser(data.session.user.id)
      return data
    },
    signOut: async () => {
      await signOut()
      await setCurrentUser(null)
    },
    setLocale: async () => {},
    resetPasswordByBirthdate: async (email) => resetPasswordByBirthdate(email),
    updatePassword: async (password) => updatePassword(password),
    updateProfile: async (userId, fields) => updateProfile(userId, fields),
    getSession: async () => getSession(),
    getProfile: async (userId) => getProfile(userId),
    syncPet: async (userId, pet) => {
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
    },
    getCloudPet: async (userId) => getActivePet(userId),
    searchFriend: async (code) => searchProfileByFriendCode(code),
    sendFriendRequest: async (userId, friendId) => sendFriendRequest(userId, friendId),
    respondFriend: async (requestId, accept) => respondFriendRequest(requestId, accept),
    listFriends: async (userId) => listFriends(userId),
    listPending: async (userId) => listPendingRequests(userId),
    getFriendPet: async (ownerId) => getFriendPet(ownerId),
    createBattleRoom: async (name) => createBattleRoom(name),
    joinBattleRoom: async (roomCode) => joinBattleRoom(roomCode),
    leaveBattleRoom: async (roomId) => leaveBattleRoom(roomId),
    forfeitBattleRoom: async (roomId) => forfeitBattleRoom(roomId),
    listPublicRooms: async () => listPublicRooms(),
    getRoomMembers: async (roomId) => getRoomMembers(roomId),
    startRoomDuel: async (roomId, opponentUserId) => startRoomDuel(roomId, opponentUserId),
    submitBattleAction: async (sessionId, action) => submitBattleAction(sessionId, action),
    listBattles: async () => listBattles(),
    getBattleTurns: async (sessionId) => getBattleTurns(sessionId),
    subscribeBattles: async (userId) => {
      if (battleUnsubscribe) battleUnsubscribe()
      battleUnsubscribe = subscribeToBattles(userId, (payload) => {
        for (const cb of battleListeners) cb(payload)
      })
      return true
    },
    subscribeBattleRoom: async (roomId) => {
      if (roomUnsubscribe) roomUnsubscribe()
      roomUnsubscribe = subscribeToBattleRoom(roomId, (payload) => {
        for (const cb of battleListeners) cb(payload)
      })
      return true
    },
    onBattleUpdate: (callback) => {
      battleListeners.add(callback)
      return () => battleListeners.delete(callback)
    },
    listChatRooms: async () => listChatRooms(),
    joinChatRoom: async (roomId) => joinChatRoom(roomId),
    leaveChatRoom: async (roomId) => {
      await leaveChatRoom(roomId)
      if (chatRoomUnsubscribe) {
        chatRoomUnsubscribe()
        chatRoomUnsubscribe = null
      }
    },
    getChatRoomMembers: async (roomId) => getChatRoomMembers(roomId),
    sendChatRoomMessage: async (roomId, content) => sendChatRoomMessage(roomId, content),
    updateChatRoomPosition: async (roomId, pos) => updateChatRoomPosition(roomId, pos),
    subscribeChatRoom: async (roomId) => {
      if (chatRoomUnsubscribe) chatRoomUnsubscribe()
      chatRoomUnsubscribe = subscribeToChatRoom(roomId, (payload) => {
        for (const cb of chatRoomListeners) cb(payload)
      })
      return true
    },
    onChatRoomUpdate: (callback) => {
      chatRoomListeners.add(callback)
      return () => chatRoomListeners.delete(callback)
    },
    syncInventory: async (userId, inventory) =>
      syncInventory(
        userId,
        inventory.map((i) => ({ item_type: i.type, quantity: i.quantity }))
      ),
    syncMissions: async (userId, missions) =>
      syncMissions(
        userId,
        missions.map((m) => ({
          mission_id: m.missionId,
          progress: m.progress,
          completed: m.completed,
          reset_at: m.resetAt
        }))
      ),
    getActivityStatus: async () => ({ global: false, fallback: false, ready: true }),
    reportActivityClick: async () => {},
    reportActivityKey: async () => {}
  }
}