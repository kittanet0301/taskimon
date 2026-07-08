/**
 * Chrome offline dino–style pacing:
 * - distanceRan accumulates by currentSpeed each frame
 * - score = floor(distanceRan * 0.025)
 * - speed starts at 6, +1 every 100 score, max 13
 */

export const CANVAS_W = 720
export const CANVAS_H = 360
export const GROUND_Y = 280
export const DINO_X = 96
export const DINO_W = 44
export const DINO_H = 48
export const GRAVITY = 0.85
export const JUMP_VELOCITY = -14

/** Chrome-like speed curve */
export const START_SPEED = 6
export const MAX_SPEED = 13
export const SPEED_STEP_SCORE = 100
export const SCORE_RATE = 0.025

export const OBSTACLE_W = 34
export const BASE_OBSTACLE_H = 42

export interface Obstacle {
  id: number
  x: number
  w: number
  h: number
}

export interface JumpState {
  /** Internal distance accumulator (Chrome distanceRan) */
  distanceRan: number
  dinoY: number
  velocityY: number
  grounded: boolean
  obstacles: Obstacle[]
  spawnCooldown: number
  nextObstacleId: number
  dead: boolean
}

export function createJumpState(): JumpState {
  return {
    distanceRan: 0,
    dinoY: GROUND_Y - DINO_H,
    velocityY: 0,
    grounded: true,
    obstacles: [],
    spawnCooldown: 90,
    nextObstacleId: 1,
    dead: false
  }
}

export function getScore(distanceRan: number): number {
  return Math.floor(distanceRan * SCORE_RATE)
}

export function getScrollSpeed(distanceRan: number): number {
  const score = getScore(distanceRan)
  const tier = Math.floor(score / SPEED_STEP_SCORE)
  return Math.min(MAX_SPEED, START_SPEED + tier)
}

export type Rng = () => number

/** Minimum clearance so a jump can always clear back-to-back obstacles */
export const MIN_SAFE_GAP = 96

/**
 * Gap between obstacles shrinks as speed rises (Chrome-style) with random jitter.
 * Base gap gets a random bonus of 0..(140 - speed*4) so spacing feels irregular
 * but never closer than MIN_SAFE_GAP.
 */
export function getObstacleGap(speed: number, rng: Rng = Math.random): number {
  const base = Math.max(MIN_SAFE_GAP, 200 - speed * 10)
  const jitterRange = Math.max(40, 150 - speed * 4)
  return Math.round(base + rng() * jitterRange)
}

/** Random-ish delay (in frames) before the spawn check runs again */
export function getSpawnInterval(speed: number, rng: Rng = Math.random): number {
  const base = Math.max(42, 120 - speed * 5)
  const jitter = Math.round(rng() * 40)
  return base + jitter
}

export function getObstacleHeight(distanceRan: number, rng: Rng = Math.random): number {
  const score = getScore(distanceRan)
  const tier = Math.floor(score / SPEED_STEP_SCORE)
  const max = Math.min(68, BASE_OBSTACLE_H + tier * 2)
  // Randomly pick a shorter or taller cactus within [BASE_OBSTACLE_H-8, max]
  const min = Math.max(28, BASE_OBSTACLE_H - 8)
  return Math.round(min + rng() * (max - min))
}

export function getObstacleWidth(rng: Rng = Math.random): number {
  // Occasionally spawn a wider (double) cactus
  return rng() < 0.28 ? OBSTACLE_W + 18 : OBSTACLE_W
}

/** Score threshold 1000 ≈ 40,000 distanceRan at Chrome rate */
export function distanceForScore(score: number): number {
  return score / SCORE_RATE
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

export function tickJumpState(
  state: JumpState,
  jumpPressed: boolean,
  rng: Rng = Math.random
): JumpState {
  if (state.dead) return state

  const next = { ...state, obstacles: [...state.obstacles] }
  const scrollSpeed = getScrollSpeed(next.distanceRan)

  if (jumpPressed && next.grounded) {
    next.velocityY = JUMP_VELOCITY
    next.grounded = false
  }

  next.velocityY += GRAVITY
  next.dinoY += next.velocityY

  const floorY = GROUND_Y - DINO_H
  if (next.dinoY >= floorY) {
    next.dinoY = floorY
    next.velocityY = 0
    next.grounded = true
  }

  next.distanceRan += scrollSpeed
  next.obstacles = next.obstacles
    .map((o) => ({ ...o, x: o.x - scrollSpeed }))
    .filter((o) => o.x + o.w > -40)

  next.spawnCooldown -= 1
  if (next.spawnCooldown <= 0) {
    const gap = getObstacleGap(scrollSpeed, rng)
    const last = next.obstacles[next.obstacles.length - 1]
    // Only spawn once the previous obstacle is far enough left to keep a random gap
    const canSpawn = !last || last.x + last.w + gap <= CANVAS_W + 24
    if (canSpawn) {
      next.obstacles.push({
        id: next.nextObstacleId++,
        x: CANVAS_W + 24,
        w: getObstacleWidth(rng),
        h: getObstacleHeight(next.distanceRan, rng)
      })
      next.spawnCooldown = getSpawnInterval(scrollSpeed, rng)
    } else {
      // Not enough room yet — re-check again soon
      next.spawnCooldown = 6
    }
  }

  for (const obstacle of next.obstacles) {
    const hitboxPad = 6
    if (
      rectsOverlap(
        DINO_X + hitboxPad,
        next.dinoY + hitboxPad,
        DINO_W - hitboxPad * 2,
        DINO_H - hitboxPad * 2,
        obstacle.x,
        GROUND_Y - obstacle.h,
        obstacle.w,
        obstacle.h
      )
    ) {
      next.dead = true
      break
    }
  }

  return next
}
