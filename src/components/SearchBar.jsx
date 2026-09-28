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
    <div style={{ position:'relative', minWidth: 260 }}>
      <SearchIcon size={18} style={{ position:'absolute', left: 10, top: '50%', transform:'translateY(-50%)', color:'#94a3b8' }} />
      <Input
        type="text"
        placeholder={placeholder}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ height: 44, borderRadius: 12, paddingLeft: 36, fontSize: 15, boxShadow:'inset 0 1px 0 rgba(255,255,255,0.6), 0 1px 0 rgba(0,0,0,0.02)'}}
      />
    </div>
  )
}
