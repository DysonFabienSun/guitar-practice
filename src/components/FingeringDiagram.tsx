import type { Fingering } from '../fingerings'
import type { Chord } from '../chords'
import type { Tuning } from '../pitch'
import { getPitch, MAX_FRET } from '../pitch'
export default function FingeringDiagram({ shape, chord, tuning }: { shape: Fingering; chord: Chord; tuning: Tuning }) {
  const pressed = shape.frets.filter((fret): fret is number => fret !== null && fret > 0)
  const min = pressed.length ? Math.min(...pressed) : 1
  const start = pressed.length && Math.max(...pressed) > 5 ? Math.min(min,MAX_FRET-4) : 1
  const x = (string: number) => 26 + (6 - string) * 20
  const y = (fret: number) => 40 + (fret - start + 0.5) * 24
  return <svg viewBox="0 0 154 185" className="fingering-diagram" aria-hidden="true">
    <text x="5" y="56" className="diagram-fret">{start}</text>
    {[0,1,2,3,4,5].map((row) => <line key={row} x1="26" x2="126" y1={40 + row * 24} y2={40 + row * 24} className={row === 0 && start === 1 ? 'diagram-nut' : 'diagram-line'} />)}
    {[1,2,3,4,5,6].map((string) => <line key={string} x1={x(string)} x2={x(string)} y1="40" y2="160" className="diagram-line" />)}
    {shape.barres.map((barre) => <g key={`${barre.finger}:${barre.fret}`}><line x1={x(barre.from)} x2={x(barre.to)} y1={y(barre.fret)} y2={y(barre.fret)} className="diagram-barre" /><text x={(x(barre.from)+x(barre.to))/2} y={y(barre.fret)+3} textAnchor="middle" className="diagram-barre-finger">{barre.finger}</text></g>)}
    {shape.frets.map((fret,index) => {
      const string = index+1, isRoot = fret !== null && getPitch(string,fret,tuning).midi % 12 === chord.rootClass
      const cx = x(string), cy = fret === 0 || fret === null ? 21 : y(fret)
      return <g key={string} className={isRoot ? 'diagram-root' : 'diagram-member'}>
        {fret === null ? <text x={cx} y="26" textAnchor="middle">×</text> : fret === 0 ? <><circle cx={cx} cy={cy} r="5.5" className="diagram-open" />{isRoot && <circle cx={cx} cy={cy} r="8.5" className="diagram-ring" />}</> : <><circle cx={cx} cy={cy} r="7" />{isRoot && <circle cx={cx} cy={cy} r="10" className="diagram-ring" />}<text x={cx} y={cy+3} textAnchor="middle" className="diagram-finger">{shape.fingers[index]}</text></>}
      </g>
    })}
    {[6,5,4,3,2,1].map((string) => <text key={string} x={x(string)} y="178" textAnchor="middle" className="diagram-string">{string}</text>)}
  </svg>
}
