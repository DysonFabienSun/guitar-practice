import { PAGES } from '../routes'
import type { PageId } from '../routes'

export default function Navigation({ current }: { current: PageId }) {
  return <nav className="navigation" aria-label="主导航">
    <div className="desktop-navigation">{PAGES.map((page) =>
      <a key={page.id} href={`#/${page.id}`} aria-current={current === page.id ? 'page' : undefined}>{page.title}</a>,
    )}</div>
    <label className="mobile-navigation">前往板块
      <select aria-label="板块导航" value={current} onChange={(event) => { window.location.hash = `/${event.target.value}` }}>
        {PAGES.map((page) => <option key={page.id} value={page.id}>{page.title}</option>)}
      </select>
    </label>
  </nav>
}
