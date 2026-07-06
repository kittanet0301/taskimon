import { type ReactNode } from 'react'
import { AuthEggSprite } from '../components/AuthEggSprite'
import { LanguageSwitcher } from './LanguageSwitcher'

interface Props {
  title: string
  tagline: ReactNode
  message?: string
  children: ReactNode
  footer?: ReactNode
  showLangSwitcher?: boolean
  centered?: boolean
}

export function PixelCoverShell({
  title,
  tagline,
  message,
  children,
  footer,
  showLangSwitcher = true,
  centered = false
}: Props) {
  return (
    <div className="cover-screen pixel-cover">
      <div className="pixel-scene" aria-hidden>
        <div className="pixel-cloud pixel-cloud-1" />
        <div className="pixel-cloud pixel-cloud-2" />
        <div className="pixel-cloud pixel-cloud-3" />
        <div className="pixel-cloud pixel-cloud-4" />
        <div className="pixel-grass" />
      </div>

      <div className={`cover-card pixel-card${centered ? '' : ' login-card'}`}>
        {showLangSwitcher && (
          <div className="pixel-card-lang">
            <LanguageSwitcher compact variant="pixel" />
          </div>
        )}
        <div className="pixel-card-egg">
          <AuthEggSprite />
        </div>
        <h1 className="cover-title pixel-title">{title}</h1>
        <p className="cover-tagline pixel-body">{tagline}</p>

        {message && <p className="login-message pixel-message">{message}</p>}

        {children}

        {footer && <div className="auth-switch pixel-body">{footer}</div>}
      </div>
    </div>
  )
}
