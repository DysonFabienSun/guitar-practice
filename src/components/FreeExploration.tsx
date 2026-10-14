import { useEffect, useRef, useState } from 'react'
import { PluckPlayer } from '../audio'
import { getPitch, MAX_FRET } from '../pitch'
import type { SharedSettings } from '../useAppSettings'


const FRETS = Array.from({ length: MAX_FRET + 1 }, (_, fret) => fret)

export default function FreeExploration({ shared, active }: { shared: SharedSettings; active: boolean }) {
  const { tuning, tuningName: appliedName, soundEnabled, showNotes } = shared.preferences
  const player = useRef<PluckPlayer | null>(null)
  const playbackRequest = useRef(0)
  const [audioError, setAudioError] = useState('')
  const [selected, setSelected] = useState<{ stringNumber: number; fret: number } | null>(null)
  const [answerRevealed, setAnswerRevealed] = useState<number | null>(null)
  const pitch = selected ? getPitch(selected.stringNumber, selected.fret, tuning) : null
  const answerVisible = Boolean(selected && (showNotes || answerRevealed === shared.answerRevision))

  useEffect(() => {
    // 离开板块、切换调弦或声音设置时取消旧音和未完成的播放请求。
    ++playbackRequest.current
    player.current?.stop()
  }, [active, tuning, soundEnabled])
  useEffect(() => () => {
    ++playbackRequest.current
    player.current?.dispose()
    player.current = null
  }, [])

  async function selectPosition(stringNumber: number, fret: number) {
    setSelected({ stringNumber, fret })
    setAnswerRevealed(null)
    if (!soundEnabled) return
    const request = ++playbackRequest.current
    try {
      player.current ??= new PluckPlayer()
      const played = await player.current.play(getPitch(stringNumber, fret, tuning))
      if (played && request === playbackRequest.current) setAudioError('')
    } catch {
      if (request === playbackRequest.current) setAudioError('暂时无法播放声音，请检查浏览器声音权限后重试；仍可查看音名。')
    }
  }
  function revealAnswer() {
    if (!showNotes && selected) setAnswerRevealed(shared.answerRevision)
  }
  function handleRevealKey(event: React.KeyboardEvent<HTMLElement>) {
    if (!showNotes && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault()
      revealAnswer()
    }
  }
  return <>
        <section className="workspace" aria-labelledby="fretboard-title">
          <div className="workspace-header">
            <div><h2 id="fretboard-title">交互式吉他指板</h2><p>{appliedName} · 0—24 品</p></div>
            <div className="workspace-controls">
            <button type="button" className="sound-button" aria-pressed={soundEnabled} onClick={() => shared.setSoundEnabled(!soundEnabled)}>
              <span aria-hidden="true">{soundEnabled ? '♪' : '○'}</span> 声音{soundEnabled ? '开' : '关'}
            </button>
            <label className="toggle-label">
              <input type="checkbox" checked={showNotes} onChange={(event) => { shared.setShowNotes(event.target.checked) }} />
              <span className="toggle-track" aria-hidden="true"><span /></span>
              {showNotes ? '隐藏音名' : '显示音名'}
            </label>
            </div>
          </div>
          {soundEnabled && audioError && <p className="audio-error" role="status">{audioError}</p>}

          <div className="board-scroll" role="region" aria-label="六弦指板，可横向滚动" tabIndex={0}>
            <div className="board">
              <div className="fret-heading"><span>弦 / 品</span>{FRETS.map((fret) => <span key={fret} className={fret === 0 ? 'open-heading' : ''}>{fret}<small>{fret === 0 ? '空弦' : '品'}</small></span>)}</div>
              <div className="strings">
                {tuning.map((_, index) => {
                  const stringNumber = index + 1
                  return (
                    <div className={`string-row string-${stringNumber}`} key={stringNumber}>
                      <div className="string-label"><strong>{stringNumber} 弦</strong><span>{showNotes ? getPitch(stringNumber, 0, tuning).label : '—'}</span></div>
                      {FRETS.map((fret) => {
                        const note = getPitch(stringNumber, fret, tuning)
                        const active = selected?.stringNumber === stringNumber && selected.fret === fret
                        return <button key={fret} type="button" className={`fret-cell ${fret === 0 ? 'open-cell' : ''} ${active ? 'selected' : ''}`} aria-label={`第 ${stringNumber} 弦 ${fret} 品${showNotes ? `，${note.label}` : ''}`} aria-pressed={active} onClick={() => void selectPosition(stringNumber, fret)}><span className={`note ${showNotes || active ? '' : 'hidden-note'}`}>{showNotes ? note.noteName : active ? '●' : ''}</span></button>
                      })}
                    </div>
                  )
                })}
              </div>
              <div className="fret-markers" aria-hidden="true"><span />{FRETS.map((fret) => <span key={fret}>{[3, 5, 7, 9, 15, 17, 19, 21].includes(fret) ? '●' : [12, 24].includes(fret) ? '● ●' : ''}</span>)}</div>
            </div>
          </div>
          <div className="board-footer"><span><i /> 当前选中位置</span><span>0 品 = 空弦 <b>·</b> 每升一品，升高一个半音</span><span className="scroll-hint">左右滑动查看全部品位 ↔</span></div>
        </section>

        <section
          className="selection"
          aria-label={selected && answerVisible && pitch
            ? `第 ${selected.stringNumber} 弦 ${selected.fret} 品，${pitch.label}`
            : selected ? `第 ${selected.stringNumber} 弦 ${selected.fret} 品，点击查看答案` : '请先点击指板选择位置'}
          aria-live="polite"
          aria-atomic="true"
          role={!showNotes ? 'button' : undefined}
          tabIndex={!showNotes && selected ? 0 : undefined}
          aria-disabled={!showNotes && !selected ? true : undefined}
          onClick={revealAnswer}
          onKeyDown={handleRevealKey}
        >
          {selected ? <>
            <div className="selection-note"><span className="eyebrow">当前音高</span><div>{answerVisible && pitch ? <>{pitch.noteName}<span>{pitch.octave}</span></> : '?'}</div></div>
            <dl><div><dt>弦号</dt><dd>第 {selected.stringNumber} 弦</dd></div><div><dt>品位</dt><dd>{selected.fret} 品 {selected.fret === 0 && <small>空弦</small>}</dd></div>{answerVisible && pitch && <><div><dt>音名</dt><dd>{pitch.noteName}</dd></div><div><dt>八度</dt><dd>{pitch.octave}</dd></div></>}</dl>
            {!answerVisible && <p className="reveal-prompt">点击查看答案</p>}
          </> : <p className="empty-selection">请先点击指板选择位置</p>}
        </section>

        {!showNotes && <p className="guess-hint">先猜音名，再点击下方详情窗口核对。</p>}

        <aside className="tip"><span aria-hidden="true">✦</span><p><strong>试着找找看</strong> 同一根弦的 12 品比空弦高一个八度，音名相同。</p></aside>

  </>
}
