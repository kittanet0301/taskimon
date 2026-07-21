import type { GameSave } from '../shared/types'

type PetBounds = { x: number; y: number; width: number; height: number }

declare global {
  interface Window {
    petAPI: {
      getGame: () => Promise<GameSave>
      patchGame: (mutator: string, args?: unknown[]) => Promise<GameSave>
      onGameUpdated: (callback: (save: GameSave) => void) => () => void
      setIgnoreMouse: (ignore: boolean) => Promise<void>
      resize: (width: number, height: number, preserveLeft?: boolean) => Promise<void>
      move: (x: number, y: number) => Promise<{ x: number; y: number } | null>
      startDrag: () => Promise<boolean>
      endDrag: () => Promise<{ x: number; y: number } | null>
      getBounds: () => Promise<PetBounds | null>
      getWorkArea: () => Promise<{ width: number; height: number; x: number; y: number }>
      onDragEnded: (callback: (bounds: PetBounds | null) => void) => () => void
      listPendingGifts: () => Promise<unknown[]>
      openHub: () => Promise<void>
    }
  }
}

export {}
