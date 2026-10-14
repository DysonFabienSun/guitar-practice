import { createPluckSamples, midiToFrequency } from './audio'
import type { getPitch } from './pitch'
type Pitch = ReturnType<typeof getPitch>
type Voice = { source: AudioBufferSourceNode | OscillatorNode; gain: GainNode; level: number }
export type ChordPlaybackMode = 'together' | 'sequence'
/** 短音复用拨弦波形；持续音使用稳定频率与相同泛音配比，不循环重触发。 */
export class ChordPlayer {
  private context: AudioContext | null = null
  private voices: Voice[] = []
  private tails: Voice[] = []
  private request = 0
  private disposed = false
  private resumePromise: Promise<void> | null = null
  async prepare() {
    if (this.disposed) throw new Error('播放器已释放')
    const Context = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Context) throw new Error('Web Audio 不可用')
    if (!this.context || this.context.state === 'closed') this.context = new Context()
    const context = this.context
    if (context.state !== 'running') {
      if (!this.resumePromise) {
        this.resumePromise = (async () => {
          let timer: ReturnType<typeof setTimeout> | undefined
          try { await Promise.race([context.resume(),new Promise<never>((_,reject) => { timer = setTimeout(() => reject(new Error('音频启动超时')),1500) })]) }
          finally { clearTimeout(timer); this.resumePromise = null }
        })()
      }
      await this.resumePromise
    }
    if (this.disposed || context.state !== 'running') throw new Error('音频未启动')
    return context
  }
  private attach(source: Voice['source'], level: number, context: AudioContext) {
    const voice = { source, gain: context.createGain(), level }
    source.connect(voice.gain); voice.gain.connect(context.destination)
    source.onended = () => { this.disconnect(voice); this.voices = this.voices.filter((v) => v !== voice); this.tails = this.tails.filter((v) => v !== voice) }
    this.voices.push(voice)
    return voice
  }
  private validate(pitches: readonly Pitch[]) {
    if (!pitches.length || pitches.length > 6 || pitches.some((p) => !Number.isFinite(p.midi))) throw new RangeError('需要 1—6 个有效音高')
  }
  async play(pitches: readonly Pitch[], mode: ChordPlaybackMode) {
    this.stop(); const request = this.request
    if (this.disposed) return false
    this.validate(pitches)
    const context = await this.prepare()
    if (request !== this.request || this.disposed) return false
    const start = context.currentTime + 0.02
    try {
      pitches.forEach((pitch,index) => {
        const buffer = context.createBuffer(1,Math.ceil(context.sampleRate * 0.9),context.sampleRate)
        buffer.copyToChannel(createPluckSamples(midiToFrequency(pitch.midi),context.sampleRate),0)
        const source = context.createBufferSource(); source.buffer = buffer
        const voice = this.attach(source,1 / pitches.length,context)
        voice.gain.gain.setValueAtTime(voice.level,context.currentTime)
        source.start(start + (mode === 'sequence' ? index * 0.32 : 0))
      })
    } catch (error) { this.stop(); throw error }
    return true
  }
  async hold(pitches: readonly Pitch[]) {
    this.stop(); const request = this.request
    if (this.disposed) return false
    this.validate(pitches)
    const context = await this.prepare()
    if (request !== this.request || this.disposed) return false
    const real = new Float32Array(7), imaginary = new Float32Array(7)
    for (let h = 1; h <= 6; h++) imaginary[h] = 1 / (h * h)
    // 每声部仅有一个连续振荡器；总峰值按六个泛音的和及声部数控制。
    try {
      pitches.forEach((pitch) => {
        const source = context.createOscillator()
        const coefficients = imaginary.slice()
        for (let h = 1; h <= 6; h++) if (midiToFrequency(pitch.midi) * h >= context.sampleRate / 2) coefficients[h] = 0
        source.setPeriodicWave(context.createPeriodicWave(real,coefficients,{ disableNormalization: true }))
        source.frequency.setValueAtTime(midiToFrequency(pitch.midi),context.currentTime)
        const voice = this.attach(source,0.1 / pitches.length,context)
        voice.gain.gain.setValueAtTime(0,context.currentTime)
        voice.gain.gain.linearRampToValueAtTime(voice.level,context.currentTime + 0.004)
        source.start(context.currentTime)
      })
    } catch (error) { this.stop(); throw error }
    return true
  }
  private disconnect(voice: Voice) { voice.source.disconnect(); voice.gain.disconnect() }
  /** 松开持续音：取消待启动请求，保留自然衰减尾音。 */
  release(seconds = 0.65) { this.stop(seconds) }
  stop(seconds = 0.01) {
    ++this.request
    this.tails.forEach((voice) => this.disconnect(voice))
    this.tails = this.voices; this.voices = []
    if (!this.context) return
    const now = this.context.currentTime
    this.tails.forEach((voice) => {
      voice.gain.gain.cancelScheduledValues(now)
      voice.gain.gain.setValueAtTime(voice.level,now)
      voice.gain.gain.exponentialRampToValueAtTime(0.0001,now + seconds)
      voice.source.stop(now + seconds)
    })
  }
  dispose() {
    this.disposed = true; this.stop()
    this.tails.forEach((voice) => this.disconnect(voice)); this.tails = []
    if (this.context) void this.context.close().catch(() => {})
    this.context = null
  }
}
