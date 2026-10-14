import { getPitch, MAX_FRET } from './pitch'
import type { Tuning } from './pitch'
import type { Chord } from './chords'
export type Position = { string: number; fret: number }
export type Fingering = { id: string; frets: (number | null)[]; span: number; pressed: number; omitted: string[]; barre: { fret: number; from: number; to: number } | null }
const cache = new Map<string, Fingering[]>()
export function contains(shape: Fingering, point: Position) { return shape.frets[point.string - 1] === point.fret }
export function fingeringPitches(shape: Fingering, tuning: Tuning, chord?: Chord) {
  return shape.frets.flatMap((fret,index) => {
    if (fret === null) return []
    const pitch = getPitch(index+1,fret,tuning), tone = chord?.tones.find((item) => item.pitchClass === pitch.midi % 12)
    const octave = tone ? (pitch.midi-tone.natural-tone.accidental)/12-1 : pitch.octave
    const noteName = tone?.noteName ?? pitch.noteName
    return [{ ...pitch,noteName,octave,label: `${noteName}${octave}`,string:index+1,fret }]
  }).reverse()
}
export function rootPosition(chord: Chord, tuning: Tuning, preferred?: Position | null): Position {
  const roots: Position[] = []
  for (let string = 1; string <= 6; string++) for (let fret = 0; fret <= MAX_FRET; fret++) if (getPitch(string, fret, tuning).midi % 12 === chord.rootClass) roots.push({ string, fret })
  roots.sort((a,b) => (Math.abs(a.fret - (preferred?.fret ?? 0)) * 2 + Math.abs(a.string - (preferred?.string ?? 6))) - (Math.abs(b.fret - (preferred?.fret ?? 0)) * 2 + Math.abs(b.string - (preferred?.string ?? 6))))
  return roots[0]
}
/** 只分析最低按弦品位的单一横按：区间内没有空弦／不弹弦，且均不低于横按品位。 */
export function analyzeBarre(frets: (number | null)[]) {
  const pressed = frets.filter((fret): fret is number => fret !== null && fret > 0)
  if (!pressed.length) return null
  const fret = Math.min(...pressed), indices = frets.flatMap((value,index) => value === fret ? [index] : [])
  if (indices.length < 2) return null
  const from = indices[0], to = indices.at(-1)!
  if (frets.slice(from,to+1).some((value) => value === null || value < fret)) return null
  return { fret, from: from + 1, to: to + 1 }
}
/** 穷举当前筛选下的全部候选，不设结果上限；每弦一个音，可不弹，纯空弦不占跨度。 */
export function generateFingerings(chord: Chord, tuning: Tuning, maxSpan = 4): Fingering[] {
  if (!Number.isInteger(maxSpan) || maxSpan < 0 || maxSpan > 4) throw new RangeError('跨度须为 0—4 品')
  const key = JSON.stringify([chord.type.id, chord.root, chord.rootClass, tuning, maxSpan])
  const cached = cache.get(key)
  if (cached) return cached
  const allMask = (1 << chord.tones.length) - 1
  const requiredMask = chord.tones.reduce((mask,tone,index) => chord.type.optional.some((degree) => degree === tone.degree) ? mask : mask | (1 << index), 0)
  const toneBits = new Map(chord.tones.map((tone,index) => [tone.pitchClass, 1 << index]))
  const result = new Map<string, Fingering>()
  // 每个非空弦指型至少属于一个跨度窗口，重复结果按六弦品位去重。
  for (let start = 1; start <= MAX_FRET; start++) {
    const options = tuning.map((_,index) => {
      const values = [{ fret: null as number | null, bit: 0 }]
      for (const fret of [0, ...Array.from({ length: Math.min(maxSpan + 1, MAX_FRET - start + 1) },(_,i) => start + i)]) {
        const bit = toneBits.get(getPitch(index+1,fret,tuning).midi % 12)
        if (bit) values.push({ fret, bit })
      }
      return values
    })
    const remainingMasks = Array<number>(7).fill(0)
    for (let i = 5; i >= 0; i--) remainingMasks[i] = remainingMasks[i+1] | options[i].reduce((mask,option) => mask | option.bit, 0)
    const frets: (number | null)[] = []
    function visit(string: number, mask: number, sounding: number) {
      if (((mask | remainingMasks[string]) & requiredMask) !== requiredMask) return
      if (string === 6) {
        if ((mask & requiredMask) !== requiredMask || sounding < chord.tones.length - chord.type.optional.length) return
        const id = frets.map((fret) => fret ?? 'x').join('-')
        if (result.has(id)) return
        const pressed = frets.filter((fret): fret is number => fret !== null && fret > 0)
        const span = pressed.length ? Math.max(...pressed) - Math.min(...pressed) : 0
        if (span > maxSpan) return
        const omitted = mask === allMask ? [] : chord.tones.filter((_,i) => !(mask & (1 << i))).map((tone) => tone.noteName)
        result.set(id,{ id, frets: [...frets], span, pressed: pressed.length, omitted, barre: analyzeBarre(frets) })
        return
      }
      for (const option of options[string]) { frets.push(option.fret); visit(string+1,mask | option.bit,sounding + (option.fret === null ? 0 : 1)); frets.pop() }
    }
    visit(0,0,0)
  }
  const shapes = [...result.values()]
  if (cache.size >= 6) cache.delete(cache.keys().next().value!)
  cache.set(key,shapes)
  return shapes
}
export function rankedFingerings(shapes: readonly Fingering[], anchor: Position, onlyAnchor = false) {
  const cost = (shape: Fingering) => {
    const pressed = shape.frets.filter((fret): fret is number => fret !== null && fret > 0)
    const distance = pressed.length ? Math.max(...pressed.map((fret) => Math.abs(fret - anchor.fret))) : anchor.fret
    const fingers = shape.pressed - (shape.barre ? shape.frets.filter((fret) => fret === shape.barre!.fret).length - 1 : 0)
    const soundingIndices = shape.frets.flatMap((fret,index) => fret === null ? [] : [index])
    const gaps = soundingIndices.length ? shape.frets.slice(soundingIndices[0],soundingIndices.at(-1)!+1).filter((fret) => fret === null).length : 0
    return shape.omitted.length * 15 + distance * 20 + shape.span * 3 + fingers * 2 + Math.max(0,fingers-4)*40 + gaps*15 + shape.frets.filter((fret) => fret === null).length
  }
  return shapes.filter((shape) => !onlyAnchor || contains(shape,anchor)).sort((a,b) => Number(contains(b,anchor)) - Number(contains(a,anchor)) || cost(a) - cost(b) || a.id.localeCompare(b.id))
}
