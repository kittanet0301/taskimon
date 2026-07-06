import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { BattleSession } from '../../shared/battle/types'
import { mapBattleSession } from '../../shared/battle/mappers'

export function BattleHistory() {
  const { t, i18n } = useTranslation()
  const [battles, setBattles] = useState<BattleSession[]>([])
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const session = (await window.electronAPI.getSession()) as { user: { id: string } } | null
      if (!session?.user?.id) return
      setUserId(session.user.id)
      const rows = (await window.electronAPI.listBattles()) as Record<string, unknown>[]
      setBattles(
        rows
          .map(mapBattleSession)
          .filter((s) => ['completed', 'fled', 'declined', 'expired'].includes(s.status))
      )
    })()
  }, [])

  if (!userId) return null

  return (
    <div className="battle-history">
      <h3>{t('battle.historyTitle')}</h3>
      {battles.length === 0 ? (
        <p>{t('battle.historyEmpty')}</p>
      ) : (
        <ul className="room-list">
          {battles.map((b) => {
            const won = b.winnerUserId === userId
            const fled = b.status === 'fled'
            const label =
              b.status === 'declined'
                ? t('battle.resultDeclined')
                : b.status === 'expired'
                  ? t('battle.resultExpired')
                  : fled
                    ? b.fledUserId === userId
                      ? t('battle.resultFledSelf')
                      : t('battle.resultFledEnemy')
                    : won
                      ? t('battle.resultWin')
                      : t('battle.resultLose')
            return (
              <li key={b.id} className="room-list-item">
                <span>
                  <span className="tag">{label}</span>
                  {new Date(b.createdAt).toLocaleString(i18n.language === 'th' ? 'th-TH' : 'en-US')}
                </span>
                <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                  {t('battle.lastHp')} {b.challengerHp} - {b.defenderHp}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
