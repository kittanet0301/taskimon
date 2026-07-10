import { join } from 'path'
import { repoRoot } from './creature-manifest.mjs'

export const MEGA_SHEET_CELL = 512

/** Absolute pixel positions for each clip block on the mega atlas. */
export const MEGA_SHEET_LAYOUT = [
  { stage: 'egg', clip: 'move', x: 0, y: 0, rows: 2, cols: 2 },
  { stage: 'egg', clip: 'hatch', x: 1024, y: 0, rows: 2, cols: 3 },
  { stage: 'baby', clip: 'idle', x: 2560, y: 0, rows: 2, cols: 2 },
  { stage: 'baby', clip: 'move', x: 3584, y: 0, rows: 2, cols: 2 },
  { stage: 'baby', clip: 'hurt', x: 0, y: 1024, rows: 2, cols: 2 },
  { stage: 'baby', clip: 'bite', x: 1024, y: 1024, rows: 2, cols: 2 },
  { stage: 'baby', clip: 'jump', x: 2048, y: 1024, rows: 2, cols: 2 },
  { stage: 'adult', clip: 'idle', x: 0, y: 2048, rows: 2, cols: 2 },
  { stage: 'adult', clip: 'move', x: 1024, y: 2048, rows: 2, cols: 2 },
  { stage: 'adult', clip: 'hurt', x: 2048, y: 2048, rows: 2, cols: 2 },
  { stage: 'adult', clip: 'bite', x: 3072, y: 2048, rows: 2, cols: 2 },
  { stage: 'adult', clip: 'jump', x: 0, y: 3072, rows: 2, cols: 2 }
]

export function megaSheetPath(species) {
  return join(repoRoot, 'assets', 'raw-creatures', species, 'mega-sheet.png')
}

export function megaSheetCanvasSize() {
  return { width: 4608, height: 4096 }
}

export function clipBlockSize(entry) {
  return {
    width: entry.cols * MEGA_SHEET_CELL,
    height: entry.rows * MEGA_SHEET_CELL
  }
}

export function rawClipPath(species, stage, clip) {
  return join(repoRoot, 'assets', 'raw-creatures', species, `${stage}-${clip}.png`)
}

export function megaGenPlanPath(species) {
  return join(repoRoot, 'sprite-output', species, 'mega-gen-plan.json')
}
