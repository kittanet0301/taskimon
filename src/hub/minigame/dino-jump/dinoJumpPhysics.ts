/**
 * Dino Jump pacing (easier than Chrome defaults):
 * - distanceRan accumulates by currentSpeed each frame
 * - score = floor(distanceRan * 0.025)
 * - speed starts at 3, +1 every 100 score, max 8
 */

export const CANVAS_W = 720
export const CANVAS_H = 360
export const GROUND_Y = 280
export const DINO_X = 96
export const DINO_W = 44
export const DINO_H = 48

/** Jump feel — slightly higher arc than Chrome for clearer clears */
export const GRAVITY = 0.6
export const INITIAL_JUMP_VELOCITY = -11.5
export const DROP_VELOCITY = -5
export const MIN_JUMP_HEIGHT = 35
export const SPEED_DROP_COEFFICIENT = 3

/** Slower scroll than Chrome for a more forgiving run */
export const START_SPEED = 3
export const MAX_SPEED = 8
export const SPEED_STEP_SCORE = 100
export const SCORE_RATE = 0.025

export const OBSTACLE_W = 34
export const BASE_OBSTACLE_H = 36

/** Collision inset — larger pad = smaller effective hitbox */
export const PLAYER_HITBOX_PAD = 2
export const OBSTACLE_HITBOX_PAD = 5

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
  jumping: boolean
  reachedMinHeight: boolean
  speedDrop: boolean
  obstacles: Obstacle[]
  spawnCooldown: number
  nextObstacleId: number
  dead: boolean
}

export interface JumpInput {
  /** Edge: jump key / tap pressed this frame */
  jumpPressed: boolean
  /** Level: jump key still held */
  jumpHeld: boolean
  /** Edge: jump key released this frame */
  jumpReleased: boolean
}

export const EMPTY_JUMP_INPUT: JumpInput = {
  jumpPressed: false,
  jumpHeld: false,
  jumpReleased: false
}

function floorY(): number {
  return GROUND_Y - DINO_H
}

function minJumpY(): number {
  return floorY() - MIN_JUMP_HEIGHT
}

function startJump(state: JumpState, scrollSpeed: number): void {
  state.velocityY = INITIAL_JUMP_VELOCITY - scrollSpeed / 10
  state.jumping = true
  state.reachedMinHeight = false
  state.speedDrop = false
  state.grounded = false
}

function endJump(state: JumpState): void {
  if (state.reachedMinHeight && state.velocityY < DROP_VELOCITY) {
    state.velocityY = DROP_VELOCITY
  }
}

function updateJumpArc(state: JumpState): void {
  if (state.speedDrop) {
    state.dinoY += Math.round(state.velocityY * SPEED_DROP_COEFFICIENT)
  } else {
    state.dinoY += Math.round(state.velocityY)
  }
  state.velocityY += GRAVITY

  if (state.dinoY <= minJumpY() || state.speedDrop) {
    state.reachedMinHeight = true
  }

  const ground = floorY()
  if (state.dinoY >= ground) {
    state.dinoY = ground
    state.velocityY = 0
    state.jumping = false
    state.grounded = true
    state.reachedMinHeight = false
    state.speedDrop = false
  } else {
    state.grounded = false
  }
}

export function createJumpState(): JumpState {
  return {
    distanceRan: 0,
    dinoY: floorY(),
    velocityY: 0,
    grounded: true,
    jumping: false,
    reachedMinHeight: false,
    speedDrop: false,
    obstacles: [],
    spawnCooldown: 120,
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
export const MIN_SAFE_GAP = 120

/**
 * Gap between obstacles shrinks as speed rises with random jitter.
 * Kept wider than Chrome so early runs feel fair.
 */
export function getObstacleGap(speed: number, rng: Rng = Math.random): number {
  const base = Math.max(MIN_SAFE_GAP, 240 - speed * 8)
  const jitterRange = Math.max(50, 170 - speed * 4)
  return Math.round(base + rng() * jitterRange)
}

/** Random-ish delay (in frames) before the spawn check runs again */
export function getSpawnInterval(speed: number, rng: Rng = Math.random): number {
  const base = Math.max(55, 145 - speed * 4)
  const jitter = Math.round(rng() * 45)
  return base + jitter
}

export function getObstacleHeight(distanceRan: number, rng: Rng = Math.random): number {
  const score = getScore(distanceRan)
  const tier = Math.floor(score / SPEED_STEP_SCORE)
  const max = Math.min(56, BASE_OBSTACLE_H + tier)
  const min = Math.max(24, BASE_OBSTACLE_H - 10)
  return Math.round(min + rng() * (max - min))
}

export function getObstacleWidth(rng: Rng = Math.random): number {
  return rng() < 0.14 ? OBSTACLE_W + 18 : OBSTACLE_W
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
  input: JumpInput = EMPTY_JUMP_INPUT,
  rng: Rng = Math.random
): JumpState {
  if (state.dead) return state

  const next = { ...state, obstacles: [...state.obstacles] }
  const scrollSpeed = getScrollSpeed(next.distanceRan)

  if (input.jumpPressed && !next.jumping && next.grounded) {
    startJump(next, scrollSpeed)
  }

  if (input.jumpReleased && next.jumping) {
    endJump(next)
  }

  if (next.jumping) {
    updateJumpArc(next)
  } else if (!next.grounded) {
    next.dinoY = floorY()
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
    const obstacleTop = GROUND_Y - obstacle.h
    if (
      rectsOverlap(
        DINO_X + PLAYER_HITBOX_PAD,
        next.dinoY + PLAYER_HITBOX_PAD,
        DINO_W - PLAYER_HITBOX_PAD * 2,
        DINO_H - PLAYER_HITBOX_PAD * 2,
        obstacle.x + OBSTACLE_HITBOX_PAD,
        obstacleTop + OBSTACLE_HITBOX_PAD,
        obstacle.w - OBSTACLE_HITBOX_PAD * 2,
        obstacle.h - OBSTACLE_HITBOX_PAD
      )
    ) {
      next.dead = true
      break
    }
  }

  return next
}
