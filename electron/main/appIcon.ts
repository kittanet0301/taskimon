import { app } from 'electron'
import { join } from 'path'

export function getAppIconPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'hud-icon-dino.png')
    : join(app.getAppPath(), 'assets', 'ui', 'hud-icon-dino.png')
}
