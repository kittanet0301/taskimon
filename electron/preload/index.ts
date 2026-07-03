import { contextBridge, ipcRenderer } from 'electron'
import type { GameSave, PetData } from '../../src/shared/types'
import type { GameAPI } from '../../src/api/types'

export type { GameAPI, ElectronAPI } from '../../src/api/types'

const api: GameAPI = {
  getGame: () => ipcRenderer.invoke('game:get'),
  patchGame: (mutator, args = []) => ipcRenderer.invoke('game:patch', mutator, args),
  updateGame: (save) => ipcRenderer.invoke('game:update', JSON.stringify(save)),
  onGameUpdated: (callback) => {
    const handler = (_: unknown, payload: string) => callback(JSON.parse(payload) as GameSave)
    ipcRenderer.on('game:updated', handler)
    return () => ipcRenderer.removeListener('game:updated', handler)
  },
  openHub: () => ipcRenderer.invoke('hub:open'),
  supabaseConfigured: () => ipcRenderer.invoke('supabase:configured'),
  signUp: (email, password, username) => ipcRenderer.invoke('auth:signup', email, password, username),
  signIn: (email, password) => ipcRenderer.invoke('auth:signin', email, password),
  signOut: () => ipcRenderer.invoke('auth:signout'),
  getSession: () => ipcRenderer.invoke('auth:session'),
  getProfile: (userId) => ipcRenderer.invoke('auth:profile', userId),
  syncPet: (userId, pet) => ipcRenderer.invoke('cloud:syncPet', userId, pet),
  getCloudPet: (userId) => ipcRenderer.invoke('cloud:getPet', userId),
  searchFriend: (code) => ipcRenderer.invoke('friends:search', code),
  sendFriendRequest: (userId, friendId) => ipcRenderer.invoke('friends:request', userId, friendId),
  respondFriend: (requestId, accept) => ipcRenderer.invoke('friends:respond', requestId, accept),
  listFriends: (userId) => ipcRenderer.invoke('friends:list', userId),
  listPending: (userId) => ipcRenderer.invoke('friends:pending', userId),
  getFriendPet: (ownerId) => ipcRenderer.invoke('friends:pet', ownerId),
  simulateBattle: (challenger, defender) => ipcRenderer.invoke('battle:simulate', challenger, defender),
  sendChat: (senderId, receiverId, content) =>
    ipcRenderer.invoke('chat:send', senderId, receiverId, content),
  chatHistory: (userId, friendId) => ipcRenderer.invoke('chat:history', userId, friendId),
  subscribeChat: (userId) => ipcRenderer.invoke('chat:subscribe', userId),
  onChatMessage: (callback) => {
    const handler = (_: unknown, payload: unknown) => callback(payload)
    ipcRenderer.on('chat:message', handler)
    return () => ipcRenderer.removeListener('chat:message', handler)
  },
  syncInventory: (userId, inventory) => ipcRenderer.invoke('cloud:syncInventory', userId, inventory),
  syncMissions: (userId, missions) => ipcRenderer.invoke('cloud:syncMissions', userId, missions),
  isDbMode: () => ipcRenderer.invoke('cloud:isDbMode'),
  forceCloudSave: () => ipcRenderer.invoke('cloud:forceSave'),
  reloadFromCloud: () => ipcRenderer.invoke('cloud:reload')
}

contextBridge.exposeInMainWorld('electronAPI', api)
