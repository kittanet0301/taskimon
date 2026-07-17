import type {
  AnimationState,
  DinoCharacter,
  GameSave,
  Gender,
  InventoryItem,
  ItemType,
  MinigameId,
  MinigameSaveState,
  MissionProgress,
  PetData,
  Stage
} from './types'
import { SAVE_VERSION, PET_SLOT_BASE } from './constants'
import { createDefaultSave } from './growth'
import { createDefaultMinigameState } from './minigame'
import { normalizePetSpecies } from './dinoCharacters'
import { clampSlotLimit } from './petCollection'

type DbPet = {
  id: string
  owner_id: string
  name: string
  species: string
  element: string
  gender: string
  stage: string
  hp: number
  mood: number
  dev_points: number
  feed_count?: number
  animation_state?: string
  is_active: boolean
  hatched_at: string | null
  created_at: string
}

type DbInventory = {
  item_type: string
  quantity: number
}

type DbMission = {
  mission_id: string
  progress: number
  completed: boolean
  reset_at: string
}

type DbActivity = {
  clicks: number
  keystrokes: number
  dev_points_this_hour: number
  hour_started_at: string
  total_play_seconds: number
  daily_missions_completed_days: number
  last_daily_mission_day: string | null
  session_started_at: string
  last_saved: string
  save_version: number
  pet_slot_limit?: number
  quick_item_slots?: Array<ItemType | null> | null
  minigame_state?: MinigameSaveState | null
  gems?: number
}

function normalizeMinigameStateFromDb(value: MinigameSaveState | null | undefined): MinigameSaveState {
  const base = createDefaultMinigameState()
  if (!value || typeof value !== 'object') return base
  return {
    day: typeof value.day === 'string' ? value.day : base.day,
    itemsEarnedToday: { ...base.itemsEarnedToday, ...(value.itemsEarnedToday ?? {}) },
    bestScores: { ...base.bestScores, ...(value.bestScores ?? {}) }
  }
}

function normalizeMinigameId(key: string): MinigameId | null {
  return key === 'dino_jump' ? 'dino_jump' : null
}

function normalizeMinigameCounts(
  raw: Partial<Record<string, number>> | undefined
): Partial<Record<MinigameId, number>> {
  const next: Partial<Record<MinigameId, number>> = {}
  for (const [key, count] of Object.entries(raw ?? {})) {
    const gameId = normalizeMinigameId(key)
    if (!gameId || typeof count !== 'number') continue
    next[gameId] = count
  }
  return next
}

function minigameStateToDb(minigame: MinigameSaveState): MinigameSaveState {
  return {
    day: minigame.day,
    itemsEarnedToday: normalizeMinigameCounts(minigame.itemsEarnedToday),
    bestScores: normalizeMinigameCounts(minigame.bestScores)
  }
}

function normalizeItemType(type: string): ItemType {
  if (type === 'element_shield') return 'battle_shield'
  return type as ItemType
}

export function petToDbRow(pet: PetData, ownerId: string, isActive: boolean) {
  return {
    id: pet.id,
    owner_id: ownerId,
    name: pet.name,
    species: pet.character,
    element: 'none',
    gender: pet.gender,
    stage: pet.stage,
    hp: pet.stats.hp,
    mood: pet.stats.mood,
    dev_points: pet.stats.devPoints,
    feed_count: pet.feedCount,
    animation_state: pet.animationState,
    is_active: isActive,
    hatched_at: pet.hatchedAt,
    created_at: pet.createdAt
  }
}

export function petFromDbRow(row: DbPet): PetData {
  return {
    id: row.id,
    name: row.name,
    character: normalizePetSpecies(row.species),
    gender: row.gender as Gender,
    stage: row.stage as Stage,
    stats: {
      hp: row.hp,
      mood: row.mood,
      devPoints: row.dev_points
    },
    hatchedAt: row.hatched_at,
    createdAt: row.created_at,
    animationState: (row.animation_state ?? 'idle') as AnimationState,
    feedCount: row.feed_count ?? 0
  }
}

export function gameSaveToDbPayload(userId: string, save: GameSave) {
  const pets = [
    ...(save.pet ? [petToDbRow(save.pet, userId, true)] : []),
    ...save.collection.map((pet) => petToDbRow(pet, userId, false))
  ]

  return {
    pets,
    inventory: save.inventory.map((item) => ({
      user_id: userId,
      item_type: item.type,
      quantity: item.quantity
    })),
    missions: save.missions.map((m) => ({
      user_id: userId,
      mission_id: m.missionId,
      progress: m.progress,
      completed: m.completed,
      reset_at: m.resetAt
    })),
    activity: {
      user_id: userId,
      clicks: save.activity.clicks,
      keystrokes: save.activity.keystrokes,
      dev_points_this_hour: save.activity.devPointsThisHour,
      hour_started_at: save.activity.hourStartedAt,
      total_play_seconds: save.totalPlaySeconds,
      daily_missions_completed_days: save.dailyMissionsCompletedDays,
      last_daily_mission_day: save.lastDailyMissionDay,
      session_started_at: save.sessionStartedAt,
      last_saved: save.lastSaved,
      save_version: save.version,
      pet_slot_limit: save.petSlotLimit,
      quick_item_slots: save.quickItemSlots,
      minigame_state: minigameStateToDb(save.minigame ?? createDefaultMinigameState()),
      gems: save.gems
    }
  }
}

export function gameSaveFromDbParts(
  pets: DbPet[],
  inventory: DbInventory[],
  missions: DbMission[],
  activity: DbActivity | null
): GameSave {
  const base = createDefaultSave()
  const activeRow = pets.find((p) => p.is_active) ?? null
  const collectionRows = pets.filter((p) => !p.is_active)

  return {
    version: activity?.save_version ?? SAVE_VERSION,
    pet: activeRow ? petFromDbRow(activeRow) : null,
    collection: collectionRows.map(petFromDbRow),
    petSlotLimit: clampSlotLimit(activity?.pet_slot_limit ?? PET_SLOT_BASE),
    gems: activity?.gems ?? 0,
    quickItemSlots: activity?.quick_item_slots ?? base.quickItemSlots,
    inventory: inventory.map(
      (row): InventoryItem => ({
        type: normalizeItemType(row.item_type),
        quantity: row.quantity
      })
    ),
    missions: missions.map(
      (row): MissionProgress => ({
        missionId: row.mission_id,
        progress: row.progress,
        completed: row.completed,
        resetAt: row.reset_at
      })
    ),
    activity: activity
      ? {
          clicks: activity.clicks,
          keystrokes: activity.keystrokes,
          devPointsThisHour: activity.dev_points_this_hour,
          hourStartedAt: activity.hour_started_at
        }
      : base.activity,
    sessionStartedAt: activity?.session_started_at ?? base.sessionStartedAt,
    lastSaved: activity?.last_saved ?? new Date().toISOString(),
    totalPlaySeconds: activity?.total_play_seconds ?? 0,
    dailyMissionsCompletedDays: activity?.daily_missions_completed_days ?? 0,
    lastDailyMissionDay: activity?.last_daily_mission_day ?? null,
    minigame: normalizeMinigameStateFromDb(activity?.minigame_state)
  }
}
