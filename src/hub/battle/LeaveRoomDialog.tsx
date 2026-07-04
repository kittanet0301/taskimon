interface Props {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function LeaveRoomDialog({ open, onConfirm, onCancel }: Props) {
  if (!open) return null

  return (
    <div className="leave-dialog-overlay">
      <div className="leave-dialog card">
        <h3>ออกจากห้อง?</h3>
        <p>ออกจากห้องจะถือว่ายอมแพ้การต่อสู้ (ถ้ากำลังเล่นอยู่) และออกจากห้องรอ</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button type="button" className="secondary" onClick={onCancel}>
            อยู่ต่อ
          </button>
          <button type="button" className="primary" onClick={onConfirm}>
            ออกจากห้อง
          </button>
        </div>
      </div>
    </div>
  )
}
