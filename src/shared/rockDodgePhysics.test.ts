import { describe, expect, it } from 'vitest'
import {
  CANVAS_W,
  PLAYER_W,
  PLAYER_Y,
  SCORE_RATE,
  START_FALL_SPEED,
  MAX_FALL_SPEED,
  createDodgeState,
  getFallSpeed,
  getScore,
  getSpawnInterval,
  spawnRock,
  survivalForScore,
  tickDodgeState
} from '../hub/minigame/rock-dodge/rockDodgePhysics'

describe('rock dodge physics', () => {
  it('converts survival to score like Dino Jump', () => {
    expect(getScore(0)).toBe(0)
    expect(getScore(4000)).toBe(100)
    expect(getScore(40000)).toBe(1000)
    expect(SCORE_RATE).toBe(0.025)
  })

  it('increases fall speed every 100 score', () => {
    expect(getFallSpeed(0)).toBe(START_FALL_SPEED)
    expect(getFallSpeed(survivalForScore(99))).toBe(START_FALL_SPEED)
    expect(getFallSpeed(survivalForScore(100))).toBe(START_FALL_SPEED + 1)
    expect(getFallSpeed(survivalForScore(800))).toBe(MAX_FALL_SPEED)
  })

  it('moves the player left and right within bounds', () => {
    let state = { ...createDodgeState(), spawnCooldown: 99_999, rocks: [] }
    const startX = state.playerX
    state = tickDodgeState(state, { move: -1 }, () => 0)
    expect(state.playerX).toBeLessThan(startX)

    for (let i = 0; i < 200; i++) {
      state = tickDodgeState(state, { move: -1 }, () => 0)
    }
    expect(state.playerX).toBe(0)

    for (let i = 0; i < 400; i++) {
      state = tickDodgeState(state, { move: 1 }, () => 0)
    }
    expect(state.playerX).toBe(CANVAS_W - PLAYER_W)
  })

  it('marks dead on rock collision', () => {
    let state = createDodgeState()
    state = {
      ...state,
      playerX: 100,
      rocks: [
        {
          id: 1,
          x: 100,
          y: PLAYER_Y,
          w: 40,
          h: 40,
          vy: 0,
          kind: 'rock'
        }
      ],
      spawnCooldown: 9999
    }
    state = tickDodgeState(state, { move: 0 }, () => 0)
    expect(state.dead).toBe(true)
  })

  it('spawns rocks and shortens interval as speed rises', () => {
    const rock = spawnRock(START_FALL_SPEED, 7, () => 0)
    expect(rock.id).toBe(7)
    expect(rock.y).toBeLessThan(0)

    const slow = getSpawnInterval(START_FALL_SPEED, () => 0)
    const fast = getSpawnInterval(MAX_FALL_SPEED, () => 0)
    expect(fast).toBeLessThan(slow)
  })
})
