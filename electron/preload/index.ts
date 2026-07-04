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
  requestPasswordReset: (email) => ipcRenderer.invoke('auth:requestPasswordReset', email),
  updatePassword: (password) => ipcRenderer.invoke('auth:updatePassword', password),
  onPasswordRecovery: () => () => {},
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
  createBattleRoom: (name) => ipcRenderer.invoke('room:create', name),
  joinBattleRoom: (roomCode) => ipcRenderer.invoke('room:join', roomCode),
  leaveBattleRoom: (roomId) => ipcRenderer.invoke('room:leave', roomId),
  forfeitBattleRoom: (roomId) => ipcRenderer.invoke('room:forfeit', roomId),
  listPublicRooms: () => ipcRenderer.invoke('room:listPublic'),
  getRoomMembers: (roomId) => ipcRenderer.invoke('room:getMembers', roomId),
  startRoomDuel: (roomId, opponentUserId) =>
    ipcRenderer.invoke('room:startDuel', roomId, opponentUserId),
  createBattleChallenge: (defenderUserId) =>
    ipcRenderer.invoke('battle:createChallenge', defenderUserId),
  respondBattle: (sessionId, accept) => ipcRenderer.invoke('battle:respond', sessionId, accept),
  submitBattleAction: (sessionId, action) =>
    ipcRenderer.invoke('battle:submitAction', sessionId, action),
  listBattles: () => ipcRenderer.invoke('battle:list'),
  getBattleTurns: (sessionId) => ipcRenderer.invoke('battle:getTurns', sessionId),
  subscribeBattles: (userId) => ipcRenderer.invoke('battle:subscribe', userId),
  subscribeBattleRoom: (roomId) => ipcRenderer.invoke('room:subscribe', roomId),
  onBattleUpdate: (callback) => {
    const handler = (_: unknown, payload: unknown) => callback(payload)
    ipcRenderer.on('battle:update', handler)
    return () => ipcRenderer.removeListener('battle:update', handler)
  },
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
  clearMyGameData: () => ipcRenderer.invoke('cloud:clearMyData'),
  resetSystemGameData: () => ipcRenderer.invoke('cloud:resetSystem'),
  reloadFromCloud: () => ipcRenderer.invoke('cloud:reload'),
  getActivityStatus: () =>
    ipcRenderer.invoke('activity:status') as Promise<{
      global: boolean
      fallback: boolean
      ready: boolean
    }>,
  reportActivityClick: () => ipcRenderer.invoke('activity:click'),
  reportActivityKey: () => ipcRenderer.invoke('activity:key')
}

contextBridge.exposeInMainWorld('electronAPI', api)
