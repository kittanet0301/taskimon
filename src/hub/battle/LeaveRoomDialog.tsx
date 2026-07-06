import { useTranslation } from 'react-i18next'

interface Props {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function LeaveRoomDialog({ open, onConfirm, onCancel }: Props) {
  const { t } = useTranslation()
  if (!open) return null

  return (
    <div className="leave-dialog-overlay">
      <div className="leave-dialog card">
        <h3>{t('battle.leaveRoomConfirmTitle')}</h3>
        <p>{t('battle.leaveRoomConfirmBody')}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button type="button" className="secondary" onClick={onCancel}>
            {t('battle.stay')}
          </button>
          <button type="button" className="primary" onClick={onConfirm}>
            {t('battle.leaveRoom')}
          </button>
        </div>
      </div>
    </div>
  )
}
