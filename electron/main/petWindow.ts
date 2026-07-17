import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { getRendererAppUrl, getRendererPageUrl, isDevMode } from './rendererUrl'

const PET_SIZE = 96

let petWindow: BrowserWindow | null = null

export function createPetWindow(): BrowserWindow {
  const display = screen.getPrimaryDisplay()
  const { width, height } = display.workAreaSize

  petWindow = new BrowserWindow({
    width: PET_SIZE,
    height: PET_SIZE,
    x: Math.floor(width / 2 - PET_SIZE / 2),
    y: height - PET_SIZE - 48,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    resizable: false,
    focusable: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/pet.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  petWindow.setIgnoreMouseEvents(false)
  petWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  if (isDevMode() && process.env.ELECTRON_RENDERER_URL) {
    petWindow.loadURL(getRendererPageUrl({ view: 'pet' }))
  } else {
    petWindow.loadURL(getRendererAppUrl({ view: 'pet' }))
  }

  petWindow.once('ready-to-show', () => {
    petWindow?.show()
  })

  petWindow.on('closed', () => {
    petWindow = null
  })

  return petWindow
}

export function getPetWindow(): BrowserWindow | null {
  return petWindow
}

export function setPetIgnoreMouse(ignore: boolean, forward = true): void {
  petWindow?.setIgnoreMouseEvents(ignore, { forward })
}

export function movePetWindow(x: number, y: number): void {
  petWindow?.setPosition(Math.round(x), Math.round(y))
}

export function getPetBounds(): { x: number; y: number; width: number; height: number } | null {
  if (!petWindow) return null
  const [x, y] = petWindow.getPosition()
  const [width, height] = petWindow.getSize()
  return { x, y, width, height }
}

export function getWorkArea(): { width: number; height: number; x: number; y: number } {
  const display = screen.getPrimaryDisplay()
  return display.workArea
}
