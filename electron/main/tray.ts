import { Menu, Tray, nativeImage } from 'electron'
import { createHubWindow } from './hubWindow'
import { getPetWindow } from './petWindow'
import type { GameSave } from '../../src/shared/types'

let tray: Tray | null = null
let trayCallbacks: TrayCallbacks | null = null

type TrayCallbacks = {
  onTogglePet: () => void
  onQuit: () => void
  getSave: () => GameSave
}

function rebuildTrayMenu(getSave: () => GameSave): void {
  if (!tray) return

  const save = getSave()
  const pet = save.pet
  const activity = save.activity
  const label = pet
    ? `${pet.name} | HP ${pet.stats.hp} | อารมณ์ ${pet.stats.mood} | พัฒนา ${pet.stats.devPoints}`
    : 'ยังไม่มีสัตว์เลี้ยง'

  const menu = Menu.buildFromTemplate([
    { label, enabled: false },
    { label: `คลิก: ${activity.clicks} | พิมพ์: ${activity.keystrokes}`, enabled: false },
    { type: 'separator' },
    {
      label: 'เปิด Hub',
      click: () => createHubWindow()
    },
    {
      label: getPetWindow()?.isVisible() ? 'ซ่อนสัตว์' : 'แสดงสัตว์',
      click: () => trayCallbacks?.onTogglePet()
    },
    { type: 'separator' },
    {
      label: 'ออกจากโปรแกรม',
      click: () => trayCallbacks?.onQuit()
    }
  ])
  tray.setContextMenu(menu)

  if (pet) {
    tray.setToolTip(`${pet.name} — คลิก ${activity.clicks} · พิมพ์ ${activity.keystrokes}`)
  } else {
    tray.setToolTip('Taskimon')
  }
}

export function createTray(callbacks: TrayCallbacks): Tray {
  trayCallbacks = callbacks

  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
  )

  tray = new Tray(icon)
  rebuildTrayMenu(callbacks.getSave)

  tray.on('click', () => createHubWindow())
  tray.on('right-click', () => rebuildTrayMenu(callbacks.getSave))

  return tray
}

export function refreshTray(getSave: () => GameSave): void {
  rebuildTrayMenu(getSave)
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
  trayCallbacks = null
}
