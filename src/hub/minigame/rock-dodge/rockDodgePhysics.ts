/**
 * Rock Dodge pacing:
 * - survival accumulates by currentFallSpeed each frame
 * - score = floor(survival * 0.025)  → ~1000 ≈ 40k survival units
 * - fall speed starts at 3, +1 every 100 score, max 9
 * - player moves left/right along the ground
 */

export const CANVAS_W = 720
export const CANVAS_H = 360
export const GROUND_Y = 280
export const PLAYER_W = 44
export const PLAYER_H = 48
export const PLAYER_Y = GROUND_Y - PLAYER_H
export const PLAYER_SPEED = 6

export const START_FALL_SPEED = 3
export const MAX_FALL_SPEED = 9
export const SPEED_STEP_SCORE = 100
export const SCORE_RATE = 0.025

export const ROCK_MIN_W = 28
export const ROCK_MAX_W = 48
export const ROCK_MIN_H = 24
export const ROCK_MAX_H = 42

export const PLAYER_HITBOX_PAD = 4
export const ROCK_HITBOX_PAD = 4

export type Rng = () => number

export type RockKind = 'rock' | 'branch' | 'trash'

export interface Rock {
  id: number
  x: number
  y: number
  w: number
  h: number
  vy: number
  kind: RockKind
}

export interface DodgeState {
  /** Survival accumulator (same scale idea as Dino Jump distanceRan) */
  survival: number
  playerX: number
  rocks: Rock[]
  spawnCooldown: number
  nextRockId: number
  dead: boolean
}

export interface DodgeInput {
  /** -1 left, 0 none, 1 right */
  move: -1 | 0 | 1
}

export const EMPTY_DODGE_INPUT: DodgeInput = { move: 0 }

export function createDodgeState(): DodgeState {
  return {
    survival: 0,
    playerX: Math.round((CANVAS_W - PLAYER_W) / 2),
    rocks: [],
    spawnCooldown: 50,
    nextRockId: 1,
    dead: false
  }
}

export function getScore(survival: number): number {
  return Math.floor(survival * SCORE_RATE)
}

export function getFallSpeed(survival: number): number {
  const score = getScore(survival)
  const tier = Math.floor(score / SPEED_STEP_SCORE)
  return Math.min(MAX_FALL_SPEED, START_FALL_SPEED + tier)
}

export function survivalForScore(score: number): number {
  return score / SCORE_RATE
}

export function getSpawnInterval(fallSpeed: number, rng: Rng = Math.random): number {
  const base = Math.max(18, 70 - fallSpeed * 5)
  const jitter = Math.round(rng() * 22)
  return base + jitter
}

function rollRockKind(rng: Rng): RockKind {
  const r = rng()
  if (r < 0.55) return 'rock'
  if (r < 0.8) return 'branch'
  return 'trash'
}

export function spawnRock(
  fallSpeed: number,
  nextId: number,
  rng: Rng = Math.random
): Rock {
  const w = Math.round(ROCK_MIN_W + rng() * (ROCK_MAX_W - ROCK_MIN_W))
  const h = Math.round(ROCK_MIN_H + rng() * (ROCK_MAX_H - ROCK_MIN_H))
  const maxX = Math.max(0, CANVAS_W - w)
  const x = Math.round(rng() * maxX)
  const kind = rollRockKind(rng)
  const vy = fallSpeed + (kind === 'trash' ? 0.6 : kind === 'branch' ? -0.3 : 0) + rng() * 0.8
  return {
    id: nextId,
    x,
    y: -h - 4,
    w,
    h,
    vy,
    kind
  }
}

function rectsOverlap(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by
}

export function tickDodgeState(
  state: DodgeState,
  input: DodgeInput = EMPTY_DODGE_INPUT,
  rng: Rng = Math.random
): DodgeState {
  if (state.dead) return state

  const next: DodgeState = {
    ...state,
    rocks: state.rocks.map((r) => ({ ...r }))
  }
  const fallSpeed = getFallSpeed(next.survival)

  if (input.move !== 0) {
    next.playerX += input.move * PLAYER_SPEED
    next.playerX = Math.max(0, Math.min(CANVAS_W - PLAYER_W, next.playerX))
  }

  next.survival += fallSpeed

  next.rocks = next.rocks
    .map((r) => ({ ...r, y: r.y + r.vy }))
    .filter((r) => r.y < CANVAS_H + 40)

  next.spawnCooldown -= 1
  if (next.spawnCooldown <= 0) {
    next.rocks.push(spawnRock(fallSpeed, next.nextRockId++, rng))
    next.spawnCooldown = getSpawnInterval(fallSpeed, rng)
  }

  for (const rock of next.rocks) {
    if (
      rectsOverlap(
        next.playerX + PLAYER_HITBOX_PAD,
        PLAYER_Y + PLAYER_HITBOX_PAD,
        PLAYER_W - PLAYER_HITBOX_PAD * 2,
        PLAYER_H - PLAYER_HITBOX_PAD * 2,
        rock.x + ROCK_HITBOX_PAD,
        rock.y + ROCK_HITBOX_PAD,
        rock.w - ROCK_HITBOX_PAD * 2,
        rock.h - ROCK_HITBOX_PAD * 2
      )
    ) {
      next.dead = true
      break
    }
  }

  return next
}
