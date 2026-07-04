import type { GameSave, PetData } from '../shared/types'

export interface GameAPI {
  getGame: () => Promise<GameSave>
  patchGame: (mutator: string, args?: unknown[]) => Promise<GameSave>
  updateGame: (save: GameSave) => Promise<GameSave>
  forceCloudSave: () => Promise<void>
  clearMyGameData: () => Promise<GameSave>
  resetSystemGameData: () => Promise<GameSave>
  isDbMode: () => Promise<boolean>
  reloadFromCloud: () => Promise<GameSave>
  onGameUpdated: (callback: (save: GameSave) => void) => () => void
  openHub: () => Promise<void>
  supabaseConfigured: () => Promise<boolean>
  signUp: (email: string, password: string, username: string) => Promise<unknown>
  signIn: (email: string, password: string) => Promise<unknown>
  signOut: () => Promise<void>
  getSession: () => Promise<unknown>
  getProfile: (userId: string) => Promise<unknown>
  syncPet: (userId: string, pet: PetData) => Promise<unknown>
  getCloudPet: (userId: string) => Promise<unknown>
  searchFriend: (code: string) => Promise<unknown>
  sendFriendRequest: (userId: string, friendId: string) => Promise<unknown>
  respondFriend: (requestId: string, accept: boolean) => Promise<unknown>
  listFriends: (userId: string) => Promise<unknown>
  listPending: (userId: string) => Promise<unknown>
  getFriendPet: (ownerId: string) => Promise<unknown>
  simulateBattle: (challenger: PetData, defender: PetData) => Promise<unknown>
  sendChat: (senderId: string, receiverId: string, content: string) => Promise<unknown>
  chatHistory: (userId: string, friendId: string) => Promise<unknown>
  subscribeChat: (userId: string) => Promise<boolean>
  onChatMessage: (callback: (payload: unknown) => void) => () => void
  syncInventory: (userId: string, inventory: GameSave['inventory']) => Promise<unknown>
  syncMissions: (userId: string, missions: GameSave['missions']) => Promise<unknown>
  getActivityStatus: () => Promise<{ global: boolean; fallback: boolean; ready: boolean }>
  reportActivityClick: () => Promise<void>
  reportActivityKey: () => Promise<void>
}

/** @deprecated use GameAPI — kept for Electron preload compatibility */
export type ElectronAPI = GameAPI
