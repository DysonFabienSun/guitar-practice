import assert from 'node:assert/strict'
import { createModuleLoader } from './load-ts.mjs'
const load = createModuleLoader()
const { readPreferences, savePreferences, defaultPreferences, SETTINGS_KEY } = await import(load('src/settings.ts'))
const { getPitch, validateTuning } = await import(load('src/pitch.ts'))
const { PAGES, pageFromHash } = await import(load('src/routes.ts'))
const storage = new Map()
globalThis.window = { localStorage: { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value) } }
const defaults = defaultPreferences()
for (const value of [undefined, '{broken', 'null', '[]', '{"version":0}', '{"version":2}', '{"version":1,"soundEnabled":"false","showNotes":null}']) {
  storage.set(SETTINGS_KEY, value)
  assert.deepEqual(readPreferences(), defaults)
}
for (const tuningId of ['standard', 'drop-d', 'half-step', 'facgce']) {
  storage.set(SETTINGS_KEY, JSON.stringify({ version: 1, tuningId, soundEnabled: false, showNotes: false }))
  const prefs = readPreferences()
  assert.equal(prefs.tuningId, tuningId)
  assert.equal(prefs.soundEnabled, false)
  assert.equal(prefs.showNotes, false)
  assert.equal(savePreferences(prefs), true)
  assert.deepEqual(readPreferences(), prefs)
}
const inputs = defaults.tuning.map((note) => ({ noteName: note.noteName, octave: String(note.octave) }))
inputs[5] = { noteName: 'F♯', octave: '2' }
const valid = validateTuning(inputs)
assert.equal(valid.errors.length, 0)
const custom = { ...defaults, tuning: valid.tuning, tuningId: 'custom', tuningName: '自定义调弦' }
assert.equal(savePreferences(custom), true)
assert.deepEqual(readPreferences(), custom)
for (const [fret, label] of [[0, 'F♯2'], [12, 'F♯3'], [24, 'F♯4']]) assert.equal(getPitch(6, fret, readPreferences().tuning).label, label)
for (const openStrings of [null, [], [null, ...inputs.slice(1)], [{ noteName: 'H', octave: '2' }, ...inputs.slice(1)], [{ noteName: 'C', octave: '99' }, ...inputs.slice(1)]]) {
  storage.set(SETTINGS_KEY, JSON.stringify({ version: 1, tuningId: 'custom', openStrings, soundEnabled: false }))
  assert.equal(readPreferences().tuningId, 'standard')
  assert.equal(readPreferences().soundEnabled, false)
}
window.localStorage = { getItem() { throw new Error('blocked') }, setItem() { throw new Error('blocked') } }
assert.deepEqual(readPreferences(), defaults)
assert.equal(savePreferences(defaults), false)
assert.equal(PAGES.length, 7)
assert.deepEqual(PAGES.map(p=>p.id),['fretboard','scales','chords','jam','transcription','settings','about'])
for (const page of PAGES) assert.equal(pageFromHash(`#/${page.id}`).id, page.id)
for (const hash of ['', '#/', '#/unknown', '#/settings/extra']) assert.equal(pageFromHash(hash).id, 'fretboard')
console.log('通过：七个 hash 地址、无效地址回退；四预设与自定义保存；无效字段、损坏 JSON、旧版本和存储异常回退')
delete globalThis.window
