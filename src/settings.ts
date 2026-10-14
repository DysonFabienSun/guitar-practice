import { STANDARD_TUNING, TUNING_PRESETS, validateTuning } from './pitch'
import type { Tuning } from './pitch'

export const SETTINGS_KEY = 'saguadlib-settings'
export type Preferences = {
  soundEnabled: boolean
  showNotes: boolean
  tuning: Tuning
  tuningId: string
  tuningName: string
}
export function defaultPreferences(): Preferences {
  return { soundEnabled: true, showNotes: true, tuning: STANDARD_TUNING, tuningId: 'standard', tuningName: '标准 EADGBE' }
}

/** 只接受已知版本与有效字段；不信任存储中的 MIDI 或任意调弦名称。 */
export function readPreferences(): Preferences {
  const defaults = defaultPreferences()
  try {
    const saved = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? 'null')
    if (!saved || saved.version !== 1) return defaults
    const result = {
      ...defaults,
      soundEnabled: typeof saved.soundEnabled === 'boolean' ? saved.soundEnabled : defaults.soundEnabled,
      showNotes: typeof saved.showNotes === 'boolean' ? saved.showNotes : defaults.showNotes,
    }
    const preset = TUNING_PRESETS.find((item) => item.id === saved.tuningId)
    if (preset) return { ...result, tuning: preset.tuning, tuningId: preset.id, tuningName: preset.label }
    if (saved.tuningId === 'custom' && Array.isArray(saved.openStrings)
      && saved.openStrings.length === 6
      && saved.openStrings.every((item: unknown) => typeof item === 'object' && item !== null
        && 'noteName' in item && typeof item.noteName === 'string'
        && 'octave' in item && typeof item.octave === 'string')) {
      const validation = validateTuning(saved.openStrings)
      if (!validation.errors.length) return { ...result, tuning: validation.tuning, tuningId: 'custom', tuningName: '自定义调弦' }
    }
    return result
  } catch {
    return defaults
  }
}

export function savePreferences(preferences: Preferences) {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      version: 1,
      soundEnabled: preferences.soundEnabled,
      showNotes: preferences.showNotes,
      tuningId: preferences.tuningId,
      openStrings: preferences.tuning.map((open) => ({ noteName: open.noteName, octave: String(open.octave) })),
    }))
    return true
  } catch {
    return false
  }
}
