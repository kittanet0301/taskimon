import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameSave, Stage } from '../shared/types'
import { normalizePetSpecies } from '../shared/dinoCharacters'
import { tCharacter, tStage } from '../i18n/labels'
import { SendGiftModal } from './SendGiftModal'

interface Props {
  userId: string | null
  save?: GameSave | null
  onUpdated?: () => void | Promise<void>
}

export function UserProfile({ userId, save, onUpdated }: Props) {
  const { t } = useTranslation()
  const [profile, setProfile] = useState<{ username: string; friend_code: string } | null>(null)
  const [pet, setPet] = useState<Record<string, unknown> | null>(null)
  const [selfId, setSelfId] = useState<string | null>(null)
  const [showGift, setShowGift] = useState(false)

  useEffect(() => {
    ;(async () => {
      const session = (await window.electronAPI.getSession()) as { user: { id: string } } | null
      const target = userId ?? session?.user?.id ?? null
      setSelfId(session?.user?.id ?? null)
      if (!target) return
      setProfile((await window.electronAPI.getProfile(target)) as { username: string; friend_code: string })
      setPet((await window.electronAPI.getFriendPet(target)) as Record<string, unknown> | null)
    })()
  }, [userId])

  if (!profile) {
    return (
      <div className="card">
        <h2>{t('profile.title')}</h2>
        <p>{t('profile.loginToView')}</p>
      </div>
    )
  }

  return (
    <div className="card">
      <h2>{t('profile.titleWithName', { username: profile.username })}</h2>
      <p>{t('profile.friendCode')}: <strong>{profile.friend_code}</strong></p>
      {userId && userId !== selfId && (
        <div className="profile-friend-actions">
          <p style={{ color: '#6b7280', margin: 0 }}>{t('profile.viewingFriendReadonly')}</p>
          {save && (
            <button type="button" className="dash-hud-action dash-hud-action--inline" onClick={() => setShowGift(true)}>
              {t('gift.sendGift')}
            </button>
          )}
        </div>
      )}
      {pet ? (
        <div style={{ marginTop: 16 }}>
          <h3>{t('profile.petTitle')}</h3>
          <p>
            {String(pet.name)} · {tCharacter(normalizePetSpecies(String(pet.species)))} ·{' '}
            {tStage(String(pet.stage) as Stage)}
          </p>
          <p>
            {t('profile.statsLine', {
              hp: String(pet.hp),
              mood: String(pet.mood),
              devPoints: String(pet.dev_points)
            })}
          </p>
        </div>
      ) : (
        <p>{t('profile.noCloudPet')}</p>
      )}

      {showGift && save && userId && (
        <SendGiftModal
          save={save}
          recipientId={userId}
          recipientName={profile.username}
          onClose={() => setShowGift(false)}
          onSent={async () => {
            await onUpdated?.()
          }}
        />
      )}
    </div>
  )
}
