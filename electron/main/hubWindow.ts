import { BrowserWindow } from 'electron'
import { join } from 'path'
import { getGameSave } from './gameState'
import { endPetDrag, getPetWindow } from './petWindow'
import { getRendererAppUrl, getRendererPageUrl, isDevMode } from './rendererUrl'
import { getAppIconPath } from './appIcon'

let hubWindow: BrowserWindow | null = null

function notifyHubOpened(win: BrowserWindow) {
  if (!win.isDestroyed()) {
    win.webContents.send('hub:opened')
  }
}

function setDesktopPetVisible(visible: boolean) {
  const pet = getPetWindow()
  if (!pet || pet.isDestroyed()) return
  if (visible) {
    if (!pet.isVisible()) pet.show()
  } else {
    endPetDrag(false)
    if (pet.isVisible()) pet.hide()
  }
}

export function isHubWindowOpen(): boolean {
  return Boolean(hubWindow && !hubWindow.isDestroyed() && hubWindow.isVisible() && !hubWindow.isMinimized())
}

export function createHubWindow(): BrowserWindow {
  if (hubWindow && !hubWindow.isDestroyed()) {
    if (hubWindow.isMinimized()) hubWindow.restore()
    hubWindow.maximize()
    hubWindow.show()
    hubWindow.focus()
    setDesktopPetVisible(false)
    notifyHubOpened(hubWindow)
    return hubWindow
  }

  hubWindow = new BrowserWindow({
    width: 960,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    show: false,
    title: 'Taskino',
    icon: getAppIconPath(),
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (isDevMode() && process.env.ELECTRON_RENDERER_URL) {
    hubWindow.loadURL(getRendererPageUrl())
  } else {
    hubWindow.loadURL(getRendererAppUrl())
  }

  hubWindow.once('ready-to-show', () => {
    hubWindow?.maximize()
    hubWindow?.show()
    setDesktopPetVisible(false)
    hubWindow?.webContents.send('game:updated', JSON.stringify(getGameSave()))
    if (hubWindow) notifyHubOpened(hubWindow)
  })

  hubWindow.on('show', () => {
    setDesktopPetVisible(false)
  })

  // Alt+Tab (and other app switches) blurs the hub. Reveal the always-on-top
  // desktop pet while the user works elsewhere, then hide it when Taskino is
  // focused again.
  hubWindow.on('blur', () => {
    if (!hubWindow?.isMinimized()) setDesktopPetVisible(true)
  })

  hubWindow.on('focus', () => {
    setDesktopPetVisible(false)
  })

  hubWindow.on('minimize', () => {
    setDesktopPetVisible(true)
  })

  hubWindow.on('restore', () => {
    setDesktopPetVisible(false)
  })

  hubWindow.on('closed', () => {
    hubWindow = null
    setDesktopPetVisible(true)
  })

  return hubWindow
}

export function getHubWindow(): BrowserWindow | null {
  return hubWindow
}
