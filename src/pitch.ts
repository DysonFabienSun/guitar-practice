/** 按画面从上到下排列：第 1 弦到第 6 弦。MIDI 60 对应 C4。 */
export const STANDARD_TUNING = [64, 59, 55, 50, 45, 40] as const
const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'] as const

/** 每升一品，音高增加一个半音；弦号从 1 开始。 */
export function getPitch(stringNumber: number, fret: number) {
  if (!Number.isInteger(stringNumber) || stringNumber < 1 || stringNumber > 6) {
    throw new RangeError('弦号必须是 1—6 的整数')
  }
  if (!Number.isInteger(fret) || fret < 0 || fret > 12) {
    throw new RangeError('品位必须是 0—12 的整数')
  }
  const midi = STANDARD_TUNING[stringNumber - 1] + fret
  const noteName = NOTE_NAMES[midi % 12]
  const octave = Math.floor(midi / 12) - 1
  return { noteName, octave, label: `${noteName}${octave}`, midi }
}
