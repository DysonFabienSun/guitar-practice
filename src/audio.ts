import type { getPitch } from './pitch'

type Pitch = ReturnType<typeof getPitch>
type Voice = { source: AudioBufferSourceNode; gain: GainNode }

export function midiToFrequency(midi: number) {
  return 440 * 2 ** ((midi - 69) / 12)
}

/** 基音与逐渐衰减的泛音，4ms 起音、末尾淡出；峰值不超过 0.18。 */
export function createPluckSamples(frequency: number, sampleRate: number) {
  const duration = 0.9
  const samples = new Float32Array(Math.ceil(duration * sampleRate))
  for (let index = 0; index < samples.length; index++) {
    const time = index / sampleRate
    const attack = Math.min(time / 0.004, 1)
    const release = Math.min((duration - time) / 0.035, 1)
    let value = 0
    for (let harmonic = 1; harmonic <= 6; harmonic++) {
      if (frequency * harmonic >= sampleRate / 2) break
      value += Math.sin(2 * Math.PI * frequency * harmonic * time)
        * Math.exp(-time * (5 + harmonic * 2)) / (harmonic * harmonic)
    }
    samples[index] = value * attack * release * 0.12
  }
  return samples
}

/** 单音拨弦：新音替换旧音，最多保留一个 10ms 的淡出尾音。 */
export class PluckPlayer {
  private context: AudioContext | null = null
  private current: Voice | null = null
  private tail: Voice | null = null
  private request = 0
  private disposed = false

  async play(pitch: Pitch): Promise<boolean> {
    if (this.disposed) return false
    const request = ++this.request
    const AudioContextClass = window.AudioContext
      ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) throw new Error('Web Audio 不可用')
    if (!this.context || this.context.state === 'closed') {
      this.context = new AudioContextClass()
    }
    const context = this.context
    if (context.state !== 'running') {
      // 恢复在点击处理过程中调用；超时也会给出提示，避免永久等待。
      let timeout: ReturnType<typeof setTimeout> | undefined
      try {
        await Promise.race([
          context.resume(),
          new Promise<never>((_, reject) => {
            timeout = setTimeout(() => reject(new Error('音频启动超时')), 1500)
          }),
        ])
      } finally {
        clearTimeout(timeout)
      }
    }
    if (request !== this.request || this.disposed) return false
    if (context.state !== 'running') throw new Error('音频未启动')

    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * 0.9), context.sampleRate)
    buffer.copyToChannel(createPluckSamples(midiToFrequency(pitch.midi), context.sampleRate), 0)
    const voice = { source: context.createBufferSource(), gain: context.createGain() }
    voice.source.buffer = buffer
    voice.source.connect(voice.gain)
    voice.gain.connect(context.destination)
    voice.source.onended = () => {
      this.disconnect(voice)
      if (this.current === voice) this.current = null
      if (this.tail === voice) this.tail = null
    }
    this.fadeCurrent()
    this.current = voice
    voice.source.start()
    return true
  }

  stop() {
    ++this.request // 取消仍在等待浏览器恢复音频的点击。
    this.fadeCurrent()
  }

  dispose() {
    this.disposed = true
    this.stop()
    if (this.tail) this.disconnect(this.tail)
    this.tail = null
    if (this.context) void this.context.close().catch(() => {})
    this.context = null
  }

  private disconnect(voice: Voice) {
    voice.source.disconnect()
    voice.gain.disconnect()
  }

  private fadeCurrent() {
    if (this.tail) this.disconnect(this.tail)
    this.tail = this.current
    this.current = null
    if (!this.tail || !this.context) return
    const now = this.context.currentTime
    this.tail.gain.gain.setValueAtTime(1, now)
    this.tail.gain.gain.linearRampToValueAtTime(0, now + 0.01)
    this.tail.source.stop(now + 0.01)
  }
}
