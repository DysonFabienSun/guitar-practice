export const MAX_FRET = 24
export const NOTE_OPTIONS = ['C', 'C♯', 'D♭', 'D', 'D♯', 'E♭', 'E', 'F', 'F♯', 'G♭', 'G', 'G♯', 'A♭', 'A', 'A♯', 'B♭', 'B', 'C♭', 'B♯', 'E♯', 'F♭'] as const
const SHARP_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']
const FLAT_NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B']
const NATURAL_PITCHES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
export type OpenString = { midi: number; noteName: string; octave: number }
export type Tuning = readonly OpenString[]
export type TuningInput = { noteName: string; octave: string }

export function parseOpenString(noteName: string, octaveInput: string): OpenString {
  const normalized = noteName.trim().replace('#', '♯').replace('b', '♭')
  if (!/^[A-G][♯♭]?$/.test(normalized)) throw new RangeError('音名须为 A—G，可带 ♯ 或 ♭')
  if (!/^[0-6]$/.test(octaveInput.trim())) throw new RangeError('八度须为 0—6 的整数')
  const octave = Number(octaveInput)
  const accidental = normalized.endsWith('♯') ? 1 : normalized.endsWith('♭') ? -1 : 0
  return { midi: 12 * (octave + 1) + NATURAL_PITCHES[normalized[0]] + accidental, noteName: normalized, octave }
}

/** 自定义输入全部有效后才能应用；按第 1 弦到第 6 弦排列。 */
export function validateTuning(inputs: readonly TuningInput[]) {
  const errors: string[] = []
  const tuning: OpenString[] = []
  if (inputs.length !== 6) errors.push('调弦必须包含六根弦')
  inputs.forEach((input, index) => {
    try { tuning.push(parseOpenString(input.noteName, input.octave)) }
    catch (error) { errors.push(`第 ${index + 1} 弦：${error instanceof Error ? error.message : '输入无效'}`) }
  })
  return { tuning, errors }
}

function fromLabels(labels: readonly string[]): Tuning {
  return labels.map((label) => parseOpenString(label.slice(0, -1), label.slice(-1)))
}

/** 内部和画面一致，从顶部第 1 弦到第 6 弦。 */
export const TUNING_PRESETS = [
  { id: 'standard', label: '标准 EADGBE', tuning: fromLabels(['E4', 'B3', 'G3', 'D3', 'A2', 'E2']) },
  { id: 'drop-d', label: 'Drop D', tuning: fromLabels(['E4', 'B3', 'G3', 'D3', 'A2', 'D2']) },
  { id: 'half-step', label: '降半音', tuning: fromLabels(['E♭4', 'B♭3', 'G♭3', 'D♭3', 'A♭2', 'E♭2']) },
  { id: 'facgce', label: 'FACGCE', tuning: fromLabels(['E4', 'C4', 'G3', 'C3', 'A2', 'F2']) },
] as const
export const STANDARD_TUNING = TUNING_PRESETS[0].tuning

/** 音高唯一来源：当前弦的空弦 MIDI + 品数，弦号从 1 开始。 */
export function getPitch(stringNumber: number, fret: number, tuning: Tuning) {
  if (!Number.isInteger(stringNumber) || stringNumber < 1 || stringNumber > 6) {
    throw new RangeError('弦号必须是 1—6 的整数')
  }
  if (!Number.isInteger(fret) || fret < 0 || fret > MAX_FRET) {
    throw new RangeError(`品位必须是 0—${MAX_FRET} 的整数`)
  }
  if (tuning.length !== 6 || tuning.some((open) => !Number.isInteger(open.midi) || open.midi < 0 || open.midi + MAX_FRET > 127)) {
    throw new RangeError('调弦必须是六个有效的空弦音高')
  }
  const open = tuning[stringNumber - 1]
  const midi = open.midi + fret
  const names = open.noteName.includes('♭') ? FLAT_NAMES : SHARP_NAMES
  const noteName = fret === 0 ? open.noteName : names[midi % 12]
  const octave = fret === 0 ? open.octave : Math.floor(midi / 12) - 1
  return { noteName, octave, label: `${noteName}${octave}`, midi }
}
