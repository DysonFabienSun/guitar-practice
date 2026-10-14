import { PluckPlayer } from './audio'
import { generateTargets, scoreAnswer, tuningKey } from './challenge'
import type { Target, Result } from './challenge'
import { getPitch } from './pitch'
import type { Tuning } from './pitch'

type Player = Pick<PluckPlayer, 'play' | 'stop' | 'dispose'>
export type ChallengeState = {
  phase: 'setup' | 'question' | 'complete'; count: number; targets: Target[]; index: number;
  answer: number | null; assisted: boolean; results: Result[];
  audio: 'idle' | 'playing' | 'ready' | 'error'; heard: boolean; message: string;
}
const initial = (count = 5, message = ''): ChallengeState => ({ phase: 'setup', count, targets: [], index: 0, answer: null, assisted: false, results: [], audio: 'idle', heard: false, message })

/** 界面与检查脚本共用的练习状态机；异步播放以请求号取消，判分只发生在 submit。 */
export class ChallengeSession {
  private state = initial()
  private listeners = new Set<() => void>()
  private player: Player | null = null
  private request = 0
  private tuning: Tuning
  private sound: boolean
  private factory: () => Player
  private random: () => number
  constructor(tuning: Tuning, sound: boolean, factory: () => Player = () => new PluckPlayer(), random = Math.random) {
    this.tuning = tuning; this.sound = sound; this.factory = factory; this.random = random
  }
  getSnapshot = () => this.state
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  private update(next: ChallengeState) { this.state = next; this.listeners.forEach((listener) => listener()) }
  private patch(changes: Partial<ChallengeState>) { this.update({ ...this.state, ...changes }) }
  private stop() { ++this.request; this.player?.stop() }
  configure(tuning: Tuning, sound: boolean) {
    const changed = tuningKey(tuning) !== tuningKey(this.tuning)
    this.tuning = tuning
    if (changed) {
      const wasRunning = this.state.phase !== 'setup'
      this.stop()
      this.update(initial(this.state.count, wasRunning ? '调弦已改变，当前练习已结束，请重新开始。' : '调弦已更新，下一次练习使用当前调弦。'))
    }
    if (sound !== this.sound) {
      this.sound = sound
      this.stop()
      if (this.state.phase === 'question' && !this.isSubmitted()) this.patch({ audio: 'idle', heard: false, message: sound ? '声音已开启，请重播目标音后继续。' : '声音已关闭，请启用声音并重播目标音后继续。' })
    }
  }
  setCount(count: number) {
    if (this.state.phase === 'setup' && [5, 10, 20].includes(count)) this.patch({ count })
  }
  isSubmitted() { return this.state.results.length > this.state.index }
  async start() {
    if (!this.sound) { this.patch({ message: '当前声音已关闭，请先启用声音。' }); return }
    this.stop()
    this.update({ ...initial(this.state.count), phase: 'question', targets: generateTargets(this.tuning, this.state.count, this.random) })
    await this.replay()
  }
  choose(answer: number) {
    if (this.state.phase === 'question' && !this.isSubmitted() && Number.isInteger(answer) && answer >= 0 && answer <= 11) this.patch({ answer })
  }
  private async play(pitch: Target, target: boolean) {
    this.stop()
    const request = this.request
    this.patch({ audio: 'playing', message: '', ...(target ? { heard: false } : {}) })
    try {
      this.player ??= this.factory()
      const played = await this.player.play(pitch)
      if (request !== this.request) return
      if (!played) throw new Error('未播放')
      this.patch({ audio: 'ready', ...(target ? { heard: true } : {}) })
    } catch {
      if (request !== this.request) return
      this.patch({ audio: 'error', heard: false, message: this.isSubmitted()
        ? '声音未能播放。本题已提交，得分保持不变，可以继续下一题或退出练习。'
        : '声音未能播放。本题尚未计分，请检查浏览器声音权限，再重播目标音；也可以退出练习。' })
    }
  }
  async replay() {
    if (this.state.phase !== 'question' || !this.sound) return
    await this.play(this.state.targets[this.state.index], true)
  }
  async assist(string: number, fret: number) {
    if (this.state.phase !== 'question' || this.isSubmitted() || !this.sound || !this.state.heard || this.state.audio === 'playing') return
    this.patch({ assisted: true })
    await this.play(getPitch(string, fret, this.tuning), false)
  }
  submit() {
    const state = this.state
    if (state.phase !== 'question' || this.isSubmitted() || state.answer === null || !state.heard || state.audio !== 'ready' || !this.sound) return
    this.stop()
    const result = scoreAnswer(state.targets[state.index], state.answer, state.assisted)
    this.patch({ results: [...state.results, result], audio: 'idle', message: '' })
  }
  async next() {
    if (this.state.phase !== 'question' || !this.isSubmitted()) return
    this.stop()
    if (this.state.index + 1 === this.state.count) { this.patch({ phase: 'complete', audio: 'idle' }); return }
    this.patch({ index: this.state.index + 1, answer: null, assisted: false, heard: false, audio: 'idle', message: '' })
    await this.replay()
  }
  exit(message = '练习已退出，可重新开始。') { this.stop(); this.update(initial(this.state.count, message)) }
  deactivate() {
    this.exit('已离开练习，请重新开始。')
    this.player?.dispose(); this.player = null
  }
}
