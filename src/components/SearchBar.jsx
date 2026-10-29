import { useState, useEffect } from 'react'
import { Input } from './ui/input.jsx'
import { Search as SearchIcon } from 'lucide-react'

export default function SearchBar({ placeholder = 'Search...', onChange }) {
  const [q, setQ] = useState('')

  useEffect(() => {
    const id = setTimeout(() => onChange?.(q), 200)
    return () => clearTimeout(id)
  }, [q, onChange])

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 320 }}>
      <SearchIcon size={17} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
      <Input
        type="text"
        placeholder={placeholder}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{
          height: 42,
          borderRadius: 12,
          paddingLeft: 42,
          paddingRight: 14,
          fontSize: 14,
          background: 'var(--input-bg)',
          borderColor: 'var(--border)',
          color: 'var(--text)',
        }}
      />
    </div>
  )
}
