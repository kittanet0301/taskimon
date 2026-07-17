import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameSave, ItemType } from '../shared/types'
import { ITEM_ICON_SRC } from '../shared/itemIcons'
import { tItemLabel } from '../i18n/labels'

interface Props {
  save: GameSave
  recipientId: string
  recipientName: string
  onClose: () => void
  onSent: () => void | Promise<void>
}

export function SendGiftModal({ save, recipientId, recipientName, onClose, onSent }: Props) {
  const { t } = useTranslation()
  const [picks, setPicks] = useState<Partial<Record<ItemType, number>>>({})
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentSummary, setSentSummary] = useState<Array<{ type: ItemType; quantity: number }> | null>(null)

  const items = save.inventory.filter((item) => item.quantity > 0)
  const totalPicked = Object.values(picks).reduce((sum, qty) => sum + (qty ?? 0), 0)

  const step = (type: ItemType, delta: number, max: number) => {
    setPicks((prev) => {
      const next = Math.max(0, Math.min(max, (prev[type] ?? 0) + delta))
      return { ...prev, [type]: next }
    })
  }

  const submit = async () => {
    setError(null)
    const toSend = (Object.entries(picks) as [ItemType, number][]).filter(([, qty]) => qty > 0)
    if (toSend.length === 0) return
    setSending(true)
    try {
      for (const [type, qty] of toSend) {
        await window.electronAPI.sendGift(recipientId, type, qty)
      }
      await onSent()
      setSentSummary(toSend.map(([type, quantity]) => ({ type, quantity })))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSending(false)
    }
  }

  if (sentSummary) {
    return (
      <div className="hub-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
        <div className="hub-modal gift-modal gift-success-modal card" onClick={(e) => e.stopPropagation()}>
          <div className="hub-modal-head">
            <h2>{t('gift.sentTitle')}</h2>
            <button type="button" className="hub-modal-close" onClick={onClose} aria-label={t('common.cancel')}>
              ×
            </button>
          </div>
          <p className="gift-success-message">{t('gift.sentBody', { name: recipientName })}</p>
          <ul className="gift-success-list">
            {sentSummary.map((item) => (
              <li key={item.type} className="gift-success-row">
                <img className="hud-icon" src={ITEM_ICON_SRC[item.type]} alt="" draggable={false} />
                <strong>
                  {tItemLabel(item.type)} ×{item.quantity}
                </strong>
              </li>
            ))}
          </ul>
          <button type="button" className="dash-hud-action dash-hud-action--inline gift-send-btn" onClick={onClose}>
            {t('gift.sentOk')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="hub-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="hub-modal gift-modal card" onClick={(e) => e.stopPropagation()}>
        <div className="hub-modal-head">
          <h2>{t('gift.titleTo', { name: recipientName })}</h2>
          <button type="button" className="hub-modal-close" onClick={onClose} aria-label={t('common.cancel')}>
            ×
          </button>
        </div>

        {items.length === 0 ? (
          <p>{t('inventory.empty')}</p>
        ) : (
          <div className="gift-item-list">
            {items.map((item) => {
              const picked = picks[item.type] ?? 0
              return (
                <div key={item.type} className="gift-item-row">
                  <img className="hud-icon" src={ITEM_ICON_SRC[item.type]} alt="" draggable={false} />
                  <div className="gift-item-info">
                    <strong>{tItemLabel(item.type)}</strong>
                    <span>{t('gift.owned', { count: item.quantity })}</span>
                  </div>
                  <div className="gift-item-stepper">
                    <button
                      type="button"
                      onClick={() => step(item.type, -1, item.quantity)}
                      disabled={picked <= 0}
                      aria-label="-"
                    >
                      −
                    </button>
                    <span>{picked}</span>
                    <button
                      type="button"
                      onClick={() => step(item.type, 1, item.quantity)}
                      disabled={picked >= item.quantity}
                      aria-label="+"
                    >
                      +
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {error && <p className="gift-error">{error}</p>}

        <button
          type="button"
          className="dash-hud-action dash-hud-action--inline gift-send-btn"
          onClick={submit}
          disabled={sending || totalPicked === 0}
        >
          {sending ? t('gift.sending') : t('gift.send')}
        </button>
      </div>
    </div>
  )
}
