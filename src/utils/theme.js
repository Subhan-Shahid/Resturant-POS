// Theme management utilities

const THEME_KEY = 'restaurant-pos-theme'

export function getTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'light' || saved === 'dark') return saved
    // Check system preference if no manual setting
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light'
    }
  } catch {}
  return 'dark'
}

export function setTheme(theme) {
  const target = theme === 'light' ? 'light' : 'dark'
  try {
    localStorage.setItem(THEME_KEY, target)
  } catch {}
  applyThemeToDom(target)
  window.dispatchEvent(new CustomEvent('theme:changed', { detail: target }))
  return target
}

export function toggleTheme() {
  const current = getTheme()
  const next = current === 'light' ? 'dark' : 'light'
  return setTheme(next)
}

export function applyThemeToDom(theme) {
  try {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.classList.remove('theme-light', 'theme-dark')
    document.documentElement.classList.add(`theme-${theme}`)
    if (document.body) {
      document.body.classList.remove('theme-light', 'theme-dark')
      document.body.classList.add(`theme-${theme}`)
    }
  } catch {}
}

export function initTheme() {
  const t = getTheme()
  applyThemeToDom(t)
  return t
}

