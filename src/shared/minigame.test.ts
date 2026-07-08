import { describe, expect, it } from 'vitest'
import { createDefaultSave } from './growth'
import { applyFinishMinigame, minigameItemsLeft } from './minigame'

describe('minigame rewards', () => {
  it('grants random item when score meets threshold', () => {
    const save = createDefaultSave()
    const totalBefore = save.inventory.reduce((sum, item) => sum + item.quantity, 0)
    const { save: next, result } = applyFinishMinigame(save, 'dino_jump', 1200)
    const totalAfter = next.inventory.reduce((sum, item) => sum + item.quantity, 0)
    expect(result.rewarded).toBe(true)
    expect(result.reward?.quantity).toBe(1)
    expect(totalAfter).toBe(totalBefore + 1)
    expect(minigameItemsLeft(next, 'dino_jump')).toBe(2)
  })

  it('does not grant item below threshold', () => {
    const save = createDefaultSave()
    const { save: next, result } = applyFinishMinigame(save, 'dino_jump', 400)
    expect(result.rewarded).toBe(false)
    expect(result.reason).toBe('below_threshold')
    expect(next.inventory).toEqual(save.inventory)
  })

  it('stops granting after daily item limit', () => {
    let save = createDefaultSave()
    for (let i = 0; i < 3; i++) {
      save = applyFinishMinigame(save, 'dino_jump', 1500).save
    }
    const { result } = applyFinishMinigame(save, 'dino_jump', 2000)
    expect(result.rewarded).toBe(false)
    expect(result.reason).toBe('quota')
    expect(minigameItemsLeft(save, 'dino_jump')).toBe(0)
  })
})
