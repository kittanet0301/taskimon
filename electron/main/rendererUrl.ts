import { app } from 'electron'
import { join } from 'path'

export function isDevMode(): boolean {
  return !app.isPackaged
}

export function getRendererPageUrl(query?: Record<string, string>): string {
  const base = (process.env.ELECTRON_RENDERER_URL ?? '').replace(/\/$/, '')
  const page = isDevMode() ? `${base}/renderer/index.html` : ''
  if (!isDevMode()) return page

  if (!query || Object.keys(query).length === 0) return page
  const params = new URLSearchParams(query)
  return `${page}?${params.toString()}`
}

/** Built renderer HTML (electron-vite nests under renderer/renderer/). */
export function getRendererIndexPath(): string {
  return join(__dirname, '../renderer/renderer/index.html')
}
