import { type ReactNode } from 'react'
import { LanguageSwitcher } from './LanguageSwitcher'

interface Props {
  tagline: ReactNode
  message?: string
  children: ReactNode
  footer?: ReactNode
  showLangSwitcher?: boolean
  centered?: boolean
}

export function PixelCoverShell({
  tagline,
  message,
  children,
  footer,
  showLangSwitcher = true,
  centered = false
}: Props) {
  return (
    <div className="cover-screen pixel-cover">
      <div className="pixel-cover-bg" aria-hidden />
      <div className="pixel-cover-overlay" aria-hidden />

      <div className={`cover-card pixel-card${centered ? '' : ' login-card'}`}>
        <div className="pixel-card-header">
          {showLangSwitcher && (
            <div className="pixel-card-lang">
              <LanguageSwitcher compact variant="pixel" />
            </div>
          )}
          <img className="pixel-logo" src="/ui/taskino-logo.png" alt="TASKINO" draggable={false} />
        </div>
        <p className="cover-tagline pixel-body">{tagline}</p>

        {message && <p className="login-message pixel-message">{message}</p>}

        {children}

        {footer && <div className="auth-switch pixel-body">{footer}</div>}
      </div>
    </div>
  )
}
