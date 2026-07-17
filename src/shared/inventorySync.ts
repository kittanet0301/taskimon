import type { InventoryItem, ItemType } from './types'

/** Apply gift rows onto a local inventory (additive by item type). */
export function applyGiftRows(
  local: InventoryItem[],
  gifts: Array<{ item_type: string; quantity: number }>
): InventoryItem[] {
  const map = new Map<string, number>(local.map((item) => [item.type, item.quantity]))
  for (const gift of gifts) {
    if (!gift.item_type || gift.quantity <= 0) continue
    map.set(gift.item_type, (map.get(gift.item_type) ?? 0) + gift.quantity)
  }
  return [...map.entries()]
    .filter(([, quantity]) => quantity > 0)
    .map(([type, quantity]) => ({ type: type as ItemType, quantity }))
}
