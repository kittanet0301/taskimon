import type { LobbyAnim } from './types'

export interface PhysicsState {
  x: number
  y: number
  facing: 'left' | 'right'
  anim: LobbyAnim
  jumpUntil: number
  emoteUntil: number
  emote: boolean
  groundY: number
}

export interface LobbyInput {
  move: -1 | 0 | 1
  jump: boolean
  dash: boolean
  greet: boolean
}

const WALK_SPEED = 0.0022
const DASH_SPEED = 0.0048
const MIN_X = 0.06
const MAX_X = 0.94
export const LOBBY_GROUND_Y = 0.62
const JUMP_FRAMES = 36
const EMOTE_FRAMES = 48

export function createRandomSpawn(): Pick<PhysicsState, 'x' | 'y' | 'facing'> {
  return {
    x: MIN_X + Math.random() * (MAX_X - MIN_X),
    y: LOBBY_GROUND_Y,
    facing: Math.random() < 0.5 ? 'left' : 'right'
  }
}

export function createPhysicsState(): PhysicsState {
  const spawn = createRandomSpawn()
  return {
    ...spawn,
    anim: 'idle',
    jumpUntil: 0,
    emoteUntil: 0,
    emote: false,
    groundY: LOBBY_GROUND_Y
  }
}

export function resetPhysicsSpawn(state: PhysicsState): PhysicsState {
  const spawn = createRandomSpawn()
  return {
    ...state,
    ...spawn,
    anim: 'idle',
    jumpUntil: 0,
    emoteUntil: 0,
    emote: false,
    y: LOBBY_GROUND_Y
  }
}

export function tickPhysics(state: PhysicsState, frame: number, input: LobbyInput): PhysicsState {
  const next = { ...state }

  if (input.greet && frame >= next.emoteUntil && frame >= next.jumpUntil) {
    next.emote = true
    next.emoteUntil = frame + EMOTE_FRAMES
  }

  if (frame >= next.jumpUntil && input.jump) {
    next.jumpUntil = frame + JUMP_FRAMES
    next.emote = false
    next.emoteUntil = 0
  }

  const jumping = frame < next.jumpUntil
  const emoting = !jumping && next.emote && frame < next.emoteUntil

  if (jumping) {
    const t = (frame - (next.jumpUntil - JUMP_FRAMES)) / JUMP_FRAMES
    next.y = next.groundY - Math.sin(Math.PI * t) * 0.12
  } else {
    next.y = next.groundY
    if (!emoting) {
      next.emote = false
    }
  }

  const dashing = input.dash && !emoting
  const moving = input.move !== 0 && !emoting

  // Horizontal movement runs even mid-jump so you can walk and jump together.
  if (moving) {
    const speed = jumping ? WALK_SPEED * 0.85 : dashing ? DASH_SPEED : WALK_SPEED
    next.x += input.move * speed
    next.facing = input.move < 0 ? 'left' : 'right'
  }

  // Animation priority: jump takes over the sprite, then bite, then move, then idle.
  if (jumping) {
    next.anim = 'jump'
  } else if (emoting) {
    next.anim = 'bite'
  } else if (moving) {
    next.anim = dashing ? 'dash' : 'walk'
  } else {
    next.anim = 'idle'
  }

  next.x = Math.max(MIN_X, Math.min(MAX_X, next.x))
  return next
}
