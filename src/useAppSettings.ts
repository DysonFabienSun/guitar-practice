import { useEffect, useState } from 'react'
import { defaultPreferences, readPreferences, savePreferences } from './settings'
import type { Preferences } from './settings'
import type { Tuning } from './pitch'
import { applyTheme, readThemePreference, saveThemePreference, watchSystemTheme } from './theme'
import type { ThemePreference } from './theme'

/** 全局偏好由应用根组件持有；练习答案、选中位置不进入存储。 */
export function useAppSettings() {
  const [preferences, setPreferences] = useState(readPreferences)
  const [themePreference, setThemePreference] = useState<ThemePreference>(readThemePreference)
  const [answerRevision, setAnswerRevision] = useState(0)
  const [storageMessage, setStorageMessage] = useState('')

  useEffect(() => {
    applyTheme(themePreference)
    return watchSystemTheme(themePreference)
  }, [themePreference])

  function commit(next: Preferences) {
    setPreferences(next)
    setStorageMessage(savePreferences(next) ? '' : '当前设置已应用，但浏览器未允许保存；刷新后可能恢复默认。')
  }
  function chooseTheme(value: ThemePreference) {
    saveThemePreference(value)
    setThemePreference(value)
  }
  function setShowNotes(value: boolean) {
    commit({ ...preferences, showNotes: value })
    setAnswerRevision((revision) => revision + 1)
  }
  function setSoundEnabled(value: boolean) {
    commit({ ...preferences, soundEnabled: value })
  }
  function applyTuning(tuning: Tuning, tuningId: string, tuningName: string) {
    commit({ ...preferences, tuning, tuningId, tuningName })
    setAnswerRevision((revision) => revision + 1)
  }
  function resetSettings() {
    commit(defaultPreferences())
    chooseTheme('system')
    setAnswerRevision((revision) => revision + 1)
  }
  return { preferences, themePreference, answerRevision, storageMessage, chooseTheme, setShowNotes, setSoundEnabled, applyTuning, resetSettings }
}
export type SharedSettings = ReturnType<typeof useAppSettings>
