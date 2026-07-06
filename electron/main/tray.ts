import { Menu, Tray, nativeImage } from 'electron'
import { createHubWindow } from './hubWindow'
import { getPetWindow } from './petWindow'
import { isUserLoggedIn } from './gameState'
import { tMain } from './locale'
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
        label: tMain('tray.petStatsLabel', {
          name: pet.name,
          hp: pet.stats.hp,
          mood: pet.stats.mood,
          devPoints: pet.stats.devPoints
        }),
        enabled: false
      },
      {
        label: tMain('tray.activityLabel', {
          clicks: activity.clicks,
          keystrokes: activity.keystrokes
        }),
        enabled: false
      },
      { type: 'separator' }
    )
  } else {
    menuItems.push(
      { label: tMain('tray.title'), enabled: false },
      { label: tMain('tray.loginToSeePetStatus'), enabled: false },
      { type: 'separator' }
    )
  }

  menuItems.push(
    {
      label: tMain('tray.openHub'),
      click: () => createHubWindow()
    },
    {
      label: getPetWindow()?.isVisible() ? tMain('tray.hidePet') : tMain('tray.showPet'),
      click: () => trayCallbacks?.onTogglePet()
    },
    { type: 'separator' },
    {
      label: tMain('tray.quitApp'),
      click: () => trayCallbacks?.onQuit()
    }
  )

  const menu = Menu.buildFromTemplate(menuItems)
  tray.setContextMenu(menu)

  if (loggedIn && pet) {
    tray.setToolTip(
      tMain('tray.tooltipLoggedIn', {
        name: pet.name,
        clicks: activity.clicks,
        keystrokes: activity.keystrokes
      })
    )
  } else {
    tray.setToolTip(tMain('tray.tooltipLoggedOut'))
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
