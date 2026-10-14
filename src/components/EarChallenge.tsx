import { useEffect, useState, useSyncExternalStore } from 'react'
import { ANSWERS, QUESTION_COUNTS, summarize } from '../challenge'
import { ChallengeSession } from '../challengeSession'
import type { SharedSettings } from '../useAppSettings'

const FRETS = Array.from({ length: 13 }, (_, index) => index)
export default function EarChallenge({ shared }: { shared: SharedSettings }) {
  const { tuning, soundEnabled } = shared.preferences
  const [session] = useState(() => new ChallengeSession(tuning, soundEnabled))
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot)
  useEffect(() => { session.configure(tuning, soundEnabled) }, [session, tuning, soundEnabled])
  useEffect(() => () => session.deactivate(), [session])
  const submitted = state.results.length > state.index
  const result = submitted ? state.results[state.index] : null
  const summary = summarize(state.results)
  const auditionDisabled = !soundEnabled || !state.heard || state.audio === 'playing' || submitted
  return <section className="challenge-card" aria-labelledby="challenge-title">
    <h2 id="challenge-title">听音挑战</h2>
    <p>只判断音名，不判断八度。十二个半音均可出题，升降音等音答案都接受。</p>
    {!soundEnabled && <div className="challenge-notice" role="status"><p>当前全局静音。听音挑战需要声音，请先启用声音。</p><button className="sound-button" onClick={() => shared.setSoundEnabled(true)}>启用声音</button></div>}
    {state.message && <p role="status" className="challenge-notice">{state.message}</p>}
    {state.phase === 'setup' && <>
      <label className="setting-row">题数<select aria-label="挑战题数" value={state.count} onChange={(event) => session.setCount(Number(event.target.value))}>{QUESTION_COUNTS.map((count) => <option key={count} value={count}>{count} 题</option>)}</select></label>
      <p>答对 10 分；答对且未使用指板辅助，再奖励 5 分。重播目标音不算辅助。</p>
      <button className="sound-button" disabled={!soundEnabled} onClick={() => void session.start()}>开始挑战</button>
    </>}
    {state.phase === 'question' && <>
      <div className="challenge-actions"><strong>第 {state.index + 1} / {state.count} 题</strong><button className="sound-button" disabled={!soundEnabled || state.audio === 'playing'} onClick={() => void session.replay()}>重播目标音</button><button className="plain-button" onClick={() => session.exit()}>退出练习</button></div>
      <p role="status">{state.audio === 'playing' ? '正在启动播放…' : submitted ? '本题已提交，点击下一题或查看结算继续。' : !state.heard ? '等待目标音播放成功后再提交。' : '听音后选择音名，再点击提交答案。'} · {state.assisted ? '本题已使用辅助' : '本题未使用辅助'}</p>
      <fieldset className="answer-options" disabled={submitted}><legend>选择音名</legend>{ANSWERS.map((label, index) => <label key={label} className={state.answer === index ? 'answer-selected' : ''}><input type="radio" name="challenge-answer" value={index} checked={state.answer === index} onChange={() => session.choose(index)} />{label}</label>)}</fieldset>
      {!submitted && <button className="sound-button" disabled={state.answer === null || !state.heard || state.audio !== 'ready' || !soundEnabled} onClick={() => session.submit()}>提交答案</button>}
      {result && <div className={`challenge-feedback ${result.correct ? 'correct' : 'incorrect'}`} role="status"><h3>{result.correct ? '答对了' : '答错了'}</h3><p>正确答案：{ANSWERS[result.target.midi % 12]}；你的答案：{ANSWERS[result.answer]}</p><p>本题得分：{result.base + result.bonus} 分（基础 {result.base} + 独立听辨奖励 {result.bonus}） · {result.assisted ? '使用辅助' : '未使用辅助'}</p><button className="sound-button" onClick={() => void session.next()}>{state.index + 1 === state.count ? '查看结算' : '下一题'}</button></div>}
      <h3>辅助指板 · 0—12 品</h3><p>点击只试听，不提交答案，也不显示音名。使用后本题不再获得独立听辨奖励。</p>
      <div className="board-scroll" role="region" aria-label="听音挑战辅助指板，可横向滚动" tabIndex={0}><div className="board challenge-board"><div className="fret-heading"><span>弦 / 品</span>{FRETS.map((fret) => <span key={fret}>{fret}<small>{fret === 0 ? '空弦' : '品'}</small></span>)}</div><div className="strings">{tuning.map((_, index) => <div className={`string-row string-${index + 1}`} key={index}><div className="string-label"><strong>{index + 1} 弦</strong></div>{FRETS.map((fret) => <button type="button" className={`fret-cell ${fret === 0 ? 'open-cell' : ''}`} key={fret} aria-label={`试听第 ${index + 1} 弦 ${fret} 品`} disabled={auditionDisabled} onClick={() => void session.assist(index + 1, fret)}><span className="hidden-note" /></button>)}</div>)}</div></div></div>
    </>}
    {state.phase === 'complete' && <>
      <h3>练习结算</h3><dl className="challenge-summary"><div><dt>准确率</dt><dd>{summary.accuracy.toFixed(0)}%（{summary.correct}/{state.count}）</dd></div><div><dt>基础分</dt><dd>{summary.base}</dd></div><div><dt>独立听辨奖励</dt><dd>{summary.bonus}</dd></div><div><dt>总分</dt><dd>{summary.total}</dd></div></dl>
      <ol className="challenge-results">{state.results.map((item, index) => <li key={index}><strong>第 {index + 1} 题 · {item.correct ? '正确' : '错误'}</strong><p>正确答案：{ANSWERS[item.target.midi % 12]} · 你的答案：{ANSWERS[item.answer]} · {item.assisted ? '使用辅助' : '未使用辅助'} · {item.base + item.bonus} 分</p></li>)}</ol>
      <div className="challenge-actions"><button className="sound-button" disabled={!soundEnabled} onClick={() => void session.start()}>重新开始</button><button className="plain-button" onClick={() => session.exit()}>退出练习</button></div>
    </>}
  </section>
}
