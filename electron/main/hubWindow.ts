import { BrowserWindow } from 'electron'
import { join } from 'path'
import { getGameSave } from './gameState'
import { getRendererPageUrl, getRendererIndexPath, isDevMode } from './rendererUrl'

let hubWindow: BrowserWindow | null = null

function notifyHubOpened(win: BrowserWindow) {
  if (!win.isDestroyed()) {
    win.webContents.send('hub:opened')
  }
}

export function createHubWindow(): BrowserWindow {
  if (hubWindow && !hubWindow.isDestroyed()) {
    hubWindow.focus()
    notifyHubOpened(hubWindow)
    return hubWindow
  }

  hubWindow = new BrowserWindow({
    width: 960,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    show: false,
    title: 'Taskimon',
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
    hubWindow.loadFile(getRendererIndexPath())
  }

  hubWindow.once('ready-to-show', () => {
    hubWindow?.show()
    hubWindow?.webContents.send('game:updated', JSON.stringify(getGameSave()))
    if (hubWindow) notifyHubOpened(hubWindow)
  })

  hubWindow.on('closed', () => {
    hubWindow = null
  })

  return hubWindow
}

export function getHubWindow(): BrowserWindow | null {
  return hubWindow
}
