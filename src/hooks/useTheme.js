import { useEffect, useState } from 'react'
import { getTheme, setTheme as setGlobalTheme, toggleTheme as toggleGlobalTheme } from '../utils/theme.js'

export function useTheme() {
  const [theme, setLocalTheme] = useState(() => getTheme())

  useEffect(() => {
    const onThemeChange = (e) => {
      if (e.detail) {
        setLocalTheme(e.detail)
      } else {
        setLocalTheme(getTheme())
      }
    }

    const onStorage = (e) => {
      if (e.key === 'restaurant-pos-theme') {
        setLocalTheme(getTheme())
      }
    }

    window.addEventListener('theme:changed', onThemeChange)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('theme:changed', onThemeChange)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const toggle = () => {
    const next = toggleGlobalTheme()
    setLocalTheme(next)
    return next
  }

  const set = (t) => {
    const next = setGlobalTheme(t)
    setLocalTheme(next)
    return next
  }

  return {
    theme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    toggleTheme: toggle,
    setTheme: set,
  }
}

