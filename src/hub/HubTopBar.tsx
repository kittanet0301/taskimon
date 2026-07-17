import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  gems: number
  clicks: number
  keystrokes: number
  activityScore: number
  syncing: boolean
  children?: ReactNode
}

const STAT_ICON_SRC = {
  gems: '/ui/hud-stat-gems.png',
  clicks: '/ui/hud-stat-clicks.png',
  typing: '/ui/hud-stat-typing.png',
  activity: '/ui/hud-stat-activity.png'
} as const

export function HubTopBar({ gems, clicks, keystrokes, activityScore, syncing, children }: Props) {
  const { t } = useTranslation()

  return (
    <div className="hub-topbar" aria-label={t('home.todayActivity')}>
      <div className="hub-topbar-stats">
        <div className="dash-hud-counter dash-hud-counter--gem">
          <img className="dash-hud-counter-icon" src={STAT_ICON_SRC.gems} alt="" draggable={false} />
          <span>{t('home.gems')}</span>
          <strong>{gems.toLocaleString()}</strong>
        </div>
        <div className="dash-hud-counter">
          <img className="dash-hud-counter-icon" src={STAT_ICON_SRC.clicks} alt="" draggable={false} />
          <span>{t('home.clicks')}</span>
          <strong>{clicks.toLocaleString()}</strong>
        </div>
        <div className="dash-hud-counter">
          <img className="dash-hud-counter-icon" src={STAT_ICON_SRC.typing} alt="" draggable={false} />
          <span>{t('home.typing')}</span>
          <strong>{keystrokes.toLocaleString()}</strong>
        </div>
        <div className="dash-hud-counter">
          <img className="dash-hud-counter-icon" src={STAT_ICON_SRC.activity} alt="" draggable={false} />
          <span>{t('home.activityScore')}</span>
          <strong>{activityScore.toLocaleString()}</strong>
        </div>
      </div>
      {syncing && <div className="hub-topbar-sync">{t('app.syncing')}</div>}
      <div className="hub-topbar-extra">{children}</div>
    </div>
  )
}
