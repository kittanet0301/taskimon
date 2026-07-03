import type { GameAPI } from './api/types'

declare global {
  interface Window {
    electronAPI: GameAPI
  }
}

export {}
