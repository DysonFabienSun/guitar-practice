import { useMemo, useState } from 'react'
import { contains, rankedFingerings, fingeringPitches } from '../fingerings'
import type { Position, Fingering } from '../fingerings'
import type { Chord } from '../chords'
import type { Tuning } from '../pitch'
import FingeringDiagram from './FingeringDiagram'
const PAGE_SIZE = 6
export default function FingeringBrowser({ shapes, current, anchor, chord, tuning, onChoose }: { shapes: Fingering[]; current: Fingering | null; anchor: Position; chord: Chord; tuning: Tuning; onChoose: (shape: Fingering) => void }) {
  const [onlyAnchor,setOnlyAnchor] = useState(false)
  const [page,setPage] = useState(0)
  const ordered = useMemo(() => rankedFingerings(shapes,anchor,onlyAnchor),[shapes,anchor,onlyAnchor])
  const last = Math.max(0,Math.ceil(ordered.length / PAGE_SIZE)-1), shownPage = Math.min(page,last)
  return <section className="fingering-browser" aria-labelledby="fingering-browser-title">
    <h2 id="fingering-browser-title">候选指型</h2><p className="candidate-count">当前筛选共 {ordered.length} 个 · 总候选 {shapes.length} 个</p>
    <label className="candidate-filter"><input type="checkbox" checked={onlyAnchor} onChange={(event) => {setOnlyAnchor(event.target.checked);setPage(0)}} />仅含选中根音位置</label>
    <div className="fingering-cards">{ordered.slice(shownPage*PAGE_SIZE,(shownPage+1)*PAGE_SIZE).map((shape,index) => <button type="button" className={`fingering-card ${current?.id === shape.id ? 'fingering-active' : ''}`} key={shape.id} aria-label={`选择指型 ${shownPage*PAGE_SIZE+index+1}，6 到 1 弦 ${[...shape.frets].reverse().map((fret) => fret === null ? '不弹' : fret).join('、')}`} aria-pressed={current?.id === shape.id} onClick={() => onChoose(shape)}>
      <FingeringDiagram shape={shape} chord={chord} tuning={tuning} />
      <span className="shape-frets">{[...shape.frets].reverse().map((fret) => fret === null ? '×' : fret === 0 ? '○' : fret).join(' · ')}</span>
      <span>跨度 {shape.span} 品{contains(shape,anchor) ? ' · 含选中根音' : ''}</span>
      <span className="shape-sounds">{fingeringPitches(shape,tuning,chord).map((pitch) => pitch.label).join('、')}</span>
      {shape.omitted.length > 0 && <span>省略：{shape.omitted.join('、')}</span>}
    </button>)}</div>
    {!ordered.length && <p role="status">没有满足当前筛选条件的指型。</p>}
    {ordered.length > 0 && <div className="candidate-pages"><button type="button" className="plain-button" disabled={shownPage === 0} onClick={() => setPage(shownPage-1)}>上一页</button><span>{shownPage+1} / {last+1}</span><button type="button" className="plain-button" disabled={shownPage === last} onClick={() => setPage(shownPage+1)}>下一页</button></div>}
  </section>
}
