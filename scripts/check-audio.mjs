import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'

async function loadModule(path) {
  const compiled = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext },
  }).outputText
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
}
const { getPitch: calculatePitch, STANDARD_TUNING, TUNING_PRESETS, validateTuning, parseOpenString } = await loadModule('src/pitch.ts')
const getPitch = (string, fret, tuning = STANDARD_TUNING) => calculatePitch(string, fret, tuning)
const { midiToFrequency, createPluckSamples, PluckPlayer } = await loadModule('src/audio.ts')
for (const [string, fret, label, frequency] of [
  [6, 0, 'E2', 82.4069], [1, 0, 'E4', 329.6276],
  [6, 12, 'E3', 164.8138], [5, 3, 'C3', 130.8128], [2, 1, 'C4', 261.6256],
]) {
  const pitch = getPitch(string, fret)
  assert.equal(pitch.label, label)
  assert.ok(Math.abs(midiToFrequency(pitch.midi) - frequency) < 0.001)
}
for (const sampleRate of [44100, 48000]) {
  for (let string = 1; string <= 6; string++) {
    for (let fret = 0; fret <= 24; fret++) {
      const samples = createPluckSamples(midiToFrequency(getPitch(string, fret).midi), sampleRate)
      assert.equal(samples.length, Math.ceil(sampleRate * 0.9))
      assert.equal(samples[0], 0)
      assert.ok(samples.every((value) => Number.isFinite(value) && Math.abs(value) < 0.18))
      assert.ok(Math.abs(samples.at(-1)) < 0.00001)
      const rms = (start, end) => Math.sqrt(samples.slice(start * sampleRate, end * sampleRate)
        .reduce((sum, value) => sum + value * value, 0) / ((end - start) * sampleRate))
      assert.ok(rms(0.6, 0.8) < rms(0.02, 0.1) / 10)
    }
  }
}
console.log('通过：五个音高、标准调弦全部 150 个位置在两种采样率下的幅度与衰减')

const cases = [
  ['standard', 6, 0, 'E2', 40], ['standard', 6, 12, 'E3', 52],
  ['standard', 6, 24, 'E4', 64], ['standard', 1, 24, 'E6', 88],
  ['drop-d', 6, 0, 'D2', 38], ['drop-d', 6, 2, 'E2', 40], ['drop-d', 6, 24, 'D4', 62],
  ['half-step', 6, 0, 'E♭2', 39], ['half-step', 1, 0, 'E♭4', 63],
  ['facgce', 3, 0, 'G3', 55], ['facgce', 2, 0, 'C4', 60],
]
const customInputs = STANDARD_TUNING.map((open) => ({ noteName: open.noteName, octave: String(open.octave) }))
customInputs[5] = { noteName: 'F♯', octave: '2' }
const custom = validateTuning(customInputs)
assert.deepEqual(custom.errors, [])
const pitchCases = cases.map(([id, string, fret, label, midi]) => ({ tuning: TUNING_PRESETS.find((preset) => preset.id === id).tuning, string, fret, label, midi }))
for (const [fret, label, midi] of [[0, 'F♯2', 42], [12, 'F♯3', 54], [24, 'F♯4', 66]]) {
  pitchCases.push({ tuning: custom.tuning, string: 6, fret, label, midi })
}
for (const tuning of [...TUNING_PRESETS.map((preset) => preset.tuning), custom.tuning]) {
  for (let string = 1; string <= 6; string++) {
    for (let fret = 0; fret <= 24; fret++) assert.equal(getPitch(string, fret, tuning).midi, tuning[string - 1].midi + fret)
  }
}
assert.equal(parseOpenString('Eb', '2').midi, 39)
assert.equal(parseOpenString('D#', '2').midi, 39)
for (const octave of ['', '-1', '7', '2.5', 'abc']) {
  const invalid = customInputs.map((input, index) => index === 5 ? { ...input, octave } : input)
  assert.match(validateTuning(invalid).errors[0], /第 6 弦：八度/)
}
assert.match(validateTuning([{ noteName: 'H', octave: '2' }, ...customInputs.slice(1)]).errors[0], /第 1 弦：音名/)
assert.throws(() => getPitch(1, 25), RangeError)
console.log('通过：四个预设与自定义全部 750 个位置、升降音及具体输入错误')

const contexts = []
class MockContext {
  state = 'running'
  currentTime = 0
  sampleRate = 44100
  destination = {}
  sources = []
  constructor() { contexts.push(this) }
  createBuffer(_, length) {
    return { copyToChannel(samples) { assert.equal(samples.length, length); this.samples = samples } }
  }
  createGain() {
    return {
      gain: { setValueAtTime() {}, linearRampToValueAtTime(value) { assert.equal(value, 0) } },
      connect() {}, disconnect() {},
    }
  }
  createBufferSource() {
    const source = {
      connected: false, started: false, stopped: false,
      connect() { this.connected = true },
      disconnect() { this.connected = false },
      start() { this.started = true },
      stop() { this.stopped = true },
    }
    this.sources.push(source)
    return source
  }
  async close() { this.state = 'closed' }
}
globalThis.window = { AudioContext: MockContext }
const pitchPlayer = new PluckPlayer()
for (const { tuning, string, fret, label, midi } of pitchCases) {
  const pitch = getPitch(string, fret, tuning)
  assert.equal(pitch.label, label)
  assert.equal(pitch.midi, midi)
  await pitchPlayer.play(pitch)
  const actual = contexts.at(-1).sources.at(-1).buffer.samples
  assert.deepEqual(actual, createPluckSamples(midiToFrequency(midi), 44100))
  console.log(`通过：${label}（第 ${string} 弦 ${fret} 品），显示 MIDI ${midi} 与播放波形一致`)
}
pitchPlayer.dispose()
contexts.length = 0
const player = new PluckPlayer()
for (let index = 0; index < 100; index++) {
  assert.equal(await player.play(getPitch(index % 6 + 1, index % 25)), true)
  assert.ok(contexts[0].sources.filter((source) => source.connected).length <= 2)
}
assert.equal(contexts.length, 1)
player.stop()
assert.ok(contexts[0].sources.filter((source) => source.connected).every((source) => source.stopped))
player.dispose()
assert.equal(contexts[0].state, 'closed')
assert.equal(contexts[0].sources.filter((source) => source.connected).length, 0)
assert.equal(await player.play(getPitch(6, 0)), false)
console.log('通过：100 次连续播放共用一个上下文、最多两个连接声部、停止及释放')

class SuspendedContext extends MockContext {
  state = 'suspended'
  resume() { return new Promise((resolve) => { this.finishResume = () => { this.state = 'running'; resolve() } }) }
}
window.AudioContext = SuspendedContext
const pendingPlayer = new PluckPlayer()
const pending = pendingPlayer.play(getPitch(6, 0))
pendingPlayer.stop()
contexts.at(-1).finishResume()
assert.equal(await pending, false)
assert.equal(contexts.at(-1).sources.length, 0)
pendingPlayer.dispose()

window.AudioContext = undefined
await assert.rejects(new PluckPlayer().play(getPitch(6, 0)), /不可用/)
window.AudioContext = class extends MockContext {
  state = 'suspended'
  async resume() { throw new Error('播放被阻止') }
}
const blockedPlayer = new PluckPlayer()
await assert.rejects(blockedPlayer.play(getPitch(1, 0)), /播放被阻止/)
blockedPlayer.dispose()
console.log('通过：关闭时取消等待中的播放、不支持音频及恢复失败时返回可处理错误')
