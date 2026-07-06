import type { LobbyAnim } from './types'

export interface PhysicsState {
  x: number
  y: number
  facing: 'left' | 'right'
  anim: LobbyAnim
  jumpUntil: number
  groundY: number
}

export interface LobbyInput {
  move: -1 | 0 | 1
  jump: boolean
}

const WALK_SPEED = 0.0022
const MIN_X = 0.06
const MAX_X = 0.94
const GROUND_Y = 0.62
const JUMP_FRAMES = 36

export function createPhysicsState(seed: string): PhysicsState {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash + seed.charCodeAt(i) * (i + 1)) % 1000
  const x = MIN_X + (hash % 700) / 1000
  return {
    x,
    y: GROUND_Y,
    facing: 'right',
    anim: 'idle',
    jumpUntil: 0,
    groundY: GROUND_Y
  }
}

export function tickPhysics(state: PhysicsState, frame: number, input: LobbyInput): PhysicsState {
  const next = { ...state }

  if (frame >= next.jumpUntil && input.jump) {
    next.jumpUntil = frame + JUMP_FRAMES
  }

  const jumping = frame < next.jumpUntil

  if (jumping) {
    const t = (frame - (next.jumpUntil - JUMP_FRAMES)) / JUMP_FRAMES
    next.y = next.groundY - Math.sin(Math.PI * t) * 0.12
    next.anim = 'jump'
  } else {
    next.y = next.groundY
  }

  if (input.move !== 0) {
    const speed = jumping ? WALK_SPEED * 0.65 : WALK_SPEED
    next.x += input.move * speed
    next.facing = input.move < 0 ? 'left' : 'right'
    if (!jumping) next.anim = 'walk'
  } else if (!jumping) {
    next.anim = 'idle'
  }

  next.x = Math.max(MIN_X, Math.min(MAX_X, next.x))
  return next
}
