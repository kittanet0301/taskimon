import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  onContinue: () => void
}

export function TitleScreen({ onContinue }: Props) {
  const { t } = useTranslation()

  useEffect(() => {
    const handleKey = () => onContinue()
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onContinue])

  return (
    <div className="title-screen" onClick={onContinue} role="button" tabIndex={0}>
      <div className="title-screen-bg" aria-hidden />
      <div className="title-screen-content">
        <img
          className="title-screen-logo"
          src="/ui/taskino-logo.png"
          alt="TASKINO"
          draggable={false}
        />
        <p className="title-screen-prompt">{t('title.pressAnyKey')}</p>
      </div>
    </div>
  )
}
