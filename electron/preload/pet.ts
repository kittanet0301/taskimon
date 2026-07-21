import { contextBridge, ipcRenderer } from 'electron'
import type { GameSave } from '../../src/shared/types'

type PetBounds = { x: number; y: number; width: number; height: number }

contextBridge.exposeInMainWorld('petAPI', {
  getGame: () => ipcRenderer.invoke('game:get'),
  patchGame: (mutator: string, args: unknown[] = []) => ipcRenderer.invoke('game:patch', mutator, args),
  onGameUpdated: (callback: (save: GameSave) => void) => {
    const handler = (_: unknown, payload: string) => callback(JSON.parse(payload) as GameSave)
    ipcRenderer.on('game:updated', handler)
    return () => ipcRenderer.removeListener('game:updated', handler)
  },
  setIgnoreMouse: (ignore: boolean) => ipcRenderer.invoke('pet:setIgnoreMouse', ignore),
  resize: (width: number, height: number, preserveLeft?: boolean) =>
    ipcRenderer.invoke('pet:resize', width, height, preserveLeft),
  move: (x: number, y: number) =>
    ipcRenderer.invoke('pet:move', x, y) as Promise<{ x: number; y: number } | null>,
  startDrag: () => ipcRenderer.invoke('pet:startDrag') as Promise<boolean>,
  endDrag: () => ipcRenderer.invoke('pet:endDrag') as Promise<{ x: number; y: number } | null>,
  getBounds: () => ipcRenderer.invoke('pet:getBounds') as Promise<PetBounds | null>,
  getWorkArea: () =>
    ipcRenderer.invoke('pet:getWorkArea') as Promise<{
      width: number
      height: number
      x: number
      y: number
    }>,
  onDragEnded: (callback: (bounds: PetBounds | null) => void) => {
    const handler = (_: unknown, bounds: PetBounds | null) => callback(bounds)
    ipcRenderer.on('pet:dragEnded', handler)
    return () => ipcRenderer.removeListener('pet:dragEnded', handler)
  },
  listPendingGifts: () => ipcRenderer.invoke('gift:listPending') as Promise<unknown[]>,
  openHub: () => ipcRenderer.invoke('hub:open')
})
