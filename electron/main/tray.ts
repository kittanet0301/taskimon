import { app, Menu, Tray, nativeImage, BrowserWindow } from 'electron'
import { join } from 'path'
import { createHubWindow } from './hubWindow'
import { getPetWindow } from './petWindow'
import type { GameSave } from '../../src/shared/types'

let tray: Tray | null = null

type TrayCallbacks = {
  onTogglePet: () => void
  onQuit: () => void
  getSave: () => GameSave
}

export function createTray(callbacks: TrayCallbacks): Tray {
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
  )

  tray = new Tray(icon)
  tray.setToolTip('Taskimon')

  const rebuild = (): void => {
    const save = callbacks.getSave()
    const pet = save.pet
    const activity = save.activity
    const label = pet
      ? `${pet.name} | HP ${pet.stats.hp} | อารมณ์ ${pet.stats.mood} | พัฒนา ${pet.stats.devPoints}`
      : 'ยังไม่มีสัตว์เลี้ยง'

    const menu = Menu.buildFromTemplate([
      { label: label, enabled: false },
      { label: `คลิก: ${activity.clicks} | พิมพ์: ${activity.keystrokes}`, enabled: false },
      { type: 'separator' },
      {
        label: 'เปิด Hub',
        click: () => createHubWindow()
      },
      {
        label: getPetWindow()?.isVisible() ? 'ซ่อนสัตว์' : 'แสดงสัตว์',
        click: callbacks.onTogglePet
      },
      { type: 'separator' },
      {
        label: 'ออกจากโปรแกรม',
        click: callbacks.onQuit
      }
    ])
    tray?.setContextMenu(menu)
  }

  rebuild()
  tray.on('click', () => createHubWindow())

  return tray
}

export function refreshTray(getSave: () => GameSave): void {
  if (!tray) return
  const save = getSave()
  const pet = save.pet
  if (pet) {
    tray.setToolTip(`${pet.name} — พัฒนาร่าง ${pet.stats.devPoints}`)
  }
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
}
