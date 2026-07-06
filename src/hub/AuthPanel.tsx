import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameSave } from '../shared/types'
import { formatAuthError } from '../shared/formatError'
import { isAtLeast18, isValidBirthDate, toBirthDateIso } from '../shared/birthDate'
import { ClearMyDataPanel } from './ClearMyDataPanel'
import { SystemResetPanel } from './SystemResetPanel'
import { ChangePasswordForm } from './ChangePasswordForm'
import { ChangeUsernameForm } from './ChangeUsernameForm'
import { BirthDateFields } from './BirthDateFields'

interface Props {
  save: GameSave
  onSynced: () => void
  cloudReady: boolean
  onLogout?: () => void
  onDataReset?: () => void
}

export function AuthPanel({ save, onSynced, cloudReady, onLogout, onDataReset }: Props) {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [session, setSession] = useState<{ user: { id: string; email?: string } } | null>(null)
  const [profile, setProfile] = useState<{ username: string; friend_code: string } | null>(null)
  const [message, setMessage] = useState('')
  const [dbMode, setDbMode] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [usernameSuccess, setUsernameSuccess] = useState(false)
  const [birthDay, setBirthDay] = useState(0)
  const [birthMonth, setBirthMonth] = useState(0)
  const [birthYear, setBirthYear] = useState(0)

  const loadSession = async () => {
    const s = (await window.electronAPI.getSession()) as { user: { id: string; email?: string } } | null
    setSession(s)
    setDbMode(await window.electronAPI.isDbMode())
    if (s?.user?.id) {
      const p = (await window.electronAPI.getProfile(s.user.id)) as { username: string; friend_code: string }
      setProfile(p)
      await window.electronAPI.reloadFromCloud()
      onSynced()
    }
  }

  useEffect(() => {
    loadSession()
  }, [])

  const signUp = async () => {
    if (!username.trim()) {
      setMessage(t('auth.needUsername'))
      return
    }
    if (!isValidBirthDate(birthDay, birthMonth, birthYear)) {
      setMessage(t('auth.needBirthDate'))
      return
    }
    if (!isAtLeast18(birthDay, birthMonth, birthYear)) {
      setMessage(t('auth.mustBe18'))
      return
    }
    try {
      const birthDate = toBirthDateIso(birthDay, birthMonth, birthYear)
      const data = (await window.electronAPI.signUp(email, password, username, birthDate)) as {
        session: { user: { id: string } } | null
        user: { id: string } | null
      }
      if (data.session?.user?.id) {
        setMessage(t('auth.signUpSuccessAutoLogin'))
        await loadSession()
        setMessage(t('auth.signInSuccess'))
        return
      }
      setMessage(t('auth.signUpSuccessVerifyEmail'))
    } catch (e) {
      setMessage(formatAuthError(e))
    }
  }

  const signIn = async () => {
    try {
      await window.electronAPI.signIn(email, password)
      await loadSession()
      setMessage(t('auth.signInSuccess'))
    } catch (e) {
      setMessage(formatAuthError(e))
    }
  }

  const signOut = async () => {
    await window.electronAPI.signOut()
    setSession(null)
    setProfile(null)
    setDbMode(false)
    onLogout?.()
  }

  const forceSave = async () => {
    try {
      await window.electronAPI.forceCloudSave()
      setMessage(t('common.saveNow'))
    } catch (e) {
      setMessage(String(e))
    }
  }

  const handleMyDataCleared = () => {
    onSynced()
    onDataReset?.()
  }

  if (!cloudReady) {
    return (
      <div className="card">
        <h2>{t('auth.panelTitle')}</h2>
        <p className="notice" style={{ margin: 0 }}>
          {t('auth.supabaseNotConfigured')}
        </p>
      </div>
    )
  }

  return (
    <div className="card">
      <h2>{t('auth.panelTitle')}</h2>
      <p>
        {t('auth.statusLabel')}:{' '}
        <strong style={{ color: dbMode ? '#16a34a' : '#ca8a04' }}>
          {dbMode ? t('auth.dbConnected') : t('auth.dbConnecting')}
        </strong>
      </p>
      {message && <p>{message}</p>}
      {session ? (
        <>
          <p>{t('auth.loggedInAs', { email: session.user.email })}</p>
          {profile && (
            <p>
              {t('auth.profileSummary', { username: profile.username, friendCode: profile.friend_code })}
            </p>
          )}
          <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>
            {t('auth.petSummary', {
              petName: save.pet?.name ?? t('common.none'),
              itemCount: save.inventory.length,
              missionCount: save.missions.length
            })}
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="primary" onClick={forceSave}>{t('auth.saveDbNow')}</button>
            <button className="secondary" onClick={signOut}>{t('common.logout')}</button>
          </div>

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '1rem' }}>{t('auth.changeUsername')}</h3>
            {usernameSuccess ? (
              <p style={{ color: '#16a34a', margin: 0 }}>{t('auth.usernameUpdated')}</p>
            ) : (
              profile && (
                <ChangeUsernameForm
                  initialUsername={profile.username}
                  submitLabel={t('auth.saveUsername')}
                  onSubmit={async (nextUsername) => {
                    if (!session?.user?.id) return
                    const updated = (await window.electronAPI.updateProfile(session.user.id, {
                      username: nextUsername
                    })) as { username: string; friend_code: string }
                    setProfile(updated)
                    setUsernameSuccess(true)
                  }}
                />
              )
            )}
          </div>

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '1rem' }}>{t('auth.changePassword')}</h3>
            {passwordSuccess ? (
              <p style={{ color: '#16a34a', margin: 0 }}>{t('auth.newPasswordSaved')}</p>
            ) : (
              <ChangePasswordForm
                submitLabel={t('auth.savePassword')}
                onSubmit={async (password) => {
                  await window.electronAPI.updatePassword(password)
                  setPasswordSuccess(true)
                }}
              />
            )}
          </div>

          <ClearMyDataPanel username={profile?.username} onCleared={handleMyDataCleared} />
          <SystemResetPanel onReset={handleMyDataCleared} />
        </>
      ) : (
        <>
          <div className="form-row">
            <label>{t('auth.emailLabel')}</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="form-row">
            <label>{t('auth.passwordLabel')}</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="form-row">
            <label>{t('auth.usernameSignUpLabel')}</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <BirthDateFields
            day={birthDay}
            month={birthMonth}
            year={birthYear}
            onChange={({ day, month, year }) => {
              setBirthDay(day)
              setBirthMonth(month)
              setBirthYear(year)
            }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="primary" onClick={signIn}>{t('common.login')}</button>
            <button className="secondary" onClick={signUp}>{t('common.signUp')}</button>
          </div>
        </>
      )}
    </div>
  )
}
