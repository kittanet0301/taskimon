import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Element, Species, Stage } from '../shared/types'
import { tElement, tSpecies, tStage } from '../i18n/labels'

interface Props {
  userId: string | null
}

export function UserProfile({ userId }: Props) {
  const { t } = useTranslation()
  const [profile, setProfile] = useState<{ username: string; friend_code: string } | null>(null)
  const [pet, setPet] = useState<Record<string, unknown> | null>(null)
  const [selfId, setSelfId] = useState<string | null>(null)

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
      {userId && userId !== selfId && <p style={{ color: '#6b7280' }}>{t('profile.viewingFriendReadonly')}</p>}
      {pet ? (
        <div style={{ marginTop: 16 }}>
          <h3>{t('profile.petTitle')}</h3>
          <p>
            {String(pet.name)} · {tSpecies(String(pet.species) as Species)} ·{' '}
            {tElement(String(pet.element) as Element)} · {tStage(String(pet.stage) as Stage)}
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
    </div>
  )
}
