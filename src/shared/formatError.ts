export function formatApiError(error: unknown): string {
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
    return 'ยังไม่ได้ยืนยันอีเมล — เปิดอีเมลแล้วคลิกลิงก์ยืนยัน หรือปิด Confirm email ใน Supabase'
  }
  if (text.includes('Invalid login credentials')) {
    return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
  }
  if (text.includes('User already registered')) {
    return 'อีเมลนี้สมัครแล้ว — ลองเข้าสู่ระบบแทน'
  }
  return text.replace(/^Error:\s*Error invoking remote method '[^']+':\s*(AuthApiError:\s*)?/i, '')
}
