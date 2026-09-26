import { AlertCircle, RefreshCw } from 'lucide-react'

export default function ErrorState({ error, onRetry }) {
  return (
    <div className="card error-state">
      <AlertCircle size={30} color="var(--danger)" />
      <div style={{ fontWeight: 600 }}>เชื่อมต่อ Bot API ไม่ได้</div>
      <div className="msg">
        {error?.message || 'ไม่ทราบสาเหตุ'}
        <br />
        ตรวจสอบว่าบอทรันอยู่ และตั้งค่า <code>VITE_API_URL</code> ในไฟล์ .env ของ dashboard
      </div>
      {onRetry && (
        <button className="btn btn-primary" onClick={onRetry}>
          <RefreshCw size={14} /> ลองอีกครั้ง
        </button>
      )}
    </div>
  )
}
