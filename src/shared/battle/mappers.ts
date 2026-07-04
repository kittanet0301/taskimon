import type {
  BattleRoom,
  BattleRoomMember,
  BattleRoomSummary,
  BattleSession,
  BattleTurn
} from './types'

function str(v: unknown): string {
  return String(v ?? '')
}

function num(v: unknown): number {
  return Number(v ?? 0)
}

function bool(v: unknown): boolean {
  return Boolean(v)
}

export function mapBattleSession(row: Record<string, unknown>): BattleSession {
  return {
    id: str(row.id),
    roomId: row.room_id ? str(row.room_id) : null,
    challengerUserId: str(row.challenger_user_id),
    defenderUserId: str(row.defender_user_id),
    challengerPetId: str(row.challenger_pet_id),
    defenderPetId: str(row.defender_pet_id),
    challengerHp: num(row.challenger_hp),
    defenderHp: num(row.defender_hp),
    challengerHpStart: num(row.challenger_hp_start),
    defenderHpStart: num(row.defender_hp_start),
    challengerEnergy: num(row.challenger_energy ?? 0),
    defenderEnergy: num(row.defender_energy ?? 0),
    challengerDefending: bool(row.challenger_defending),
    defenderDefending: bool(row.defender_defending),
    status: row.status as BattleSession['status'],
    turnUserId: row.turn_user_id ? str(row.turn_user_id) : null,
    winnerUserId: row.winner_user_id ? str(row.winner_user_id) : null,
    fledUserId: row.fled_user_id ? str(row.fled_user_id) : null,
    expiresAt: row.expires_at ? str(row.expires_at) : null,
    createdAt: str(row.created_at)
  }
}

export function mapBattleTurn(row: Record<string, unknown>): BattleTurn {
  return {
    id: str(row.id),
    sessionId: str(row.session_id),
    actorUserId: str(row.actor_user_id),
    action: row.action as BattleTurn['action'],
    damage: num(row.damage),
    challengerHpAfter: num(row.challenger_hp_after),
    defenderHpAfter: num(row.defender_hp_after),
    message: str(row.message),
    createdAt: str(row.created_at)
  }
}

export function mapBattleRoom(row: Record<string, unknown>): BattleRoom {
  return {
    id: str(row.id),
    hostUserId: str(row.host_user_id),
    roomCode: str(row.room_code),
    name: str(row.name),
    visibility: row.visibility as BattleRoom['visibility'],
    status: row.status as BattleRoom['status'],
    maxMembers: num(row.max_members),
    activeSessionId: row.active_session_id ? str(row.active_session_id) : null,
    createdAt: str(row.created_at),
    expiresAt: row.expires_at ? str(row.expires_at) : null
  }
}

export function mapBattleRoomMember(row: Record<string, unknown>): BattleRoomMember {
  return {
    roomId: str(row.room_id),
    userId: str(row.user_id),
    username: str(row.username),
    role: row.role as BattleRoomMember['role'],
    status: row.status as BattleRoomMember['status'],
    joinedAt: str(row.joined_at)
  }
}

export function mapBattleRoomSummary(row: Record<string, unknown>): BattleRoomSummary {
  return {
    id: str(row.id),
    roomCode: str(row.room_code),
    name: str(row.name),
    hostUsername: str(row.host_username),
    memberCount: num(row.member_count),
    waitingCount: num(row.waiting_count),
    createdAt: str(row.created_at)
  }
}
