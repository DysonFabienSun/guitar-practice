import { useState } from 'react'
import type { SharedSettings } from '../useAppSettings'
import TuningPanel from '../components/TuningPanel'
import FreeExploration from '../components/FreeExploration'
import EarChallenge from '../components/EarChallenge'

export default function FretboardPage({ shared, active }: { shared: SharedSettings; active: boolean }) {
  const [mode, setMode] = useState<'explore' | 'challenge'>('explore')
  return <>
    <div className="intro"><span className="eyebrow">认识你的指板</span><h1>指板与音准</h1><p>自由探索音高，或用听音挑战练习独立辨认音名。</p></div>
    <div className="practice-modes" role="group" aria-label="练习模式"><button className="plain-button" aria-pressed={mode === 'explore'} onClick={() => setMode('explore')}>自由探索</button><button className="plain-button" aria-pressed={mode === 'challenge'} onClick={() => setMode('challenge')}>听音挑战</button></div>
    <TuningPanel key={JSON.stringify(shared.preferences.tuning)} shared={shared} id="fretboard-tuning" />
    <div hidden={mode !== 'explore'}><FreeExploration shared={shared} active={active && mode === 'explore'} /></div>
    {mode === 'challenge' && active && <EarChallenge shared={shared} />}
  </>
}
