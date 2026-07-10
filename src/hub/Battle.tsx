import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameSave, PetData } from '../shared/types'
import { tCharacter } from '../i18n/labels'
import { normalizePetSpecies } from '../shared/dinoCharacters'

interface Props {
  save: GameSave
}

interface FriendRow {
  friend_id: string
  profiles?: { username: string }
}

export function Battle({ save }: Props) {
  const { t } = useTranslation()
  const [friends, setFriends] = useState<FriendRow[]>([])
  const [selectedFriend, setSelectedFriend] = useState<string>('')
  const [enemyPet, setEnemyPet] = useState<PetData | null>(null)
  const [log, setLog] = useState<string[]>([])
  const [message, setMessage] = useState('')

  useEffect(() => {
    ;(async () => {
      const session = (await window.electronAPI.getSession()) as { user: { id: string } } | null
      if (!session?.user?.id) return
      setFriends((await window.electronAPI.listFriends(session.user.id)) as FriendRow[])
    })()
  }, [])

  const loadEnemy = async () => {
    if (!selectedFriend) return
    const pet = (await window.electronAPI.getFriendPet(selectedFriend)) as Record<string, unknown> | null
    if (!pet) {
      setMessage(t('pet.noCloudPetForFriend'))
      return
    }
    setEnemyPet({
      id: String(pet.id),
      name: String(pet.name),
      character: normalizePetSpecies(String(pet.species)),
      gender: pet.gender as PetData['gender'],
      stage: pet.stage as PetData['stage'],
      stats: {
        hp: Number(pet.hp ?? 100),
        mood: Number(pet.mood ?? 80),
        devPoints: Number(pet.dev_points ?? 0)
      },
      hatchedAt: pet.hatched_at ? String(pet.hatched_at) : null,
      createdAt: String(pet.created_at),
      animationState: 'idle',
      feedCount: 0
    })
  }

  const fight = async () => {
    if (!save.pet || !enemyPet) return
    const result = (await window.electronAPI.simulateBattle(save.pet, enemyPet)) as {
      log: string[]
      winnerPetId: string
    }
    setLog(result.log)
    setMessage(result.winnerPetId === save.pet.id ? t('battle.modal.titleWin') : t('battle.modal.titleLose'))
  }

  return (
    <div className="card">
      <h2>{t('battle.title')}</h2>
      {message && <p><strong>{message}</strong></p>}
      {!save.pet || save.pet.stage === 'egg' ? (
        <p>{t('pet.needRaiseBeforeBattle')}</p>
      ) : (
        <>
          <p>{t('pet.yourPet')}: {save.pet.name} ({tCharacter(save.pet.character)})</p>
          <div className="form-row">
            <label>{t('battle.friendSelectLabel')}</label>
            <select value={selectedFriend} onChange={(e) => setSelectedFriend(e.target.value)}>
              <option value="">-- {t('chat.selectFriend')} --</option>
              {friends.map((f) => (
                <option key={f.friend_id} value={f.friend_id}>
                  {f.profiles?.username ?? f.friend_id}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button className="secondary" onClick={loadEnemy}>{t('battle.loadFriendPet')}</button>
            <button className="primary" onClick={fight} disabled={!enemyPet}>{t('battle.startBattle')}</button>
          </div>
          {enemyPet && (
            <p>
              {t('pet.opponent')}: {enemyPet.name} · {tCharacter(enemyPet.character)}
            </p>
          )}
          {log.length > 0 && (
            <div className="battle-log">
              {log.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
