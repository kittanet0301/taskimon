import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { MinigameId } from '../../shared/types'
import { MINIGAME_REGISTRY } from '../../shared/minigame'
import type { MinigameLeaderboardRow } from '../../shared/minigame'

interface Props {
  defaultGameId?: MinigameId
}

export function MiniGameRanking({ defaultGameId = 'dino_jump' }: Props) {
  const { t } = useTranslation()
  const [gameId, setGameId] = useState<MinigameId>(defaultGameId)
  const [rows, setRows] = useState<MinigameLeaderboardRow[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    void (async () => {
      const session = (await window.electronAPI.getSession()) as { user: { id: string } } | null
      setUserId(session?.user?.id ?? null)
    })()
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    void (async () => {
      try {
        const data = await window.electronAPI.getMinigameLeaderboard(gameId, 50)
        if (!cancelled) setRows(data)
      } catch (e) {
        if (!cancelled) {
          setRows([])
          setError(e instanceof Error ? e.message : String(e))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [gameId])

  const myRow = userId ? rows.find((row) => row.userId === userId) : undefined

  return (
    <div className="ranking-view card">
      <div className="ranking-header">
        <h2>{t('ranking.title')}</h2>
        <label className="ranking-filter">
          <span>{t('ranking.game')}</span>
          <select value={gameId} onChange={(e) => setGameId(e.target.value as MinigameId)}>
            {MINIGAME_REGISTRY.map((game) => (
              <option key={game.id} value={game.id}>
                {t(game.titleKey)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!userId && <p className="notice notice-info">{t('ranking.loginRequired')}</p>}
      {myRow && (
        <p className="ranking-self">
          {t('ranking.yourRank', { rank: myRow.rank, score: myRow.bestScore })}
        </p>
      )}

      {loading ? (
        <p className="pixel-muted-text">{t('app.syncing')}</p>
      ) : error ? (
        <p className="notice">{error}</p>
      ) : rows.length === 0 ? (
        <p className="pixel-muted-text">{t('ranking.empty')}</p>
      ) : (
        <div className="ranking-table-wrap">
          <table className="ranking-table">
            <thead>
              <tr>
                <th>{t('ranking.rank')}</th>
                <th>{t('ranking.player')}</th>
                <th>{t('ranking.score')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.userId}
                  className={row.userId === userId ? 'ranking-row-self' : undefined}
                >
                  <td>{row.rank}</td>
                  <td>{row.username}</td>
                  <td>{row.bestScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
