import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../hooks/useTheme.js'

export default function ThemeToggle({ variant = 'button', className = '', showLabel = false }) {
  const { theme, toggleTheme, isDark } = useTheme()

  if (variant === 'segmented') {
    return (
      <div 
        className={`theme-segmented ${className}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          background: 'var(--segmented-bg)',
          borderRadius: 999,
          padding: 3,
          border: '1px solid var(--border)',
          gap: 2
        }}
      >
        <button
          type="button"
          onClick={() => isDark && toggleTheme()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            borderRadius: 999,
            border: 'none',
            background: !isDark ? 'var(--primary-gradient)' : 'transparent',
            color: !isDark ? '#fff' : 'var(--muted)',
            fontWeight: 600,
            fontSize: 12,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: !isDark ? 'var(--primary-glow)' : 'none'
          }}
        >
          <Sun size={14} />
          <span>Light</span>
        </button>
        <button
          type="button"
          onClick={() => !isDark && toggleTheme()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            borderRadius: 999,
            border: 'none',
            background: isDark ? 'var(--primary-gradient)' : 'transparent',
            color: isDark ? '#fff' : 'var(--muted)',
            fontWeight: 600,
            fontSize: 12,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: isDark ? 'var(--primary-glow)' : 'none'
          }}
        >
          <Moon size={14} />
          <span>Dark</span>
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      className={`theme-toggle-btn ${className}`}
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 38,
        minWidth: 38,
        padding: showLabel ? '0 12px' : 0,
        borderRadius: 999,
        background: 'var(--badge-bg)',
        border: '1px solid var(--border)',
        color: isDark ? '#f59e0b' : '#6366f1',
        cursor: 'pointer',
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        backdropFilter: 'blur(8px)',
        flexShrink: 0,
      }}
    >
      {isDark ? (
        <Sun size={18} style={{ transition: 'transform 0.3s ease', transform: 'rotate(0deg)' }} />
      ) : (
        <Moon size={18} style={{ transition: 'transform 0.3s ease', transform: 'rotate(0deg)' }} />
      )}
      {showLabel && (
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </span>
      )}
    </button>
  )
}

