import type { GameSave } from '../shared/types'

declare global {
  interface Window {
    petAPI: {
      getGame: () => Promise<GameSave>
      patchGame: (mutator: string, args?: unknown[]) => Promise<GameSave>
      onGameUpdated: (callback: (save: GameSave) => void) => () => void
      setIgnoreMouse: (ignore: boolean) => Promise<void>
      openHub: () => Promise<void>
    }
  }
}

export {}
