import { useEffect, useRef, useState } from 'react'
import { PluckPlayer } from './audio'
import { getPitch, MAX_FRET, NOTE_OPTIONS, STANDARD_TUNING, TUNING_PRESETS, validateTuning } from './pitch'
import type { Tuning } from './pitch'
import { applyTheme, readThemePreference, saveThemePreference, watchSystemTheme } from './theme'
import type { ThemePreference } from './theme'
import './App.css'

const FRETS = Array.from({ length: MAX_FRET + 1 }, (_, fret) => fret)

function App() {
  const [themePreference, setThemePreference] = useState<ThemePreference>(readThemePreference)
  const player = useRef<PluckPlayer | null>(null)
  const playbackRequest = useRef(0)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [audioError, setAudioError] = useState('')
  const [showNotes, setShowNotes] = useState(true)
  const [tuning, setTuning] = useState<Tuning>(STANDARD_TUNING)
  const [tuningChoice, setTuningChoice] = useState('standard')
  const [appliedName, setAppliedName] = useState('标准 EADGBE')
  const [draft, setDraft] = useState(() => STANDARD_TUNING.map((open) => ({ noteName: open.noteName, octave: String(open.octave) })))
  const [tuningErrors, setTuningErrors] = useState<string[]>([])
  const [answerRevealed, setAnswerRevealed] = useState(false)
  const [selected, setSelected] = useState<{ stringNumber: number; fret: number } | null>(null)
  const pitch = selected ? getPitch(selected.stringNumber, selected.fret, tuning) : null
  const answerVisible = Boolean(selected && (showNotes || answerRevealed))

  useEffect(() => {
    applyTheme(themePreference)
    return watchSystemTheme(themePreference)
  }, [themePreference])

  function chooseTheme(preference: ThemePreference) {
    saveThemePreference(preference)
    setThemePreference(preference)
  }

  useEffect(() => () => {
    ++playbackRequest.current
    player.current?.dispose()
    player.current = null
  }, [])

  async function selectPosition(stringNumber: number, fret: number) {
    setSelected({ stringNumber, fret })
    setAnswerRevealed(false)
    if (!soundEnabled) return
    const request = ++playbackRequest.current
    try {
      player.current ??= new PluckPlayer()
      const played = await player.current.play(getPitch(stringNumber, fret, tuning))
      if (played && request === playbackRequest.current) setAudioError('')
    } catch {
      if (request === playbackRequest.current) {
        setAudioError('暂时无法播放声音，请检查浏览器声音权限后重试；仍可查看音名。')
      }
    }
  }

  function revealAnswer() {
    if (!showNotes && selected) setAnswerRevealed(true)
  }

  function handleRevealKey(event: React.KeyboardEvent<HTMLElement>) {
    if (!showNotes && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault()
      revealAnswer()
    }
  }

  function toggleSound() {
    ++playbackRequest.current
    if (soundEnabled) player.current?.stop()
    setSoundEnabled(!soundEnabled)
    setAudioError('')
  }

  function applyTuning(next: Tuning, name: string) {
    ++playbackRequest.current
    player.current?.stop()
    setAudioError('')
    setTuning(next)
    setAppliedName(name)
    setAnswerRevealed(false)
    setTuningErrors([])
  }

  function chooseTuning(choice: string) {
    setTuningChoice(choice)
    setTuningErrors([])
    setAnswerRevealed(false)
    if (choice === 'custom') {
      setDraft(tuning.map((open) => ({ noteName: open.noteName, octave: String(open.octave) })))
      return
    }
    const preset = TUNING_PRESETS.find((item) => item.id === choice)
    if (preset) applyTuning(preset.tuning, preset.label)
  }

  function applyCustomTuning(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = validateTuning(draft)
    setTuningErrors(result.errors)
    if (result.errors.length === 0) applyTuning(result.tuning, '自定义调弦')
  }

  return (
    <div className="app">
      <header className="site-header">
        <a className="brand" href="#"><span className="brand-icon" aria-hidden="true">♬</span> Saguadlib <span className="brand-subtitle">GUITAR PRACTICE</span></a>
        <div className="header-controls">
          <label className="theme-control">主题
            <select aria-label="主题" value={themePreference} onChange={(event) => chooseTheme(event.target.value as ThemePreference)}>
              <option value="system">跟随系统</option>
              <option value="light">浅色</option>
              <option value="dark">深色</option>
            </select>
          </label>
          <span className="version">指板探索 · 01</span>
        </div>
      </header>

      <main>
        <div className="intro">
          <span className="eyebrow">认识你的指板</span>
          <h1>每一品，都有一个音。</h1>
          <p>从空弦开始，点击任意位置，探索六根弦上的音高。</p>
        </div>

        <section className="tuning-panel" aria-labelledby="tuning-title">
          <div className="tuning-panel-header">
            <h2 id="tuning-title">选择调弦</h2>
            <label>调弦方式 <select value={tuningChoice} onChange={(event) => chooseTuning(event.target.value)}>
              {TUNING_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
              <option value="custom">自定义调弦</option>
            </select></label>
          </div>
          <p className="applied-tuning">当前生效：{appliedName} · 从第 6 弦到第 1 弦</p>
          <div className="open-summary">{[6, 5, 4, 3, 2, 1].map((stringNumber) => <span key={stringNumber}><small>第 {stringNumber} 弦</small><strong>{getPitch(stringNumber, 0, tuning).label}</strong></span>)}</div>
          {tuningChoice === 'custom' && <form onSubmit={applyCustomTuning} noValidate>
            <p className="custom-hint">分别设置六根弦，点击“应用调弦”后生效。八度支持 0—6。</p>
            <div className="custom-strings">{draft.map((input, index) => <fieldset key={index}>
              <legend>第 {index + 1} 弦{index === 0 ? '（顶部）' : index === 5 ? '（底部）' : ''}</legend>
              <label>音名<select value={input.noteName} onChange={(event) => setDraft(draft.map((item, i) => i === index ? { ...item, noteName: event.target.value } : item))}>{NOTE_OPTIONS.map((name) => <option key={name}>{name}</option>)}</select></label>
              <label>八度<input type="number" min="0" max="6" step="1" value={input.octave} onChange={(event) => setDraft(draft.map((item, i) => i === index ? { ...item, octave: event.target.value } : item))} /></label>
            </fieldset>)}</div>
            {tuningErrors.length > 0 && <ul className="tuning-errors" role="alert">{tuningErrors.map((error) => <li key={error}>{error}</li>)}</ul>}
            <button className="sound-button apply-tuning" type="submit">应用调弦</button>
          </form>}
        </section>

        <section className="workspace" aria-labelledby="fretboard-title">
          <div className="workspace-header">
            <div><h2 id="fretboard-title">交互式吉他指板</h2><p>{appliedName} · 0—24 品</p></div>
            <div className="workspace-controls">
            <button type="button" className="sound-button" aria-pressed={soundEnabled} onClick={toggleSound}>
              <span aria-hidden="true">{soundEnabled ? '♪' : '○'}</span> 声音{soundEnabled ? '开' : '关'}
            </button>
            <label className="toggle-label">
              <input type="checkbox" checked={showNotes} onChange={(event) => { setShowNotes(event.target.checked); setAnswerRevealed(false) }} />
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
      </main>
      <footer className="site-footer"><span>Saguadlib · 一点一点，熟悉指板。</span><span>六弦指板 / 0—24 品</span></footer>
    </div>
  )
}

export default App
