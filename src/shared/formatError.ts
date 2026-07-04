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
  if (text.includes('Password should be at least')) {
    return 'รหัสผ่านต้องมีอย่างน้อย 6 ตัว'
  }
  if (text.includes('New password should be different')) {
    return 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม'
  }
  if (text.includes('For security purposes, you can only request this after')) {
    return 'ส่งลิงก์บ่อยเกินไป — รอสักครู่แล้วลองใหม่'
  }
  return text.replace(/^Error:\s*Error invoking remote method '[^']+':\s*(AuthApiError:\s*)?/i, '')
}
