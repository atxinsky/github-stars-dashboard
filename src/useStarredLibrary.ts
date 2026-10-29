import { useEffect, useState } from 'react'
import { fetchStarredRepositories, GitHubApiError } from './github'
import { newestSnapshot, type SnapshotCache } from './snapshot'
import type { StarsSnapshot, SyncProgress } from './types'
import { newestReviewCatalog, parseReviewCatalog, type ReviewCatalog } from './reviewCatalog'

const CACHE_KEY = 'github-stars-dashboard:atxinsky:stars:v1'
const REVIEW_CACHE_KEY = 'github-stars-dashboard:atxinsky:reviews:v1'
const TOKEN_KEY = 'github-stars-dashboard:atxinsky:token'

function readStorage(key: string) {
  try { return localStorage.getItem(key) } catch { return null }
}

function cachedSnapshot(): SnapshotCache | null {
  try {
    const cached = JSON.parse(readStorage(CACHE_KEY) ?? 'null') as SnapshotCache | null
    return cached && Array.isArray(cached.repositories) ? cached : null
  } catch { return null }
}

function saveSnapshot(snapshot: SnapshotCache) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot)) } catch { /* Display remains available. */ }
}

function cachedReviewCatalog(): ReviewCatalog | null {
  try {
    const raw = readStorage(REVIEW_CACHE_KEY)
    return raw ? parseReviewCatalog(JSON.parse(raw)) : null
  } catch { return null }
}

function saveReviewCatalog(catalog: ReviewCatalog) {
  try { localStorage.setItem(REVIEW_CACHE_KEY, JSON.stringify(catalog)) } catch { /* Public reviews remain usable without persistent cache. */ }
}

export function useStarredLibrary() {
  const [snapshot, setSnapshot] = useState<SnapshotCache>(() => cachedSnapshot() ?? { generatedAt: null, repositories: [] })
  const [token, setToken] = useState(() => readStorage(TOKEN_KEY) ?? '')
  const [syncing, setSyncing] = useState(false)
  const [progress, setProgress] = useState<SyncProgress | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [reviewCatalog, setReviewCatalog] = useState<ReviewCatalog | null>(cachedReviewCatalog)
  const [reviewError, setReviewError] = useState('')
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [reviewRevision, setReviewRevision] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    fetch(`${import.meta.env.BASE_URL}stars-snapshot.json`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('暂时无法读取最新快照，请稍后重试同步。')
        return response.json() as Promise<StarsSnapshot>
      })
      .then((incoming) => {
        if (controller.signal.aborted || !Array.isArray(incoming.repositories)) return
        const next = newestSnapshot(cachedSnapshot(), incoming)
        saveSnapshot(next)
        setSnapshot((current) => newestSnapshot(current, next))
      })
      .catch((caught: unknown) => {
        if (!controller.signal.aborted && !cachedSnapshot()) setError(caught instanceof Error ? caught.message : '读取快照失败')
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    fetch(`${import.meta.env.BASE_URL}project-reviews.json`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('详细评价目录暂时无法读取')
        return parseReviewCatalog(await response.json())
      })
      .then((incoming) => {
        if (controller.signal.aborted) return
        const next = newestReviewCatalog(cachedReviewCatalog(), incoming)
        saveReviewCatalog(next)
        setReviewCatalog((current) => newestReviewCatalog(current, next))
        setReviewError('')
      })
      .catch(() => {
        if (!controller.signal.aborted) setReviewError('详细评价暂时无法更新，已保留现有评价；收藏、搜索和个人笔记仍可使用。')
      })
      .finally(() => { if (!controller.signal.aborted) setReviewsLoading(false) })
    return () => controller.abort()
  }, [reviewRevision])

  async function refresh() {
    setSyncing(true)
    setProgress(null)
    setError('')
    setReviewError('')
    setReviewsLoading(true)
    setReviewRevision((value) => value + 1)
    try {
      try {
        if (token.trim()) localStorage.setItem(TOKEN_KEY, token.trim())
        else localStorage.removeItem(TOKEN_KEY)
      } catch { /* A storage restriction must not block synchronization. */ }
      const repositories = await fetchStarredRepositories('atxinsky', token, setProgress)
      const next = { generatedAt: new Date().toISOString(), repositories }
      saveSnapshot(next)
      setSnapshot(next)
    } catch (caught) {
      const reset = caught instanceof GitHubApiError && caught.resetAt
        ? `，可在 ${caught.resetAt.toLocaleTimeString('zh-CN')} 后重试` : ''
      setError(`${caught instanceof Error ? caught.message : '同步失败'}${reset}`)
    } finally { setSyncing(false) }
  }

  return { snapshot, reviewCatalog, reviewError, reviewsLoading, token, setToken, syncing, progress, error, loading, refresh }
}
