import type { GameSave } from '@shared/types'
import { createDefaultSave } from '@shared/growth'
import { gameSaveFromDbParts, gameSaveToDbPayload } from '@shared/dbMapper'
import { applyMoodDecay } from '@shared/stats'
import { applyDailyResets, ensureAllMissions } from '@shared/missions'
import { getSupabase, isSupabaseConfigured } from './supabase'

export async function loadGameSaveFromDb(userId: string): Promise<GameSave | null> {
  const supabase = getSupabase()
  if (!supabase) return null

  const [petsRes, invRes, missionRes, activityRes] = await Promise.all([
    supabase.from('pets').select('*').eq('owner_id', userId),
    supabase.from('inventory').select('item_type, quantity').eq('user_id', userId),
    supabase.from('mission_progress').select('mission_id, progress, completed, reset_at').eq('user_id', userId),
    supabase.from('player_activity').select('*').eq('user_id', userId).maybeSingle()
  ])

  if (petsRes.error) throw petsRes.error
  if (invRes.error) throw invRes.error
  if (missionRes.error) throw missionRes.error
  if (activityRes.error) throw activityRes.error

  const hasData =
    (petsRes.data?.length ?? 0) > 0 ||
    (invRes.data?.length ?? 0) > 0 ||
    (missionRes.data?.length ?? 0) > 0 ||
    activityRes.data

  if (!hasData) return null

  let save = gameSaveFromDbParts(
    petsRes.data ?? [],
    invRes.data ?? [],
    missionRes.data ?? [],
    activityRes.data
  )

  save.missions = ensureAllMissions(save.missions)
  if (save.inventory.length === 0) {
    save.inventory = createDefaultSave().inventory
  }

  return applyOfflineDecay(save)
}

export async function saveGameSaveToDb(userId: string, save: GameSave): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase not configured')

  const payload = gameSaveToDbPayload(userId, {
    ...save,
    lastSaved: new Date().toISOString()
  })

  const keptIds = new Set(payload.pets.map((p) => p.id))

  const { data: existingPets, error: listError } = await supabase
    .from('pets')
    .select('id')
    .eq('owner_id', userId)
  if (listError) throw listError

  for (const row of existingPets ?? []) {
    if (!keptIds.has(row.id)) {
      const { error } = await supabase.from('pets').delete().eq('id', row.id)
      if (error) throw error
    }
  }

  if (payload.pets.length > 0) {
    const { error } = await supabase.from('pets').upsert(payload.pets, { onConflict: 'id' })
    if (error) throw error
  }

  const { error: invDeleteError } = await supabase.from('inventory').delete().eq('user_id', userId)
  if (invDeleteError) throw invDeleteError
  if (payload.inventory.length > 0) {
    const { error } = await supabase.from('inventory').insert(payload.inventory)
    if (error) throw error
  }

  for (const mission of payload.missions) {
    const { error } = await supabase.from('mission_progress').upsert(mission, {
      onConflict: 'user_id,mission_id'
    })
    if (error) throw error
  }

  const { error: activityError } = await supabase
    .from('player_activity')
    .upsert(payload.activity, { onConflict: 'user_id' })
  if (activityError) throw activityError
}

export async function bootstrapGameSaveInDb(userId: string, save?: GameSave): Promise<GameSave> {
  const initial = save ?? createDefaultSave()
  await saveGameSaveToDb(userId, initial)
  return initial
}

/** Wipe game progress for one user (keeps profile, friends). */
export async function resetGameDataInDb(userId: string): Promise<GameSave> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase not configured')

  const { error: chatLeaveError } = await supabase.rpc('chat_room_leave_all')
  if (chatLeaveError) throw chatLeaveError

  const { error: deletePetsError } = await supabase.from('pets').delete().eq('owner_id', userId)
  if (deletePetsError) throw deletePetsError

  const { error: invError } = await supabase.from('inventory').delete().eq('user_id', userId)
  if (invError) throw invError

  const { error: missionError } = await supabase.from('mission_progress').delete().eq('user_id', userId)
  if (missionError) throw missionError

  const { error: activityError } = await supabase.from('player_activity').delete().eq('user_id', userId)
  if (activityError) throw activityError

  const fresh = createDefaultSave()
  await saveGameSaveToDb(userId, fresh)
  return fresh
}

/** Wipe game progress for all users (keeps profiles, friendships). */
export async function resetSystemDataInDb(userId: string): Promise<GameSave> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase not configured')

  const { error } = await supabase.rpc('reset_all_game_data')
  if (error) throw error

  const cloudSave = await loadGameSaveFromDb(userId)
  if (cloudSave) return cloudSave
  return bootstrapGameSaveInDb(userId, createDefaultSave())
}

function applyOfflineDecay(save: GameSave): GameSave {
  const lastSaved = new Date(save.lastSaved).getTime()
  const hoursAway = (Date.now() - lastSaved) / 3_600_000
  let next = applyDailyResets(save)
  if (next.pet && hoursAway > 0.1) {
    next.pet = {
      ...next.pet,
      stats: applyMoodDecay(next.pet.stats, hoursAway)
    }
  }
  return next
}

export function canUseCloudStorage(): boolean {
  return isSupabaseConfigured()
}
