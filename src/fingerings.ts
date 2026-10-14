import { getPitch, MAX_FRET } from './pitch'
import type { Tuning } from './pitch'
import type { Chord } from './chords'
import { FINGERING_TEMPLATES } from './fingeringTemplates'
import type { Barre, TuningProfile } from './fingeringTemplates'
export type Position = { string: number; fret: number }
export type Fingering = {
  id: string; frets: (number | null)[]; fingers: (number | null)[]; barres: Barre[];
  roots: Position[]; primaryRoot: Position; span: number; pressed: number; omitted: string[];
  templateId: string; templateLabel: string; family: string; kind: string; allowOmit: string[];
}
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

export function tuningProfile(tuning: Tuning): TuningProfile | null {
  const profiles = { standard: [64,59,55,50,45,40], 'half-step': [63,58,54,49,44,39], 'drop-d': [64,59,55,50,45,38] }
  return (Object.entries(profiles).find(([,midi]) => tuning.length === 6 && tuning.every((open,i) => open.midi === midi[i]))?.[0] as TuningProfile | undefined) ?? null
}
/** 结构反例检查，不是自动人体工学证明；展示资格首先来自常用模板白名单。 */
export function validateHandPlan(frets: readonly (number | null)[], fingers: readonly (number | null)[], barres: readonly Barre[]) {
  const errors: string[] = []
  if (frets.length !== 6 || fingers.length !== 6) return ['需要六弦品位和手指计划']
  frets.forEach((fret,index) => {
    const finger = fingers[index]
    if (fret === null ? finger !== null : fret === 0 ? finger !== 0 : !Number.isInteger(fret) || fret < 1 || fret > MAX_FRET || !Number.isInteger(finger) || finger! < 1 || finger! > 4) errors.push(`第 ${index+1} 弦手指分配无效`)
  })
  for (const barre of barres) {
    if (!Number.isInteger(barre.finger) || barre.finger < 1 || barre.finger > 4 || !Number.isInteger(barre.fret) || barre.fret < 1 || barre.fret > MAX_FRET || !Number.isInteger(barre.from) || !Number.isInteger(barre.to) || barre.from < 1 || barre.to > 6 || barre.from >= barre.to) { errors.push('横按范围无效'); continue }
    for (let string = barre.from; string <= barre.to; string++) {
      const fret = frets[string-1]
      if (fret === null || fret < barre.fret) errors.push('横按会误压空弦或穿过不弹弦')
      if (fret === barre.fret && fingers[string-1] !== barre.finger) errors.push('横按同品分配冲突')
    }
    if (frets[barre.from-1] !== barre.fret || frets[barre.to-1] !== barre.fret) errors.push('横按端点不对应实际按弦')
  }
  const fingerFrets: number[] = []
  for (let finger = 1; finger <= 4; finger++) {
    const positions = frets.flatMap((fret,index) => fingers[index] === finger && fret !== null ? [{string:index+1,fret}] : [])
    if (!positions.length) continue
    if (new Set(positions.map((point) => point.fret)).size > 1) errors.push('同一手指不能同时按不同品位')
    if (positions.length > 1 && !barres.some((barre) => barre.finger === finger && positions.every((point) => point.fret === barre.fret && point.string >= barre.from && point.string <= barre.to))) errors.push('重复使用手指必须有明确同品横按')
    if (barres.filter((barre) => barre.finger === finger).length > 1) errors.push('同一手指只能有一段横按')
    fingerFrets.push(positions[0].fret)
  }
  // 保守拒绝反向手指顺序；不尝试制造交叉指法。
  if (fingerFrets.some((fret,i) => i > 0 && fret < fingerFrets[i-1])) errors.push('手指顺序明显交叉')
  if (fingerFrets.length && Math.max(...fingerFrets)-Math.min(...fingerFrets) > 4) errors.push('按弦过度伸展')
  return errors
}
/** 仅定位已声明模板和合理移调；不自由组合，不保留旧枚举缓存。 */
export function generateFingerings(chord: Chord, tuning: Tuning, maxSpan = 4): Fingering[] {
  if (!Number.isInteger(maxSpan) || maxSpan < 0 || maxSpan > 4) throw new RangeError('跨度须为 0—4 品')
  const profile = tuningProfile(tuning)
  if (!profile) return []
  const result = new Map<string,Fingering>()
  for (const template of FINGERING_TEMPLATES) {
    if (template.type !== chord.type.id || !template.profiles.includes(profile)) continue
    for (const shift of template.movable ? Array.from({length:49},(_,i) => i-24) : [0]) {
      const frets = [...template.frets].reverse().map((fret) => fret === null ? null : fret+shift)
      // 可移动模板只产生封闭形；开放形必须有独立手指计划。
      if (frets.some((fret) => fret !== null && (fret < (template.movable ? 1 : 0) || fret > MAX_FRET))) continue
      const fingers = [...template.fingers].reverse()
      const barres = template.barres.map((barre) => ({...barre,fret:barre.fret+shift}))
      if (validateHandPlan(frets,fingers,barres).length) continue
      const primaryRoot = {string:template.root.string,fret:template.root.fret+shift}
      if (frets[primaryRoot.string-1] !== primaryRoot.fret || getPitch(primaryRoot.string,primaryRoot.fret,tuning).midi % 12 !== chord.rootClass) continue
      const pitches = frets.flatMap((fret,index) => fret === null ? [] : [getPitch(index+1,fret,tuning)])
      if (pitches.some((pitch) => !chord.tones.some((tone) => tone.pitchClass === pitch.midi % 12))) continue
      const missing = chord.tones.filter((tone) => !pitches.some((pitch) => pitch.midi % 12 === tone.pitchClass))
      if (missing.some((tone) => !template.omitDegrees.includes(tone.degree))) continue
      const pressed = frets.filter((fret): fret is number => fret !== null && fret > 0)
      const span = pressed.length ? Math.max(...pressed)-Math.min(...pressed) : 0
      if (span > maxSpan) continue
      const id = frets.map((fret) => fret ?? 'x').join('-')
      if (result.has(id)) continue
      const roots = frets.flatMap((fret,index) => fret !== null && getPitch(index+1,fret,tuning).midi % 12 === chord.rootClass ? [{string:index+1,fret}] : [])
      result.set(id,{id,frets,fingers,barres,primaryRoot,roots,span,pressed:pressed.length,omitted:missing.map((tone) => tone.noteName),templateId:template.id,templateLabel:template.label,family:template.family,kind:template.kind,allowOmit:template.omitDegrees})
    }
  }
  return [...result.values()].sort((a,b) => positionOf(a)-positionOf(b) || templatePriority(a)-templatePriority(b) || a.id.localeCompare(b.id))
}
export function positionOf(shape: Fingering) {
  if (shape.kind === '开放') return 0
  return Math.min(...shape.frets.filter((fret): fret is number => fret !== null && fret > 0))
}
const templatePriority = (shape: Fingering) => shape.kind === '开放' ? 0 : ['E','A'].includes(shape.family) && shape.kind === '横按' ? 1 : shape.kind === '局部' ? 2 : 3
export function rootPosition(chord: Chord, tuning: Tuning, preferred?: Position | null): Position {
  if (preferred && getPitch(preferred.string,preferred.fret,tuning).midi % 12 === chord.rootClass) return preferred
  const shapes = generateFingerings(chord,tuning)
  const distance = (point: Position) => preferred ? Math.abs(point.fret-preferred.fret)*2+Math.abs(point.string-preferred.string) : point.fret
  const ordered = preferred ? [...shapes].sort((a,b) => distance(a.primaryRoot)-distance(b.primaryRoot) || positionOf(a)-positionOf(b)) : shapes
  if (ordered.length) return ordered[0].primaryRoot
  // 无模板仍保留真正的单音根音位置，绝不当作和弦配音。
  const roots: Position[] = []
  for (let string=1; string<=6; string++) for (let fret=0; fret<=MAX_FRET; fret++) if (getPitch(string,fret,tuning).midi % 12 === chord.rootClass) roots.push({string,fret})
  return roots.sort((a,b) => distance(a)-distance(b))[0]
}
export function rankedFingerings(shapes: readonly Fingering[], anchor: Position, onlyAnchor = false) {
  return shapes.filter((shape) => !onlyAnchor || contains(shape,anchor)).sort((a,b) => Number(contains(b,anchor))-Number(contains(a,anchor)) || positionOf(a)-positionOf(b) || templatePriority(a)-templatePriority(b) || a.span-b.span || a.id.localeCompare(b.id))
}
