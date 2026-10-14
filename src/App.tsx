import { useEffect, useRef, useState } from 'react'
import { PluckPlayer } from './audio'
import { getPitch, STANDARD_TUNING } from './pitch'
import './App.css'

const FRETS = Array.from({ length: 13 }, (_, fret) => fret)

function App() {
  const player = useRef<PluckPlayer | null>(null)
  const playbackRequest = useRef(0)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [audioError, setAudioError] = useState('')
  const [showNotes, setShowNotes] = useState(true)
  const [selected, setSelected] = useState({ stringNumber: 6, fret: 0 })
  const pitch = getPitch(selected.stringNumber, selected.fret)

  useEffect(() => () => {
    ++playbackRequest.current
    player.current?.dispose()
    player.current = null
  }, [])

  async function selectPosition(stringNumber: number, fret: number) {
    setSelected({ stringNumber, fret })
    if (!soundEnabled) return
    const request = ++playbackRequest.current
    try {
      player.current ??= new PluckPlayer()
      const played = await player.current.play(getPitch(stringNumber, fret))
      if (played && request === playbackRequest.current) setAudioError('')
    } catch {
      if (request === playbackRequest.current) {
        setAudioError('暂时无法播放声音，请检查浏览器声音权限后重试；仍可查看音名。')
      }
    }
  }

  function toggleSound() {
    ++playbackRequest.current
    if (soundEnabled) player.current?.stop()
    setSoundEnabled(!soundEnabled)
    setAudioError('')
  }

  return (
    <div className="app">
      <header className="site-header">
        <a className="brand" href="#"><span className="brand-icon" aria-hidden="true">♬</span> 弦间 <span className="brand-subtitle">GUITAR PRACTICE</span></a>
        <span className="version">指板探索 · 01</span>
      </header>

      <main>
        <div className="intro">
          <span className="eyebrow">认识你的指板</span>
          <h1>每一品，都有一个音。</h1>
          <p>从空弦开始，点击任意位置，探索六根弦上的音高。</p>
        </div>

        <section className="workspace" aria-labelledby="fretboard-title">
          <div className="workspace-header">
            <div><h2 id="fretboard-title">交互式吉他指板</h2><p>标准调弦 <span className="tuning">E · A · D · G · B · E</span></p></div>
            <div className="workspace-controls">
            <button type="button" className="sound-button" aria-pressed={soundEnabled} onClick={toggleSound}>
              <span aria-hidden="true">{soundEnabled ? '♪' : '○'}</span> 声音{soundEnabled ? '开' : '关'}
            </button>
            <label className="toggle-label">
              <input type="checkbox" checked={showNotes} onChange={(event) => setShowNotes(event.target.checked)} />
              <span className="toggle-track" aria-hidden="true"><span /></span>
              {showNotes ? '隐藏音名' : '显示音名'}
            </label>
            </div>
          </div>
          {audioError && <p className="audio-error" role="status">{audioError}</p>}

          <div className="board-scroll" role="region" aria-label="六弦指板，可横向滚动" tabIndex={0}>
            <div className="board">
              <div className="fret-heading"><span>弦 / 品</span>{FRETS.map((fret) => <span key={fret} className={fret === 0 ? 'open-heading' : ''}>{fret}<small>{fret === 0 ? '空弦' : '品'}</small></span>)}</div>
              <div className="strings">
                {STANDARD_TUNING.map((_, index) => {
                  const stringNumber = index + 1
                  return (
                    <div className={`string-row string-${stringNumber}`} key={stringNumber}>
                      <div className="string-label"><strong>{stringNumber} 弦</strong><span>{getPitch(stringNumber, 0).label}</span></div>
                      {FRETS.map((fret) => {
                        const note = getPitch(stringNumber, fret)
                        const active = selected.stringNumber === stringNumber && selected.fret === fret
                        return <button key={fret} type="button" className={`fret-cell ${fret === 0 ? 'open-cell' : ''} ${active ? 'selected' : ''}`} aria-label={`第 ${stringNumber} 弦 ${fret} 品，${note.label}`} aria-pressed={active} onClick={() => void selectPosition(stringNumber, fret)}><span className={`note ${showNotes || active ? '' : 'hidden-note'}`}>{showNotes ? note.noteName : active ? '●' : ''}</span></button>
                      })}
                    </div>
                  )
                })}
              </div>
              <div className="fret-markers" aria-hidden="true"><span />{FRETS.map((fret) => <span key={fret}>{[3, 5, 7, 9].includes(fret) ? '●' : fret === 12 ? '● ●' : ''}</span>)}</div>
            </div>
          </div>
          <div className="board-footer"><span><i /> 当前选中位置</span><span>0 品 = 空弦 <b>·</b> 每升一品，升高一个半音</span><span className="scroll-hint">左右滑动查看全部品位 ↔</span></div>
        </section>

        <section className="selection" aria-label="选中位置详情" aria-live="polite" aria-atomic="true">
          <div className="selection-note"><span className="eyebrow">当前音高</span><div>{pitch.noteName}<span>{pitch.octave}</span></div></div>
          <dl><div><dt>弦号</dt><dd>第 {selected.stringNumber} 弦</dd></div><div><dt>品位</dt><dd>{selected.fret} 品 {selected.fret === 0 && <small>空弦</small>}</dd></div><div><dt>音名</dt><dd>{pitch.noteName}</dd></div><div><dt>八度</dt><dd>{pitch.octave}</dd></div></dl>
        </section>

        <aside className="tip"><span aria-hidden="true">✦</span><p><strong>试着找找看</strong> 点击第 5 弦第 3 品，你会找到 C3。同一根弦的 12 品比空弦高一个八度，音名相同。</p></aside>
      </main>
      <footer className="site-footer"><span>弦间 · 一点一点，熟悉指板。</span><span>标准六弦 / 0—12 品</span></footer>
    </div>
  )
}

export default App
