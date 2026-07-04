import { useCallback, useEffect, useState } from 'react'
import type { BattleSession, BattleTurn } from '../../shared/battle/types'
import { mapBattleSession, mapBattleTurn } from '../../shared/battle/mappers'

export function useBattleSession(userId: string | null, sessionId: string | null) {
  const [session, setSession] = useState<BattleSession | null>(null)
  const [turns, setTurns] = useState<BattleTurn[]>([])
  const [loading, setLoading] = useState(false)

  const loadSession = useCallback(async () => {
    if (!sessionId) {
      setSession(null)
      setTurns([])
      return
    }
    setLoading(true)
    try {
      const [battles, turnRows] = await Promise.all([
        window.electronAPI.listBattles() as Promise<Record<string, unknown>[]>,
        window.electronAPI.getBattleTurns(sessionId) as Promise<Record<string, unknown>[]>
      ])
      const found = battles.find((b) => String(b.id) === sessionId)
      if (found) setSession(mapBattleSession(found))
      setTurns(turnRows.map(mapBattleTurn))
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    void loadSession()
  }, [loadSession])

  useEffect(() => {
    if (!userId) return

    void window.electronAPI.subscribeBattles(userId)

    return window.electronAPI.onBattleUpdate((payload) => {
      const row = (payload as { new?: Record<string, unknown> })?.new
      if (!row || !sessionId || String(row.id) !== sessionId) return
      setSession(mapBattleSession(row))
      void window.electronAPI.getBattleTurns(sessionId).then((rows) => {
        setTurns((rows as Record<string, unknown>[]).map(mapBattleTurn))
      })
    })
  }, [userId, sessionId])

  return { session, turns, loading, reload: loadSession }
}
