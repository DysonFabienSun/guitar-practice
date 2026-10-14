import type { Chord } from './chords'
export const REFERENCE_SCALES = [
  { id: 'major', name: '大调 / 伊奥尼亚', offsets: [0,2,4,5,7,9,11], degrees: ['1','2','3','4','5','6','7'] },
  { id: 'minor', name: '自然小调 / 爱奥利亚', offsets: [0,2,3,5,7,8,10], degrees: ['1','2','♭3','4','5','♭6','♭7'] },
  { id: 'dorian', name: '多利亚', offsets: [0,2,3,5,7,9,10], degrees: ['1','2','♭3','4','5','6','♭7'] },
  { id: 'phrygian', name: '弗里几亚', offsets: [0,1,3,5,7,8,10], degrees: ['1','♭2','♭3','4','5','♭6','♭7'] },
  { id: 'lydian', name: '利底亚', offsets: [0,2,4,6,7,9,11], degrees: ['1','2','3','♯4','5','6','7'] },
  { id: 'mixolydian', name: '混合利底亚', offsets: [0,2,4,5,7,9,10], degrees: ['1','2','3','4','5','6','♭7'] },
  { id: 'locrian', name: '洛克里亚', offsets: [0,1,3,5,6,8,10], degrees: ['1','♭2','♭3','4','♭5','♭6','♭7'] },
  { id: 'harmonic-minor', name: '和声小调', offsets: [0,2,3,5,7,8,11], degrees: ['1','2','♭3','4','5','♭6','7'] },
  { id: 'melodic-minor', name: '旋律小调（爵士上行）', offsets: [0,2,3,5,7,9,11], degrees: ['1','2','♭3','4','5','6','7'] },
  { id: 'whole-tone', name: '全音音阶', offsets: [0,2,4,6,8,10], degrees: ['1','2','3','♯4','♯5','♭7'] },
  { id: 'half-whole', name: '半全减音阶', offsets: [0,1,3,4,6,7,9,10], degrees: ['1','♭2','♯2','3','♯4','5','6','♭7'] },
  { id: 'whole-half', name: '全半减音阶', offsets: [0,2,3,5,6,8,9,11], degrees: ['1','2','♭3','4','♭5','♭6','♭♭7','7'] },
] as const
export type ReferenceScale = typeof REFERENCE_SCALES[number]
export function scaleSuggestions(chord: Chord) {
  return REFERENCE_SCALES.filter((scale) => chord.tones.every((tone) => scale.offsets.some((offset) => (offset + chord.rootClass) % 12 === tone.pitchClass)))
}
export function toRoman(degree: string) {
  const number = Number(degree.match(/\d+/)?.[0])
  return degree.replace(/\d+/, ['I','II','III','IV','V','VI','VII'][(number - 1) % 7])
}
export function degreeAt(chord: Chord, scale: ReferenceScale | undefined, midi: number) {
  const relative = (midi % 12 - chord.rootClass + 12) % 12
  const scaleIndex = scale?.offsets.findIndex((offset) => offset === relative) ?? -1
  const tone = chord.tones.find((item) => item.pitchClass === midi % 12)
  const degree = scale && scaleIndex >= 0 ? scale.degrees[scaleIndex] : tone?.degree
    ?? ['1','♭2','2','♭3','3','4','♯4','5','♭6','6','♭7','7'][relative]
  return { label: toRoman(degree), inScale: scaleIndex >= 0 }
}
