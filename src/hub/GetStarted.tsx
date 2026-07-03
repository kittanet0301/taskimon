interface Props {
  onStart: () => void
}

export function GetStarted({ onStart }: Props) {
  return (
    <div className="cover-screen">
      <div className="cover-card">
        <div className="cover-logo">🥚</div>
        <h1 className="cover-title">TASKIMON</h1>
        <p className="cover-tagline">
          เปลี่ยนกิจกรรมในเบราว์เซอร์
          <br />
          เป็นพลังเลี้ยงสัตว์ของคุณ
        </p>
        <ul className="cover-features">
          <li>คลิก & พิมพ์ → คะแนนกิจกรรม</li>
          <li>เลี้ยงสัตว์ → วิวัฒนาการ Egg → Teen → Adult</li>
          <li>ภารกิจรายวัน → รับรางวัล</li>
        </ul>
        <button className="primary cover-btn" onClick={onStart}>
          เริ่มเล่น
        </button>
      </div>
    </div>
  )
}
