import { describe, expect, it } from 'vitest'
import {
  SCORE_RATE,
  START_SPEED,
  MAX_SPEED,
  MIN_SAFE_GAP,
  getScore,
  getScrollSpeed,
  getObstacleGap,
  getSpawnInterval,
  distanceForScore
} from '../hub/minigame/dino-jump/dinoJumpPhysics'

describe('chrome-style dino physics', () => {
  it('converts distanceRan to score like Chrome', () => {
    expect(getScore(0)).toBe(0)
    expect(getScore(4000)).toBe(100)
    expect(getScore(40000)).toBe(1000)
    expect(SCORE_RATE).toBe(0.025)
  })

  it('increases speed every 100 score', () => {
    expect(getScrollSpeed(0)).toBe(START_SPEED)
    expect(getScrollSpeed(distanceForScore(99))).toBe(START_SPEED)
    expect(getScrollSpeed(distanceForScore(100))).toBe(START_SPEED + 1)
    expect(getScrollSpeed(distanceForScore(700))).toBe(MAX_SPEED)
    expect(getScrollSpeed(distanceForScore(9999))).toBe(MAX_SPEED)
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
    expect(low).toBeGreaterThanOrEqual(42)
  })
})
