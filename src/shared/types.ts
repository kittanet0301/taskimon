import type { DinoCharacter } from './dinoCharacters'
import type { CreatureSpecies } from './creatureCharacters'

export type { DinoCharacter } from './dinoCharacters'
export type { CreatureSpecies } from './creatureCharacters'
export { DINO_CHARACTERS } from './dinoCharacters'
export { CREATURE_SPECIES } from './creatureCharacters'

export type PetSpecies = DinoCharacter | CreatureSpecies

export type Gender = 'male' | 'female'
export type Stage = 'egg' | 'baby' | 'adult'
export type AnimationState =
  | 'egg_idle'
  | 'egg_hatch'
  | 'idle'
  | 'walk_left'
  | 'walk_right'
  | 'eat'
  | 'sleep'
  | 'sick'
  | 'happy'
  | 'sad'
  | 'battle_attack'
  | 'battle_hurt'
  | 'evolve'

export type ItemType =
  | 'food_basic'
  | 'food_premium'
  | 'medicine'
  | 'water'
  | 'toy'
  | 'dev_vitamin'
  | 'battle_shield'

export type MinigameId = 'dino_jump'

export interface MinigameSaveState {
  /** YYYY-MM-DD local calendar day for daily item reward quota */
  day: string | null
  itemsEarnedToday: Partial<Record<MinigameId, number>>
  bestScores: Partial<Record<MinigameId, number>>
}

export interface PetStats {
  hp: number
  mood: number
  devPoints: number
}

export interface PetData {
  id: string
  name: string
  character: PetSpecies
  gender: Gender
  stage: Stage
  stats: PetStats
  hatchedAt: string | null
  createdAt: string
  animationState: AnimationState
  feedCount: number
}

export interface InventoryItem {
  type: ItemType
  quantity: number
}

export interface MissionProgress {
  missionId: string
  progress: number
  completed: boolean
  resetAt: string
}

export interface ActivityCounters {
  clicks: number
  keystrokes: number
  devPointsThisHour: number
  hourStartedAt: string
}

export interface GameSave {
  version: number
  pet: PetData | null
  /** Inactive pets/eggs stored in collection slots. */
  collection: PetData[]
  /** Max pet slots (base 5, up to 27 via weekly missions). */
  petSlotLimit: number
  /** Soft currency, earned from mission claims. */
  gems: number
  inventory: InventoryItem[]
  quickItemSlots: Array<ItemType | null>
  missions: MissionProgress[]
  activity: ActivityCounters
  sessionStartedAt: string
  lastSaved: string
  totalPlaySeconds: number
  dailyMissionsCompletedDays: number
  /** Local calendar day (YYYY-MM-DD) when a daily mission was last claimed. */
  lastDailyMissionDay: string | null
  minigame: MinigameSaveState
}

export interface Profile {
  id: string
  username: string
  friendCode: string
  createdAt: string
}

export interface FriendRequest {
  id: string
  userId: string
  friendId: string
  status: 'pending' | 'accepted'
  username: string
}

export type {
  BattleActionType,
  BattleSessionStatus,
  BattleRoomStatus,
  BattleRoomVisibility,
  BattleRoomMemberStatus,
  BattleRoomMemberRole,
  BattleCombatant,
  BattleSession,
  BattleTurn,
  BattleRoom,
  BattleRoomMember,
  BattleRoomSummary,
  BattleSessionState,
  ApplyActionResult,
  LegacyBattleAction,
  BattleResult
} from './battle/types'

/** @deprecated Use BattleActionType */
export type BattleAction = import('./battle/types').LegacyBattleAction

export interface ChatMessage {
  id: string
  senderId: string
  receiverId: string
  content: string
  createdAt: string
}

export interface HatchResult {
  character: PetSpecies
  gender: Gender
}
