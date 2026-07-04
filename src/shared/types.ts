export type Element = 'fire' | 'water' | 'earth' | 'wind' | 'nature'
export type Species = 'mamono' | 'avian' | 'aquatic' | 'mythic'
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
  | 'element_shield'

export interface PetStats {
  hp: number
  mood: number
  devPoints: number
}

export interface PetData {
  id: string
  name: string
  species: Species
  element: Element
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
  inventory: InventoryItem[]
  missions: MissionProgress[]
  activity: ActivityCounters
  sessionStartedAt: string
  lastSaved: string
  totalPlaySeconds: number
  dailyMissionsCompletedDays: number
  /** Local calendar day (YYYY-MM-DD) when a daily mission was last claimed. */
  lastDailyMissionDay: string | null
}

export interface Profile {
  id: string
  username: string
  friendCode: string
  avatarUrl: string | null
  createdAt: string
}

export interface FriendRequest {
  id: string
  userId: string
  friendId: string
  status: 'pending' | 'accepted'
  username: string
}

export interface BattleAction {
  type: 'attack' | 'defend' | 'skill'
}

export interface BattleResult {
  winnerPetId: string
  log: string[]
  challengerHp: number
  defenderHp: number
}

export interface ChatMessage {
  id: string
  senderId: string
  receiverId: string
  content: string
  createdAt: string
}

export interface HatchResult {
  species: Species
  element: Element
  gender: Gender
}
