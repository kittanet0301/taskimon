import { app } from 'electron'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

function applyEnvFile(envPath: string): void {
  if (!existsSync(envPath)) return
  const lines = readFileSync(envPath, 'utf-8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}

/** Load .env into process.env for Electron main process */
export function loadEnvFile(): void {
  const candidates = [join(process.cwd(), '.env'), join(process.cwd(), '.env.production')]

  if (app.isPackaged) {
    candidates.push(join(process.resourcesPath, '.env'), join(process.resourcesPath, '.env.production'))
  }

  for (const envPath of candidates) {
    applyEnvFile(envPath)
  }
}
