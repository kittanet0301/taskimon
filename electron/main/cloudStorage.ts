import type { GameSave } from '../../src/shared/types'
import { createCloudStorageService } from '../../src/shared/cloudStorageService'
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
