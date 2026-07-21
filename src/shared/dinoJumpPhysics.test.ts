import { describe, expect, it } from 'vitest'
import {
  SCORE_RATE,
  START_SPEED,
  MAX_SPEED,
  ACCELERATION,
  MIN_SAFE_GAP,
  GRAVITY,
  INITIAL_JUMP_VELOCITY,
  MIN_JUMP_HEIGHT,
  createJumpState,
  getScore,
  getNextSpeed,
  getObstacleGap,
  getSpawnInterval,
  tickJumpState
} from '../hub/minigame/dino-jump/dinoJumpPhysics'

describe('chrome-style dino physics', () => {
  it('converts distanceRan to score like Chrome', () => {
    expect(getScore(0)).toBe(0)
    expect(getScore(4000)).toBe(100)
    expect(getScore(40000)).toBe(1000)
    expect(SCORE_RATE).toBe(0.025)
  })

  it('accelerates continuously up to the Chrome maximum', () => {
    expect(START_SPEED).toBe(6)
    expect(ACCELERATION).toBe(0.001)
    expect(getNextSpeed(START_SPEED)).toBeCloseTo(6.001)
    expect(getNextSpeed(MAX_SPEED)).toBe(MAX_SPEED)

    const next = tickJumpState(createJumpState())
    expect(next.distanceRan).toBe(START_SPEED)
    expect(next.currentSpeed).toBeCloseTo(START_SPEED + ACCELERATION)
  })

  it('randomizes gap but never below the safe minimum', () => {
    const gapMin = getObstacleGap(START_SPEED, () => 0)
    const gapMax = getObstacleGap(START_SPEED, () => 0.999)
    expect(gapMin).toBeGreaterThanOrEqual(MIN_SAFE_GAP)
    expect(gapMax).toBeGreaterThan(gapMin)
  })

  it('randomizes spawn interval within a range', () => {
    const low = getSpawnInterval(START_SPEED, () => 0)
    const high = getSpawnInterval(START_SPEED, () => 1)
    expect(high).toBeGreaterThan(low)
    expect(low).toBeGreaterThanOrEqual(55)
  })

  it('uses Chrome-like jump constants', () => {
    expect(GRAVITY).toBe(0.6)
    expect(INITIAL_JUMP_VELOCITY).toBe(-11.5)
    expect(MIN_JUMP_HEIGHT).toBe(35)
  })

  it('holds longer for a higher jump and cuts short on release', () => {
    let held = createJumpState()
    held = tickJumpState(held, { jumpPressed: true, jumpHeld: true, jumpReleased: false })

    let short = createJumpState()
    short = tickJumpState(short, { jumpPressed: true, jumpHeld: true, jumpReleased: false })
    short = tickJumpState(short, { jumpPressed: false, jumpHeld: false, jumpReleased: true })

    for (let i = 0; i < 24; i++) {
      held = tickJumpState(held, { jumpPressed: false, jumpHeld: true, jumpReleased: false })
      short = tickJumpState(short, { jumpPressed: false, jumpHeld: false, jumpReleased: false })
    }

    expect(held.dinoY).toBeLessThan(short.dinoY)
  })
})
