import { contextBridge, ipcRenderer } from 'electron'
import type { GameSave } from '../../src/shared/types'

contextBridge.exposeInMainWorld('petAPI', {
  getGame: () => ipcRenderer.invoke('game:get'),
  patchGame: (mutator: string, args: unknown[] = []) => ipcRenderer.invoke('game:patch', mutator, args),
  onGameUpdated: (callback: (save: GameSave) => void) => {
    const handler = (_: unknown, payload: string) => callback(JSON.parse(payload) as GameSave)
    ipcRenderer.on('game:updated', handler)
    return () => ipcRenderer.removeListener('game:updated', handler)
  },
  setIgnoreMouse: (ignore: boolean) => ipcRenderer.invoke('pet:setIgnoreMouse', ignore),
  openHub: () => ipcRenderer.invoke('hub:open')
})
