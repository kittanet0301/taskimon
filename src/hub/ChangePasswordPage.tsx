import { useState } from 'react'
import { AuthShell } from './LoginGate'
import { ChangePasswordForm } from './ChangePasswordForm'

interface Props {
  onComplete: () => void
}

export function ChangePasswordPage({ onComplete }: Props) {
  const [success, setSuccess] = useState(false)

  if (success) {
    return (
      <AuthShell
        tagline="เปลี่ยนรหัสผ่านสำเร็จ"
        message="คุณสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้แล้ว"
        footer={null}
      >
        <button type="button" className="primary cover-btn" onClick={onComplete}>
          เข้าสู่ระบบ
        </button>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      tagline="ตั้งรหัสผ่านใหม่"
      message=""
      footer={null}
    >
      <ChangePasswordForm
        submitLabel="บันทึกรหัสผ่านใหม่"
        onSubmit={async (password) => {
          await window.electronAPI.updatePassword(password)
          setSuccess(true)
        }}
      />
    </AuthShell>
  )
}
