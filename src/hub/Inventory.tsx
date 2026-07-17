import { useTranslation } from 'react-i18next'
import type { GameSave } from '../shared/types'
import { ITEM_ICON_SRC } from '../shared/itemIcons'
import { tItemDescription, tItemLabel } from '../i18n/labels'

interface Props {
  save: GameSave
  onClose: () => void
}

export function Inventory({ save, onClose }: Props) {
  const { t } = useTranslation()
  const items = save.inventory.filter((item) => item.quantity > 0)

  return (
    <div className="hub-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="hub-modal inventory-modal card" onClick={(e) => e.stopPropagation()}>
        <div className="hub-modal-head">
          <h2>{t('inventory.title')}</h2>
          <button type="button" className="hub-modal-close" onClick={onClose} aria-label={t('common.cancel')}>
            ×
          </button>
        </div>

        {items.length === 0 ? (
          <p>{t('inventory.empty')}</p>
        ) : (
          <div className="inventory-grid">
            {items.map((item) => (
              <div key={item.type} className="inventory-grid-item" title={tItemDescription(item.type)}>
                <img className="hud-icon" src={ITEM_ICON_SRC[item.type]} alt="" draggable={false} />
                <span className="inventory-grid-item-name">{tItemLabel(item.type)}</span>
                <strong className="inventory-grid-item-qty">×{item.quantity}</strong>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
