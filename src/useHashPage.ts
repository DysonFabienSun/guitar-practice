import { useEffect, useState } from 'react'
import { pageFromHash } from './routes'

export function useHashPage() {
  const [page, setPage] = useState(() => pageFromHash(window.location.hash))
  useEffect(() => {
    const update = () => setPage(pageFromHash(window.location.hash))
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])
  return page
}
