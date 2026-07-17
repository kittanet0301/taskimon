import type { GameSave } from '@shared/types'
import { createCloudStorageService } from '@shared/cloudStorageService'
import { getSupabase, isSupabaseConfigured } from './supabase'

export const {
  loadGameSaveFromDb,
  saveGameSaveToDb,
  bootstrapGameSaveInDb,
  resetGameDataInDb,
  canUseCloudStorage
} = createCloudStorageService({
  getSupabase,
  isSupabaseConfigured
})
