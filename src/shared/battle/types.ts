export type BattleActionType = 'attack' | 'ultimate' | 'defend' | 'flee'

export type BattleSessionStatus =
  | 'pending'
  | 'active'
  | 'completed'
  | 'declined'
  | 'fled'
  | 'expired'

export type BattleRoomStatus = 'open' | 'closed'
export type BattleRoomVisibility = 'public'
export type BattleRoomMemberStatus = 'waiting' | 'in_battle' | 'left'
export type BattleRoomMemberRole = 'host' | 'member'

export interface BattleCombatant {
  userId: string
  petId: string
  name: string
  character: string
  hp: number
  hpStart: number
  energy: number
  defending: boolean
}

export interface BattleSession {
  id: string
  roomId: string | null
  challengerUserId: string
  defenderUserId: string
  challengerPetId: string
  defenderPetId: string
  challengerHp: number
  defenderHp: number
  challengerHpStart: number
  defenderHpStart: number
  challengerEnergy: number
  defenderEnergy: number
  challengerDefending: boolean
  defenderDefending: boolean
  status: BattleSessionStatus
  turnUserId: string | null
  winnerUserId: string | null
  fledUserId: string | null
  expiresAt: string | null
  createdAt: string
}

export interface BattleTurn {
  id: string
  sessionId: string
  actorUserId: string
  action: BattleActionType
  damage: number
  challengerHpAfter: number
  defenderHpAfter: number
  message: string
  createdAt: string
}

export interface BattleRoom {
  id: string
  hostUserId: string
  roomCode: string
  name: string
  visibility: BattleRoomVisibility
  status: BattleRoomStatus
  maxMembers: number
  activeSessionId: string | null
  createdAt: string
  expiresAt: string | null
}

export interface BattleRoomMember {
  roomId: string
  userId: string
  username: string
  role: BattleRoomMemberRole
  status: BattleRoomMemberStatus
  joinedAt: string
}

export interface BattleRoomSummary {
  id: string
  roomCode: string
  name: string
  hostUsername: string
  memberCount: number
  waitingCount: number
  createdAt: string
}

/** In-memory battle state for engine preview / tests */
export interface BattleSessionState {
  sessionId: string
  challenger: BattleCombatant
  defender: BattleCombatant
  turnUserId: string
  status: BattleSessionStatus
  winnerUserId: string | null
  fledUserId: string | null
}

export interface ApplyActionResult {
  state: BattleSessionState
  damage: number
  logMessage: string
  finished: boolean
}

/** @deprecated Use BattleActionType */
export type LegacyBattleAction = { type: 'attack' | 'defend' | 'skill' }

export interface BattleResult {
  winnerPetId: string
  log: string[]
  challengerHp: number
  defenderHp: number
}
