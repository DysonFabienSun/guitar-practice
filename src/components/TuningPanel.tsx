import { useState } from 'react'
import { getPitch, NOTE_OPTIONS, TUNING_PRESETS, validateTuning } from '../pitch'
import type { SharedSettings } from '../useAppSettings'

export default function TuningPanel({ shared, id }: { shared: SharedSettings; id: string }) {
  const { tuning, tuningId, tuningName: appliedName } = shared.preferences
  const [editingCustom, setEditingCustom] = useState(false)
  const tuningChoice = editingCustom ? 'custom' : tuningId
  const [draft, setDraft] = useState(() => tuning.map((open) => ({ noteName: open.noteName, octave: String(open.octave) })))
  const [tuningErrors, setTuningErrors] = useState<string[]>([])

  function chooseTuning(choice: string) {
    setTuningErrors([])
    setEditingCustom(choice === 'custom')
    if (choice === 'custom') {
      setDraft(tuning.map((open) => ({ noteName: open.noteName, octave: String(open.octave) })))
      return
    }
    const preset = TUNING_PRESETS.find((item) => item.id === choice)
    if (preset) shared.applyTuning(preset.tuning, preset.id, preset.label)
  }
  function applyCustomTuning(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = validateTuning(draft)
    setTuningErrors(result.errors)
    if (result.errors.length === 0) shared.applyTuning(result.tuning, 'custom', '自定义调弦')
  }
  return (
        <section className="tuning-panel" aria-labelledby={`${id}-title`}>
          <div className="tuning-panel-header">
            <h2 id={`${id}-title`}>选择调弦</h2>
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
  )
}
