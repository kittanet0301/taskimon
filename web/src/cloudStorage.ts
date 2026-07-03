import type { GameSave } from '@shared/types'
import { createDefaultSave } from '@shared/growth'
import { gameSaveFromDbParts, gameSaveToDbPayload } from '@shared/dbMapper'
import { applyMoodDecay } from '@shared/stats'
import { applyDailyResets } from '@shared/missions'
import { getSupabase, isSupabaseConfigured } from './supabase'

export async function loadGameSaveFromDb(userId: string): Promise<GameSave | null> {
  const supabase = getSupabase()
  if (!supabase) return null

  const [petRes, invRes, missionRes, activityRes] = await Promise.all([
    supabase.from('pets').select('*').eq('owner_id', userId).eq('is_active', true).maybeSingle(),
    supabase.from('inventory').select('item_type, quantity').eq('user_id', userId),
    supabase.from('mission_progress').select('mission_id, progress, completed, reset_at').eq('user_id', userId),
    supabase.from('player_activity').select('*').eq('user_id', userId).maybeSingle()
  ])

  if (petRes.error) throw petRes.error
  if (invRes.error) throw invRes.error
  if (missionRes.error) throw missionRes.error
  if (activityRes.error) throw activityRes.error

  const hasData =
    petRes.data || (invRes.data?.length ?? 0) > 0 || (missionRes.data?.length ?? 0) > 0 || activityRes.data

  if (!hasData) return null

  let save = gameSaveFromDbParts(
    petRes.data,
    invRes.data ?? [],
    missionRes.data ?? [],
    activityRes.data
  )

  if (save.missions.length === 0) save.missions = createDefaultSave().missions
  if (save.inventory.length === 0) save.inventory = createDefaultSave().inventory

  return applyOfflineDecay(save)
}

export async function saveGameSaveToDb(userId: string, save: GameSave): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase not configured')

  const payload = gameSaveToDbPayload(userId, {
    ...save,
    lastSaved: new Date().toISOString()
  })

  if (payload.pet) {
    const { error } = await supabase.from('pets').upsert(payload.pet, { onConflict: 'id' })
    if (error) throw error
  }

  if (payload.inventory.length > 0) {
    const { error } = await supabase.from('inventory').upsert(payload.inventory, {
      onConflict: 'user_id,item_type'
    })
    if (error) throw error
  } else {
    await supabase.from('inventory').delete().eq('user_id', userId)
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

/** Wipe game progress and write a fresh default save (keeps account, friends, chat). */
export async function resetGameDataInDb(userId: string): Promise<GameSave> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase not configured')

  await supabase.from('pets').update({ is_active: false }).eq('owner_id', userId)
  await supabase.from('inventory').delete().eq('user_id', userId)
  await supabase.from('mission_progress').delete().eq('user_id', userId)
  await supabase.from('player_activity').delete().eq('user_id', userId)

  const fresh = createDefaultSave()
  await saveGameSaveToDb(userId, fresh)
  return fresh
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
