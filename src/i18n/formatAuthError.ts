import i18n from './index'

function formatApiError(error: unknown): string {
  if (error instanceof Error) {
    return error.message.replace(/^Error invoking remote method '[^']+':\s*/i, '')
  }
  if (typeof error === 'object' && error !== null) {
    const obj = error as Record<string, unknown>
    if (typeof obj.message === 'string') return obj.message
    if (typeof obj.error_description === 'string') return obj.error_description
  }
  return String(error)
}

export function formatAuthError(error: unknown): string {
  const text = formatApiError(error)
  if (text.includes('Email not confirmed')) {
    return i18n.t('errors.emailNotConfirmed')
  }
  if (text.includes('Invalid login credentials')) {
    return i18n.t('errors.invalidLoginCredentials')
  }
  if (text.includes('User already registered')) {
    return i18n.t('errors.userAlreadyRegistered')
  }
  if (text.includes('Password should be at least')) {
    return i18n.t('errors.passwordTooShort')
  }
  if (text.includes('New password should be different')) {
    return i18n.t('errors.newPasswordSameAsOld')
  }
  if (text.includes('For security purposes, you can only request this after')) {
    return i18n.t('errors.rateLimited')
  }
  if (
    text.includes('over_email_send_rate_limit') ||
    text.includes('over_request_rate_limit') ||
    text.includes('Email rate limit exceeded')
  ) {
    return i18n.t('errors.emailRateLimited')
  }
  if (text.includes('บัญชีนี้ยังไม่มีวันเกิด') || text.toLowerCase().includes('no birth date')) {
    return i18n.t('errors.noBirthDateOnAccount')
  }
  if (
    text.includes('profiles_username_key') ||
    text.includes('duplicate key') ||
    text.toLowerCase().includes('username') && text.toLowerCase().includes('unique')
  ) {
    return i18n.t('errors.usernameTaken')
  }
  return text.replace(/^Error:\s*Error invoking remote method '[^']+':\s*(AuthApiError:\s*)?/i, '')
}
