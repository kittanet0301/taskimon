import type {
  AnimationState,
  Element,
  GameSave,
  Gender,
  InventoryItem,
  ItemType,
  MissionProgress,
  PetData,
  Species,
  Stage
} from './types'
import { SAVE_VERSION } from './constants'
import { createDefaultSave } from './growth'

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
}

export function petToDbRow(pet: PetData, ownerId: string) {
  return {
    id: pet.id,
    owner_id: ownerId,
    name: pet.name,
    species: pet.species,
    element: pet.element,
    gender: pet.gender,
    stage: pet.stage,
    hp: pet.stats.hp,
    mood: pet.stats.mood,
    dev_points: pet.stats.devPoints,
    feed_count: pet.feedCount,
    animation_state: pet.animationState,
    is_active: true,
    hatched_at: pet.hatchedAt,
    created_at: pet.createdAt
  }
}

export function petFromDbRow(row: DbPet): PetData {
  return {
    id: row.id,
    name: row.name,
    species: row.species as Species,
    element: row.element as Element,
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
  return {
    pet: save.pet ? petToDbRow(save.pet, userId) : null,
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
      save_version: save.version
    }
  }
}

export function gameSaveFromDbParts(
  pet: DbPet | null,
  inventory: DbInventory[],
  missions: DbMission[],
  activity: DbActivity | null
): GameSave {
  const base = createDefaultSave()
  return {
    version: activity?.save_version ?? SAVE_VERSION,
    pet: pet ? petFromDbRow(pet) : null,
    inventory: inventory.map(
      (row): InventoryItem => ({
        type: row.item_type as ItemType,
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
    lastDailyMissionDay: activity?.last_daily_mission_day ?? null
  }
}
