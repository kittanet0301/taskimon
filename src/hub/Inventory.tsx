import type { GameSave, ItemType } from '../shared/types'
import { ITEMS } from '../shared/items'

interface Props {
  save: GameSave
  onUpdated: () => void
}

export function Inventory({ save, onUpdated }: Props) {
  const use = async (type: ItemType) => {
    await window.electronAPI.patchGame('useItem', [type])
    onUpdated()
  }

  return (
    <div className="card">
      <h2>กระเป๋าไอเทม</h2>
      {save.inventory.length === 0 && <p>ยังไม่มีไอเทม</p>}
      {save.inventory.map((item) => (
        <div key={item.type} className="inventory-item">
          <div>
            <strong>{ITEMS[item.type].label}</strong>
            <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{ITEMS[item.type].description}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span>x{item.quantity}</span>
            <button className="primary" onClick={() => use(item.type)} disabled={!save.pet || save.pet.stage === 'egg'}>
              ใช้
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
