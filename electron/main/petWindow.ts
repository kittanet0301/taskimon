import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { getRendererAppUrl, getRendererPageUrl, isDevMode } from './rendererUrl'

const DEFAULT_PET_SIZE = 96

let petWindow: BrowserWindow | null = null
let currentPetSize = DEFAULT_PET_SIZE
let dragTimer: ReturnType<typeof setInterval> | null = null
let dragOffsetX = 0
let dragOffsetY = 0
let dragMouseUpHandler: ((event: { button: number }) => void) | null = null

export function createPetWindow(): BrowserWindow {
  const display = screen.getPrimaryDisplay()
  const { x, y, width, height } = display.workArea
  const size = currentPetSize

  petWindow = new BrowserWindow({
    width: size,
    height: size,
    x: Math.floor(x + width / 2 - size / 2),
    y: y + height - size,
    transparent: true,
    backgroundColor: '#00000000',
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    resizable: false,
    focusable: true,
    thickFrame: false,
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
    void import('./hubWindow').then(({ isHubWindowOpen }) => {
      if (isHubWindowOpen()) return
      petWindow?.show()
    })
  })

  petWindow.on('closed', () => {
    endPetDrag()
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

export function resizePetWindow(size: number): void {
  const next = Math.max(32, Math.round(size))
  if (!petWindow || petWindow.isDestroyed()) {
    currentPetSize = next
    return
  }
  if (next === currentPetSize) return

  const [x, y] = petWindow.getPosition()
  const [, prevH] = petWindow.getSize()
  // Keep the pet's feet roughly anchored when growing/shrinking.
  const bottom = y + prevH
  petWindow.setSize(next, next)
  petWindow.setPosition(x, bottom - next)
  currentPetSize = next
}

function applyPetPosition(x: number, y: number): { x: number; y: number } | null {
  if (!petWindow || petWindow.isDestroyed()) return null
  const area = getWorkArea()
  const [w, h] = petWindow.getSize()
  const maxX = area.x + area.width - w
  const maxY = area.y + area.height - h
  const nextX = Math.min(Math.max(Math.round(x), area.x), Math.max(area.x, maxX))
  const nextY = Math.min(Math.max(Math.round(y), area.y), Math.max(area.y, maxY))
  petWindow.setPosition(nextX, nextY)
  return { x: nextX, y: nextY }
}

export function isPetDragging(): boolean {
  return dragTimer != null
}

/** Walk / IPC moves — ignored while a user drag owns the window. */
export function movePetWindow(x: number, y: number): { x: number; y: number } | null {
  if (isPetDragging()) return getPetBounds()
  return applyPetPosition(x, y)
}

export function getPetBounds(): { x: number; y: number; width: number; height: number } | null {
  if (!petWindow || petWindow.isDestroyed()) return null
  const [x, y] = petWindow.getPosition()
  const [width, height] = petWindow.getSize()
  return { x, y, width, height }
}

export function getWorkArea(): { width: number; height: number; x: number; y: number } {
  const display = screen.getPrimaryDisplay()
  return display.workArea
}

function detachDragMouseUp(): void {
  if (!dragMouseUpHandler) return
  void import('uiohook-napi')
    .then(({ uIOhook }) => {
      if (dragMouseUpHandler) uIOhook.off('mouseup', dragMouseUpHandler)
      dragMouseUpHandler = null
    })
    .catch(() => {
      dragMouseUpHandler = null
    })
}

function notifyDragEnded(): void {
  if (!petWindow || petWindow.isDestroyed()) return
  const bounds = getPetBounds()
  petWindow.webContents.send('pet:dragEnded', bounds)
}

export function startPetDrag(): boolean {
  if (!petWindow || petWindow.isDestroyed()) return false
  endPetDrag(false)

  setPetIgnoreMouse(false)
  const cursor = screen.getCursorScreenPoint()
  const [wx, wy] = petWindow.getPosition()
  dragOffsetX = cursor.x - wx
  dragOffsetY = cursor.y - wy

  dragTimer = setInterval(() => {
    if (!petWindow || petWindow.isDestroyed()) {
      endPetDrag(false)
      return
    }
    const { x, y } = screen.getCursorScreenPoint()
    applyPetPosition(x - dragOffsetX, y - dragOffsetY)
  }, 16)

  // Global mouseup backup (taskbar / other apps often swallow renderer pointerup).
  void import('uiohook-napi')
    .then(({ uIOhook }) => {
      if (!isPetDragging()) return
      dragMouseUpHandler = (event) => {
        // libuiohook: button 1 = left. Some builds report 0.
        if (event.button !== 1 && event.button !== 0) return
        endPetDrag(true)
      }
      uIOhook.on('mouseup', dragMouseUpHandler)
    })
    .catch(() => undefined)

  return true
}

export function endPetDrag(notifyRenderer = true): { x: number; y: number } | null {
  if (dragTimer) {
    clearInterval(dragTimer)
    dragTimer = null
  }
  detachDragMouseUp()
  const bounds = getPetBounds()
  if (notifyRenderer && bounds) notifyDragEnded()
  return bounds ? { x: bounds.x, y: bounds.y } : null
}
