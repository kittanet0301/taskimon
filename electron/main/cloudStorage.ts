import type { GameSave } from '../../src/shared/types'
import { createCloudStorageService } from '../../src/shared/cloudStorageService'
import { getSupabase, isSupabaseConfigured } from './supabase'

export const {
  loadGameSaveFromDb,
  saveGameSaveToDb,
  bootstrapGameSaveInDb,
  resetGameDataInDb,
  resetSystemDataInDb,
  canUseCloudStorage
} = createCloudStorageService({
  getSupabase,
  isSupabaseConfigured
})
