import { app, protocol } from 'electron'
import { extname, join } from 'path'
import { readFile } from 'fs/promises'

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

const APP_SCHEME = 'app'

/** Directory holding the built index.html (electron-vite nests it under renderer/renderer/). */
function getRendererInnerDir(): string {
  return join(__dirname, '../renderer/renderer')
}

/** Directory holding the JS/CSS bundle and the copied publicDir assets (ui/, dino/, creatures/, ...). */
function getRendererOuterDir(): string {
  return join(__dirname, '../renderer')
}

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
}

function mimeTypeFor(filePath: string): string {
  return MIME_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream'
}

/**
 * The packaged app loads its UI via `file://`, where an absolute-looking path like
 * `/ui/icon.png` resolves to the filesystem root instead of the app's asset folder
 * (and has no drive letter at all on Windows, so it fails outright). Registering a
 * custom `app://` scheme lets us intercept those requests and serve the right file
 * regardless of OS, fixing images that never rendered in the built desktop app.
 */
export function registerAppProtocolScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: APP_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        stream: true,
        corsEnabled: true
      }
    }
  ])
}

/** Call once, after `app.whenReady()`, to start serving the packaged renderer over `app://`. */
export function registerAppProtocolHandler(): void {
  protocol.handle(APP_SCHEME, async (request) => {
    const url = new URL(request.url)
    const pathname = decodeURIComponent(url.pathname) || '/index.html'
    const candidates = [join(getRendererInnerDir(), pathname), join(getRendererOuterDir(), pathname)]

    for (const filePath of candidates) {
      try {
        const data = await readFile(filePath)
        return new Response(data, { headers: { 'Content-Type': mimeTypeFor(filePath) } })
      } catch {
        // try the next candidate directory
      }
    }
    return new Response('Not found', { status: 404 })
  })
}

/** URL for the packaged renderer served over the custom `app://` scheme (production only). */
export function getRendererAppUrl(query?: Record<string, string>): string {
  const url = new URL(`${APP_SCHEME}://renderer/index.html`)
  if (query) {
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value)
  }
  return url.toString()
}
