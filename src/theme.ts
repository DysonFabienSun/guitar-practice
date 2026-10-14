export type ThemePreference = 'system' | 'light' | 'dark'
export const THEME_STORAGE_KEY = 'saguadlib-theme'

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark'
}

export function readThemePreference(): ThemePreference {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY)
    return isThemePreference(value) ? value : 'system'
  } catch {
    return 'system'
  }
}

export function applyTheme(preference: ThemePreference) {
  const systemDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  document.documentElement.dataset.theme = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference
  document.documentElement.dataset.themePreference = preference
}

export function saveThemePreference(preference: ThemePreference) {
  try { window.localStorage.setItem(THEME_STORAGE_KEY, preference) }
  catch { /* 本地存储不可用时，本次页面仍能切换主题。 */ }
  applyTheme(preference)
}

export function watchSystemTheme(preference: ThemePreference) {
  if (preference !== 'system' || !window.matchMedia) return () => {}
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const update = () => applyTheme(preference)
  media.addEventListener('change', update)
  return () => media.removeEventListener('change', update)
}
