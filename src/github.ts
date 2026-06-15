import type { StarredRepository, SyncProgress } from './types'

const PER_PAGE = 100

type RawStarPayload = {
  starred_at?: string
  repo?: RawRepo
} & RawRepo

type RawRepo = {
  id: number
  name: string
  full_name: string
  owner?: { login?: string }
  html_url: string
  description: string | null
  language: string | null
  topics?: string[]
  stargazers_count?: number
  forks_count?: number
  open_issues_count?: number
  watchers_count?: number
  created_at?: string
  updated_at?: string
  pushed_at?: string
  archived?: boolean
  fork?: boolean
  disabled?: boolean
  private?: boolean
  license?: { spdx_id?: string; name?: string } | null
  homepage?: string | null
  default_branch?: string | null
  size?: number
}

export class GitHubApiError extends Error {
  status: number
  resetAt: Date | null

  constructor(message: string, status: number, resetAt: Date | null) {
    super(message)
    this.name = 'GitHubApiError'
    this.status = status
    this.resetAt = resetAt
  }
}

function parseLastPage(linkHeader: string | null) {
  if (!linkHeader) {
    return null
  }

  const lastLink = linkHeader
    .split(',')
    .map((part) => part.trim())
    .find((part) => part.endsWith('rel="last"'))

  if (!lastLink) {
    return null
  }

  const match = lastLink.match(/[?&]page=(\d+)/)
  return match ? Number(match[1]) : null
}

function normalizeStar(item: RawStarPayload): StarredRepository {
  const repo = item.repo ?? item

  return {
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    owner: repo.owner?.login ?? repo.full_name?.split('/')[0] ?? '',
    htmlUrl: repo.html_url,
    description: repo.description,
    language: repo.language,
    topics: Array.isArray(repo.topics) ? repo.topics : [],
    stargazersCount: repo.stargazers_count ?? 0,
    forksCount: repo.forks_count ?? 0,
    openIssuesCount: repo.open_issues_count ?? 0,
    watchersCount: repo.watchers_count ?? 0,
    createdAt: repo.created_at ?? null,
    updatedAt: repo.updated_at ?? null,
    pushedAt: repo.pushed_at ?? null,
    starredAt: item.starred_at ?? null,
    archived: Boolean(repo.archived),
    fork: Boolean(repo.fork),
    disabled: Boolean(repo.disabled),
    private: Boolean(repo.private),
    licenseName: repo.license?.spdx_id ?? repo.license?.name ?? null,
    homepage: repo.homepage ?? null,
    defaultBranch: repo.default_branch ?? null,
    size: repo.size ?? 0,
  }
}

async function fetchStarPage(username: string, page: number, token: string) {
  const headers: HeadersInit = {
    Accept: 'application/vnd.github.star+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }

  if (token.trim()) {
    headers.Authorization = `Bearer ${token.trim()}`
  }

  const response = await fetch(
    `https://api.github.com/users/${username}/starred?per_page=${PER_PAGE}&page=${page}`,
    { headers },
  )

  if (!response.ok) {
    const reset = response.headers.get('x-ratelimit-reset')
    const resetAt = reset ? new Date(Number(reset) * 1000) : null
    const body = await response.json().catch(() => null)
    const message =
      body?.message ??
      (response.status === 403
        ? 'GitHub API rate limit reached'
        : 'GitHub API request failed')

    throw new GitHubApiError(message, response.status, resetAt)
  }

  const payload = (await response.json()) as RawStarPayload[]
  const remaining = response.headers.get('x-ratelimit-remaining')

  return {
    repos: payload.map(normalizeStar),
    lastPage: parseLastPage(response.headers.get('link')),
    remaining,
  }
}

async function fetchFromLocalApi(
  username: string,
  token: string,
  onProgress?: (progress: SyncProgress) => void,
) {
  onProgress?.({ page: 1, lastPage: null, totalLoaded: 0, remaining: null })

  const headers: HeadersInit = {}
  if (token.trim()) {
    headers['X-GitHub-Token'] = token.trim()
  }

  const response = await fetch(`/api/starred?username=${encodeURIComponent(username)}`, { headers })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new GitHubApiError(body?.message ?? 'Local GitHub updater failed', response.status, null)
  }

  const payload = (await response.json()) as {
    repositories: StarredRepository[]
    pages?: number
    rateLimit?: { remaining?: string | null }
  }

  onProgress?.({
    page: payload.pages ?? 1,
    lastPage: payload.pages ?? null,
    totalLoaded: payload.repositories.length,
    remaining: payload.rateLimit?.remaining ?? null,
  })

  return payload.repositories
}

export async function fetchStarredRepositories(
  username: string,
  token = '',
  onProgress?: (progress: SyncProgress) => void,
) {
  const isLocalApp =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  let localError: unknown = null

  if (isLocalApp) {
    try {
      return await fetchFromLocalApi(username, token, onProgress)
    } catch (error) {
      localError = error
    }
  }

  const repos: StarredRepository[] = []
  let page = 1
  let lastPage: number | null = null

  try {
    do {
      const result = await fetchStarPage(username, page, token)
      repos.push(...result.repos)
      lastPage = result.lastPage ?? lastPage
      onProgress?.({
        page,
        lastPage,
        totalLoaded: repos.length,
        remaining: result.remaining,
      })

      if (!lastPage && result.repos.length < PER_PAGE) {
        break
      }

      page += 1
    } while (!lastPage || page <= lastPage)

    return repos
  } catch (error) {
    if (localError) {
      throw localError
    }
    throw error
  }
}
