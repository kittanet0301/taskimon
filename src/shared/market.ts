import type { ItemType } from './types'

export type MarketOfferKind = 'egg' | 'slots' | 'item' | 'bundle'

export type MarketOffer =
  | { id: string; kind: 'egg'; cost: number }
  | { id: string; kind: 'slots'; cost: number; slots: number }
  | { id: string; kind: 'item'; cost: number; itemType: ItemType; quantity: number }
  | {
      id: string
      kind: 'bundle'
      cost: number
      items: Array<{ type: ItemType; quantity: number }>
    }

export const MARKET_OFFERS: MarketOffer[] = [
  { id: 'egg_random', kind: 'egg', cost: 25 },
  { id: 'slots_1', kind: 'slots', cost: 12, slots: 1 },
  { id: 'slots_5', kind: 'slots', cost: 50, slots: 5 },
  { id: 'item_food_basic', kind: 'item', cost: 2, itemType: 'food_basic', quantity: 1 },
  { id: 'item_water', kind: 'item', cost: 2, itemType: 'water', quantity: 1 },
  { id: 'item_medicine', kind: 'item', cost: 3, itemType: 'medicine', quantity: 1 },
  { id: 'item_toy', kind: 'item', cost: 3, itemType: 'toy', quantity: 1 },
  { id: 'item_food_premium', kind: 'item', cost: 5, itemType: 'food_premium', quantity: 1 },
  { id: 'item_battle_shield', kind: 'item', cost: 8, itemType: 'battle_shield', quantity: 1 },
  { id: 'item_skill_forget', kind: 'item', cost: 12, itemType: 'skill_forget', quantity: 1 },
  { id: 'item_breed_nest', kind: 'item', cost: 15, itemType: 'breed_nest', quantity: 1 },
  {
    id: 'bundle_care',
    kind: 'bundle',
    cost: 8,
    items: [
      { type: 'food_basic', quantity: 3 },
      { type: 'water', quantity: 2 },
      { type: 'medicine', quantity: 1 }
    ]
  }
]

const OFFER_BY_ID = new Map(MARKET_OFFERS.map((o) => [o.id, o]))

export function getMarketOffer(id: string): MarketOffer | undefined {
  return OFFER_BY_ID.get(id)
}

export function marketOffersByKind(kind: MarketOfferKind): MarketOffer[] {
  return MARKET_OFFERS.filter((o) => o.kind === kind)
}
