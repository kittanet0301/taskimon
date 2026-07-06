import { useTranslation } from 'react-i18next'
import type { Gender } from '../shared/types'

const GENDER_COLORS: Record<Gender, string> = {
  male: '#3b82f6',
  female: '#ec4899'
}

interface Props {
  gender: Gender
}

export function GenderTag({ gender }: Props) {
  const { t } = useTranslation()
  const label = gender === 'male' ? t('pet.maleShort') : t('pet.femaleShort')

  return (
    <span className="tag gender-tag" style={{ background: GENDER_COLORS[gender], color: '#fff' }}>
      {label}
    </span>
  )
}
