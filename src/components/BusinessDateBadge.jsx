import { useEffect, useState } from 'react'
import { getActiveBusinessDateId } from '../utils/storage.js'

export default function BusinessDateBadge(){
  const [bizDate, setBizDate] = useState(() => {
    try { return getActiveBusinessDateId() } catch { return '' }
  })

  useEffect(() => {
    const refresh = () => {
      try { setBizDate(getActiveBusinessDateId()) } catch { setBizDate('') }
    }
    refresh()
    window.addEventListener('day:status-changed', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('day:status-changed', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  return (
    <div className="biz-date-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--badge-bg)', border: '1px solid var(--border)', borderRadius: 999, padding: '5px 12px', backdropFilter: 'blur(10px)', maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden' }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981', display: 'inline-block', flexShrink: 0 }}></span>
      <span style={{ color: 'var(--muted)', fontSize: 'clamp(10px, 2.5vw, 12px)', fontWeight: 500 }}>Business Date:</span>
      <span style={{ color: 'var(--text)', fontSize: 'clamp(11px, 2.8vw, 13px)', fontWeight: 700, letterSpacing: '0.02em' }}>{bizDate || 'Not Set'}</span>
    </div>
  )
}
