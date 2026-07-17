import { describe, expect, it } from 'vitest'
import { applyGiftRows } from './inventorySync'

describe('applyGiftRows', () => {
  it('adds new gift item types onto local inventory', () => {
    const next = applyGiftRows(
      [{ type: 'water', quantity: 2 }],
      [{ item_type: 'toy', quantity: 1 }]
    )
    expect(next).toEqual([
      { type: 'water', quantity: 2 },
      { type: 'toy', quantity: 1 }
    ])
  })

  it('increments quantity for gifts of an existing type', () => {
    const next = applyGiftRows(
      [{ type: 'water', quantity: 2 }],
      [
        { item_type: 'water', quantity: 1 },
        { item_type: 'water', quantity: 1 }
      ]
    )
    expect(next).toEqual([{ type: 'water', quantity: 4 }])
  })
})
