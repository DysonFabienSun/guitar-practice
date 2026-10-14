import { rootPitchClass, spellTone } from './intervals'
import { getPitch } from './pitch'
import type { Tuning } from './pitch'

export const CHORD_TYPES = [
  {"category": "基础", "id": "major", "label": "大三和弦", "symbol": "", "semitones": [0, 4, 7], "degrees": ["1", "3", "5"], "optional": []},
  {"category": "基础", "id": "minor", "label": "小三和弦", "symbol": "m", "semitones": [0, 3, 7], "degrees": ["1", "♭3", "5"], "optional": []},
  {"category": "基础", "id": "dim", "label": "减三和弦", "symbol": "dim", "semitones": [0, 3, 6], "degrees": ["1", "♭3", "♭5"], "optional": []},
  {"category": "基础", "id": "aug", "label": "增三和弦", "symbol": "aug", "semitones": [0, 4, 8], "degrees": ["1", "3", "♯5"], "optional": []},
  {"category": "基础", "id": "sus2", "label": "sus2", "symbol": "sus2", "semitones": [0, 2, 7], "degrees": ["1", "2", "5"], "optional": []},
  {"category": "基础", "id": "sus4", "label": "sus4", "symbol": "sus4", "semitones": [0, 5, 7], "degrees": ["1", "4", "5"], "optional": []},
  {"category": "基础", "id": "power", "label": "五度和弦", "symbol": "5", "semitones": [0, 7], "degrees": ["1", "5"], "optional": []},
  {"category": "七和弦", "id": "maj7", "label": "大七和弦", "symbol": "maj7", "semitones": [0, 4, 7, 11], "degrees": ["1", "3", "5", "7"], "optional": []},
  {"category": "七和弦", "id": "min7", "label": "小七和弦", "symbol": "m7", "semitones": [0, 3, 7, 10], "degrees": ["1", "♭3", "5", "♭7"], "optional": []},
  {"category": "七和弦", "id": "dom7", "label": "属七和弦", "symbol": "7", "semitones": [0, 4, 7, 10], "degrees": ["1", "3", "5", "♭7"], "optional": []},
  {"category": "七和弦", "id": "dim7", "label": "减七和弦", "symbol": "dim7", "semitones": [0, 3, 6, 9], "degrees": ["1", "♭3", "♭5", "♭♭7"], "optional": []},
  {"category": "七和弦", "id": "half-dim7", "label": "半减七和弦", "symbol": "m7♭5", "semitones": [0, 3, 6, 10], "degrees": ["1", "♭3", "♭5", "♭7"], "optional": []},
  {"category": "七和弦", "id": "mMaj7", "label": "小大七", "symbol": "mMaj7", "semitones": [0, 3, 7, 11], "degrees": ["1", "♭3", "5", "7"], "optional": []},
  {"category": "七和弦", "id": "augMaj7", "label": "增大七", "symbol": "augMaj7", "semitones": [0, 4, 8, 11], "degrees": ["1", "3", "♯5", "7"], "optional": []},
  {"category": "七和弦", "id": "aug7", "label": "增属七", "symbol": "aug7", "semitones": [0, 4, 8, 10], "degrees": ["1", "3", "♯5", "♭7"], "optional": []},
  {"category": "七和弦", "id": "7sus4", "label": "7sus4", "symbol": "7sus4", "semitones": [0, 5, 7, 10], "degrees": ["1", "4", "5", "♭7"], "optional": []},
  {"category": "六和弦与附加音", "id": "6", "label": "6", "symbol": "6", "semitones": [0, 4, 7, 9], "degrees": ["1", "3", "5", "6"], "optional": []},
  {"category": "六和弦与附加音", "id": "m6", "label": "m6", "symbol": "m6", "semitones": [0, 3, 7, 9], "degrees": ["1", "♭3", "5", "6"], "optional": []},
  {"category": "六和弦与附加音", "id": "6/9", "label": "6/9", "symbol": "6/9", "semitones": [0, 4, 7, 9, 14], "degrees": ["1", "3", "5", "6", "9"], "optional": []},
  {"category": "六和弦与附加音", "id": "m6/9", "label": "m6/9", "symbol": "m6/9", "semitones": [0, 3, 7, 9, 14], "degrees": ["1", "♭3", "5", "6", "9"], "optional": []},
  {"category": "六和弦与附加音", "id": "add9", "label": "add9", "symbol": "add9", "semitones": [0, 4, 7, 14], "degrees": ["1", "3", "5", "9"], "optional": []},
  {"category": "六和弦与附加音", "id": "madd9", "label": "madd9", "symbol": "madd9", "semitones": [0, 3, 7, 14], "degrees": ["1", "♭3", "5", "9"], "optional": []},
  {"category": "六和弦与附加音", "id": "add11", "label": "add11", "symbol": "add11", "semitones": [0, 4, 7, 17], "degrees": ["1", "3", "5", "11"], "optional": []},
  {"category": "六和弦与附加音", "id": "madd11", "label": "madd11", "symbol": "madd11", "semitones": [0, 3, 7, 17], "degrees": ["1", "♭3", "5", "11"], "optional": []},
  {"category": "扩展", "id": "9", "label": "9", "symbol": "9", "semitones": [0, 4, 7, 10, 14], "degrees": ["1", "3", "5", "♭7", "9"], "optional": ["5"]},
  {"category": "扩展", "id": "maj9", "label": "maj9", "symbol": "maj9", "semitones": [0, 4, 7, 11, 14], "degrees": ["1", "3", "5", "7", "9"], "optional": ["5"]},
  {"category": "扩展", "id": "m9", "label": "m9", "symbol": "m9", "semitones": [0, 3, 7, 10, 14], "degrees": ["1", "♭3", "5", "♭7", "9"], "optional": ["5"]},
  {"category": "扩展", "id": "mMaj9", "label": "mMaj9", "symbol": "mMaj9", "semitones": [0, 3, 7, 11, 14], "degrees": ["1", "♭3", "5", "7", "9"], "optional": ["5"]},
  {"category": "扩展", "id": "11", "label": "11", "symbol": "11", "semitones": [0, 4, 7, 10, 14, 17], "degrees": ["1", "3", "5", "♭7", "9", "11"], "optional": ["5"]},
  {"category": "扩展", "id": "maj11", "label": "maj11", "symbol": "maj11", "semitones": [0, 4, 7, 11, 14, 17], "degrees": ["1", "3", "5", "7", "9", "11"], "optional": ["5"]},
  {"category": "扩展", "id": "m11", "label": "m11", "symbol": "m11", "semitones": [0, 3, 7, 10, 14, 17], "degrees": ["1", "♭3", "5", "♭7", "9", "11"], "optional": ["5"]},
  {"category": "扩展", "id": "13", "label": "13", "symbol": "13", "semitones": [0, 4, 7, 10, 14, 17, 21], "degrees": ["1", "3", "5", "♭7", "9", "11", "13"], "optional": ["5", "11"]},
  {"category": "扩展", "id": "maj13", "label": "maj13", "symbol": "maj13", "semitones": [0, 4, 7, 11, 14, 17, 21], "degrees": ["1", "3", "5", "7", "9", "11", "13"], "optional": ["5", "11"]},
  {"category": "扩展", "id": "m13", "label": "m13", "symbol": "m13", "semitones": [0, 3, 7, 10, 14, 17, 21], "degrees": ["1", "♭3", "5", "♭7", "9", "11", "13"], "optional": ["5", "11"]},
  {"category": "变化", "id": "7b5", "label": "7♭5", "symbol": "7♭5", "semitones": [0, 4, 6, 10], "degrees": ["1", "3", "♭5", "♭7"], "optional": []},
  {"category": "变化", "id": "7#5", "label": "7♯5", "symbol": "7♯5", "semitones": [0, 4, 8, 10], "degrees": ["1", "3", "♯5", "♭7"], "optional": []},
  {"category": "变化", "id": "7b9", "label": "7♭9", "symbol": "7♭9", "semitones": [0, 4, 7, 10, 13], "degrees": ["1", "3", "5", "♭7", "♭9"], "optional": ["5"]},
  {"category": "变化", "id": "7#9", "label": "7♯9", "symbol": "7♯9", "semitones": [0, 4, 7, 10, 15], "degrees": ["1", "3", "5", "♭7", "♯9"], "optional": ["5"]},
  {"category": "变化", "id": "7#11", "label": "7♯11", "symbol": "7♯11", "semitones": [0, 4, 7, 10, 18], "degrees": ["1", "3", "5", "♭7", "♯11"], "optional": ["5"]},
  {"category": "变化", "id": "7b13", "label": "7♭13", "symbol": "7♭13", "semitones": [0, 4, 7, 10, 20], "degrees": ["1", "3", "5", "♭7", "♭13"], "optional": ["5"]},
  {"category": "变化", "id": "7b9#11", "label": "7♭9♯11", "symbol": "7♭9♯11", "semitones": [0, 4, 7, 10, 13, 18], "degrees": ["1", "3", "5", "♭7", "♭9", "♯11"], "optional": ["5"]},
  {"category": "变化", "id": "7#9b13", "label": "7♯9♭13", "symbol": "7♯9♭13", "semitones": [0, 4, 7, 10, 15, 20], "degrees": ["1", "3", "5", "♭7", "♯9", "♭13"], "optional": ["5"]},
  {"category": "变化", "id": "7b9b13", "label": "7♭9♭13", "symbol": "7♭9♭13", "semitones": [0, 4, 7, 10, 13, 20], "degrees": ["1", "3", "5", "♭7", "♭9", "♭13"], "optional": ["5"]},
  {"category": "变化", "id": "7b9#11b13", "label": "7♭9♯11♭13", "symbol": "7♭9♯11♭13", "semitones": [0, 4, 7, 10, 13, 18, 20], "degrees": ["1", "3", "5", "♭7", "♭9", "♯11", "♭13"], "optional": ["5"]},
] as const
export type ChordTypeId = typeof CHORD_TYPES[number]['id']
export const CHORD_CATEGORIES = [...new Set(CHORD_TYPES.map((type) => type.category))]
/** 按级数选择字母，再按绝对半音补升降号；保留正确的三度／五度拼写。 */
export function buildChord(root: string, typeId: ChordTypeId) {
  root = root.trim().replace('#', '♯').replace('b', '♭')
  const rootClass = rootPitchClass(root)
  const type = CHORD_TYPES.find((item) => item.id === typeId)
  if (!type) throw new RangeError('未知和弦类型')
  const tones = type.semitones.map((offset, index) => spellTone(root,offset,type.degrees[index]))
  return { root, rootClass, type, name: root + type.symbol, tones }
}
export type Chord = ReturnType<typeof buildChord>
export function chordToneAt(chord: Chord, string: number, fret: number, tuning: Tuning) {
  const pitch = getPitch(string, fret, tuning)
  return { pitch, tone: chord.tones.find((tone) => tone.pitchClass === pitch.midi % 12) }
}
