import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import WebSocket from 'ws'
import { formatApiError } from '../../src/shared/formatError'
import { createSupabaseService } from '../../src/shared/supabaseService'

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  if (client) return client
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const key =
    process.env.SUPABASE_ANON_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return null
  client = createClient(url, key, {
    realtime: {
      transport: WebSocket as unknown as typeof globalThis.WebSocket
    }
  })
  return client
}

export function isSupabaseConfigured(): boolean {
  return getSupabase() !== null
}

export const {
  signUp,
  signIn,
  signOut,
  updatePassword,
  resetPasswordByBirthdate,
  getSession,
  getProfile,
  updateProfile,
  syncPetToCloud,
  getActivePet,
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
  syncMissions,
  submitMinigameScore,
  getMinigameLeaderboard
} = createSupabaseService({
  getSupabase,
  formatError: formatApiError
})
