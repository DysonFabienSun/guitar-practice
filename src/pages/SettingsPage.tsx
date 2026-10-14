import type { SharedSettings } from '../useAppSettings'
import type { ThemePreference } from '../theme'
import TuningPanel from '../components/TuningPanel'

export default function SettingsPage({ shared }: { shared: SharedSettings }) {
  const { preferences } = shared
  return <>
    <div className="intro"><span className="eyebrow">你的练习偏好</span><h1>设置</h1><p>主题、调弦和声音设置在所有板块共用，并在此浏览器中保存。</p></div>
    <section className="settings-card" aria-labelledby="preferences-title">
      <h2 id="preferences-title">外观与声音</h2>
      <label className="setting-row">主题
        <select aria-label="主题" value={shared.themePreference} onChange={(event) => shared.chooseTheme(event.target.value as ThemePreference)}>
          <option value="system">跟随系统</option><option value="light">浅色</option><option value="dark">深色</option>
        </select>
      </label>
      <label className="setting-row">显示指板音名<input type="checkbox" checked={preferences.showNotes} onChange={(event) => shared.setShowNotes(event.target.checked)} /></label>
      <p className="setting-help">隐藏后先选择位置，再点击详情窗口揭晓答案。</p>
      <label className="setting-row">点击发声<input type="checkbox" checked={preferences.soundEnabled} onChange={(event) => shared.setSoundEnabled(event.target.checked)} /></label>
      <p className="setting-help">关闭声音仍可选择位置、查看或猜测音名。</p>
    </section>
    <TuningPanel key={JSON.stringify(preferences.tuning)} shared={shared} id="settings-tuning" />
    <section className="settings-card" aria-label="恢复默认设置">
      <h2>恢复默认设置</h2><p>恢复跟随系统、标准调弦、显示音名及开启声音。</p>
      <button className="sound-button" type="button" onClick={shared.resetSettings}>恢复默认设置</button>
    </section>
  </>
}
