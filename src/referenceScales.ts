import type { Chord } from './chords'
import { SCALE_DEFINITIONS } from './scales'
import { CHROMATIC_DEGREES, intervalLabel } from './intervals'
export { toRoman } from './intervals'
export const REFERENCE_SCALES = SCALE_DEFINITIONS
export type ReferenceScale = typeof REFERENCE_SCALES[number]
export function scaleSuggestions(chord: Chord) {
  return REFERENCE_SCALES.filter((scale) => chord.tones.every((tone) => scale.offsets.some((offset) => (offset + chord.rootClass) % 12 === tone.pitchClass)))
}
export function degreeAt(chord: Chord, scale: ReferenceScale | undefined, midi: number) {
  const relative = (midi % 12 - chord.rootClass + 12) % 12
  const scaleIndex = scale?.offsets.findIndex((offset) => offset === relative) ?? -1
  const tone = chord.tones.find((item) => item.pitchClass === midi % 12)
  const degree = tone?.degree ?? (scale && scaleIndex >= 0 ? scale.degrees[scaleIndex] : CHROMATIC_DEGREES[relative])
  return { label: intervalLabel(degree), inScale: scaleIndex >= 0 }
}
