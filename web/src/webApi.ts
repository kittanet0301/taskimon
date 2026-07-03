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
import { simulateBattle, randomBattleActions } from '@shared/battle'

const chatListeners = new Set<(payload: unknown) => void>()
let chatUnsubscribe: (() => void) | null = null

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
    openHub: async () => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    supabaseConfigured: async () => isSupabaseConfigured(),
    signUp: async (email, password, username) => {
      const data = await signUp(email, password, username)
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
    getSession: async () => getSession(),
    getProfile: async (userId) => getProfile(userId),
    syncPet: async (userId, pet) => {
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
    },
    getCloudPet: async (userId) => getActivePet(userId),
    searchFriend: async (code) => searchProfileByFriendCode(code),
    sendFriendRequest: async (userId, friendId) => sendFriendRequest(userId, friendId),
    respondFriend: async (requestId, accept) => respondFriendRequest(requestId, accept),
    listFriends: async (userId) => listFriends(userId),
    listPending: async (userId) => listPendingRequests(userId),
    getFriendPet: async (ownerId) => getFriendPet(ownerId),
    simulateBattle: async (challenger, defender) => {
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
    },
    sendChat: async (senderId, receiverId, content) => sendChatMessage(senderId, receiverId, content),
    chatHistory: async (userId, friendId) => getChatMessages(userId, friendId),
    subscribeChat: async (userId) => {
      if (chatUnsubscribe) chatUnsubscribe()
      chatUnsubscribe = subscribeToChat(userId, (payload) => {
        for (const cb of chatListeners) cb(payload)
      })
      return true
    },
    onChatMessage: (callback) => {
      chatListeners.add(callback)
      return () => chatListeners.delete(callback)
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
      )
  }
}