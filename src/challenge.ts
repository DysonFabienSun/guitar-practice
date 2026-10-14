import { getPitch, parseOpenString } from './pitch'
import type { Tuning } from './pitch'

export const QUESTION_COUNTS = [5, 10, 20] as const
export const ANSWERS = ['C', 'C♯ / D♭', 'D', 'D♯ / E♭', 'E', 'F', 'F♯ / G♭', 'G', 'G♯ / A♭', 'A', 'A♯ / B♭', 'B'] as const
export type Target = ReturnType<typeof getPitch>
export type Result = { target: Target; answer: number; correct: boolean; assisted: boolean; base: number; bonus: number }
export function tuningKey(tuning: Tuning) { return JSON.stringify(tuning) }
/** 每个 MIDI 只出现一次，指板上的重复位置不会增加抽样权重。 */
export function targetPool(tuning: Tuning): Target[] {
  const pitches = new Map<number, Target>()
  for (let string = 1; string <= 6; string++) for (let fret = 0; fret <= 12; fret++) {
    const pitch = getPitch(string, fret, tuning)
    if (!pitches.has(pitch.midi)) pitches.set(pitch.midi, pitch)
  }
  return [...pitches.values()].sort((a, b) => a.midi - b.midi)
}
export function generateTargets(tuning: Tuning, count: number, random = Math.random) {
  if (!QUESTION_COUNTS.some((value) => value === count)) throw new RangeError('题数须为 5、10 或 20')
  const pool = targetPool(tuning)
  const targets: Target[] = []
  for (let i = 0; i < count; i++) {
    const candidates = pool.filter((pitch) => pitch.midi !== targets.at(-1)?.midi)
    const value = random()
    if (!(value >= 0 && value < 1)) throw new RangeError('随机值须在 0（含）与 1（不含）之间')
    targets.push(candidates[Math.floor(value * candidates.length)])
  }
  return targets
}
export function pitchClass(noteName: string) { return ((parseOpenString(noteName, '3').midi % 12) + 12) % 12 }
export function scoreAnswer(target: Target, answer: number | string, assisted: boolean): Result {
  const value = typeof answer === 'string' ? pitchClass(answer) : answer
  if (!Number.isInteger(value) || value < 0 || value > 11) throw new RangeError('请选择有效音名')
  const correct = target.midi % 12 === value
  return { target, answer: value, correct, assisted, base: correct ? 10 : 0, bonus: correct && !assisted ? 5 : 0 }
}
export function summarize(results: readonly Result[]) {
  const correct = results.filter((result) => result.correct).length
  const base = results.reduce((sum, result) => sum + result.base, 0)
  const bonus = results.reduce((sum, result) => sum + result.bonus, 0)
  return { correct, accuracy: results.length ? correct / results.length * 100 : 0, base, bonus, total: base + bonus }
}
