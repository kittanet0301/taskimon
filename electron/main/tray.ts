import { Menu, Tray, nativeImage } from 'electron'
import { createHubWindow } from './hubWindow'
import { getPetWindow } from './petWindow'
import { isUserLoggedIn } from './gameState'
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

  const loggedIn = isUserLoggedIn()
  const save = getSave()
  const pet = save.pet
  const activity = save.activity

  const menuItems: Electron.MenuItemConstructorOptions[] = []

  if (loggedIn && pet) {
    menuItems.push(
      {
        label: `${pet.name} | HP ${pet.stats.hp} | อารมณ์ ${pet.stats.mood} | พัฒนา ${pet.stats.devPoints}`,
        enabled: false
      },
      {
        label: `คลิก: ${activity.clicks} | พิมพ์: ${activity.keystrokes}`,
        enabled: false
      },
      { type: 'separator' }
    )
  } else {
    menuItems.push(
      { label: 'Taskimon', enabled: false },
      { label: 'เข้าสู่ระบบเพื่อดูสถานะสัตว์เลี้ยง', enabled: false },
      { type: 'separator' }
    )
  }

  menuItems.push(
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
  )

  const menu = Menu.buildFromTemplate(menuItems)
  tray.setContextMenu(menu)

  if (loggedIn && pet) {
    tray.setToolTip(`${pet.name} — คลิก ${activity.clicks} · พิมพ์ ${activity.keystrokes}`)
  } else {
    tray.setToolTip('Taskimon — เข้าสู่ระบบเพื่อเล่น')
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
