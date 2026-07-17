import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameSave, ItemType } from '../shared/types'
import { ITEM_ICON_SRC } from '../shared/itemIcons'
import { tItemDescription, tItemLabel } from '../i18n/labels'

interface PendingGift {
  id: string
  senderId: string
  senderName: string
  itemType: string
  quantity: number
  createdAt: string
}

interface Props {
  save: GameSave
  onClose: () => void
  onUpdated?: () => void | Promise<void>
}

type InventoryTab = 'items' | 'gifts'

export function Inventory({ save, onClose, onUpdated }: Props) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<InventoryTab>('items')
  const [pending, setPending] = useState<PendingGift[]>([])
  const [loadingGifts, setLoadingGifts] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const items = save.inventory.filter((item) => item.quantity > 0)

  const loadPending = useCallback(async () => {
    setLoadingGifts(true)
    setError(null)
    try {
      const rows = await window.electronAPI.listPendingGifts()
      setPending(rows)
      if (rows.length > 0) setTab('gifts')
    } catch (e) {
      setPending([])
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoadingGifts(false)
    }
  }, [])

  useEffect(() => {
    void loadPending()
  }, [loadPending])

  const claimOne = async (giftId: string) => {
    setClaiming(true)
    setError(null)
    try {
      await window.electronAPI.claimPendingGifts(giftId)
      await onUpdated?.()
      await loadPending()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setClaiming(false)
    }
  }

  const claimAll = async () => {
    setClaiming(true)
    setError(null)
    try {
      await window.electronAPI.claimPendingGifts(null)
      await onUpdated?.()
      await loadPending()
      setTab('items')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setClaiming(false)
    }
  }

  return (
    <div className="hub-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="hub-modal inventory-modal card" onClick={(e) => e.stopPropagation()}>
        <div className="hub-modal-head">
          <h2>{t('inventory.title')}</h2>
          <button type="button" className="hub-modal-close" onClick={onClose} aria-label={t('common.cancel')}>
            ×
          </button>
        </div>

        <div className="inventory-tabs">
          <button
            type="button"
            className={`inventory-tab${tab === 'items' ? ' inventory-tab--active' : ''}`}
            onClick={() => setTab('items')}
          >
            {t('inventory.itemsTab')}
          </button>
          <button
            type="button"
            className={`inventory-tab${tab === 'gifts' ? ' inventory-tab--active' : ''}`}
            onClick={() => setTab('gifts')}
          >
            {t('inventory.giftsTab')}
            {pending.length > 0 && <span className="inventory-tab-badge">{pending.length}</span>}
          </button>
        </div>

        {error && <p className="gift-error">{error}</p>}

        {tab === 'items' ? (
          items.length === 0 ? (
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
          )
        ) : loadingGifts ? (
          <p className="pixel-muted-text">{t('common.loading')}</p>
        ) : pending.length === 0 ? (
          <p>{t('gift.noPending')}</p>
        ) : (
          <div className="inventory-gifts">
            <ul className="inventory-gift-list">
              {pending.map((gift) => {
                const type = gift.itemType as ItemType
                return (
                  <li key={gift.id} className="inventory-gift-row">
                    <img
                      className="hud-icon"
                      src={ITEM_ICON_SRC[type] ?? ITEM_ICON_SRC.food_basic}
                      alt=""
                      draggable={false}
                    />
                    <div className="inventory-gift-info">
                      <strong>
                        {tItemLabel(type)} ×{gift.quantity}
                      </strong>
                      <span>{t('gift.from', { name: gift.senderName })}</span>
                    </div>
                    <button
                      type="button"
                      className="dash-hud-action dash-hud-action--inline"
                      onClick={() => void claimOne(gift.id)}
                      disabled={claiming}
                    >
                      {t('gift.claim')}
                    </button>
                  </li>
                )
              })}
            </ul>
            <button
              type="button"
              className="dash-hud-action dash-hud-action--inline gift-send-btn"
              onClick={() => void claimAll()}
              disabled={claiming}
            >
              {claiming ? t('gift.claiming') : t('gift.claimAll')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
