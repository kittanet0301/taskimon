import { useTranslation } from 'react-i18next'
import type { GameSave, ItemType } from '../shared/types'
import { tItemDescription, tItemLabel } from '../i18n/labels'

interface Props {
  save: GameSave
  onUpdated: () => void
}

export function Inventory({ save, onUpdated }: Props) {
  const { t } = useTranslation()
  const use = async (type: ItemType) => {
    await window.electronAPI.patchGame('useItem', [type])
    onUpdated()
  }

  return (
    <div className="card">
      <h2>{t('inventory.title')}</h2>
      {save.inventory.length === 0 && <p>{t('inventory.empty')}</p>}
      {save.inventory.map((item) => (
        <div key={item.type} className="inventory-item">
          <div>
            <strong>{tItemLabel(item.type)}</strong>
            <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{tItemDescription(item.type)}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span>x{item.quantity}</span>
            <button className="primary" onClick={() => use(item.type)} disabled={!save.pet || save.pet.stage === 'egg'}>
              {t('inventory.use')}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
