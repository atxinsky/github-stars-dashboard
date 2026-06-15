import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const execFileAsync = promisify(execFile)
const perPage = 100
const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const basePath = process.env.GITHUB_ACTIONS && repositoryName ? `/${repositoryName}/` : '/'

type HeaderMap = Record<string, string>
type RateLimit = {
  limit: string | null
  remaining: string | null
  reset: string | null
}
type RawGitHubRepo = Record<string, unknown> & {
  owner?: { login?: string }
  license?: { spdx_id?: string; name?: string } | null
  topics?: unknown[]
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

function parseHeaders(headerBlock: string) {
  const headers = new Map<string, string>()
  for (const line of headerBlock.split(/\r?\n/).slice(1)) {
    const separator = line.indexOf(':')
    if (separator > -1) {
      headers.set(line.slice(0, separator).trim().toLowerCase(), line.slice(separator + 1).trim())
    }
  }
  return headers
}

async function curlRequest(url: string, headers: HeaderMap) {
  const args = ['-sS', '-D', '-']
  for (const [name, value] of Object.entries(headers)) {
    args.push('-H', `${name}: ${value}`)
  }
  args.push(url)

  const { stdout } = await execFileAsync('curl', args, { maxBuffer: 30 * 1024 * 1024 })
  const parts = stdout.split(/\r?\n\r?\n/)
  const body = parts.pop() || ''
  const headerBlock = [...parts].reverse().find((part) => /^HTTP\/\S+\s+\d+/.test(part)) || ''
  const statusMatch = headerBlock.match(/^HTTP\/\S+\s+(\d+)/)
  const status = statusMatch ? Number(statusMatch[1]) : 0
  const parsedHeaders = parseHeaders(headerBlock)

  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(name: string) {
        return parsedHeaders.get(name.toLowerCase()) || null
      },
    },
    async text() {
      return body
    },
    async json() {
      return JSON.parse(body)
    },
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function request(url: string, headers: HeaderMap) {
  const failure: { error: unknown } = { error: new Error('Request failed') }

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      return await fetch(url, { headers })
    } catch {
      try {
        return await curlRequest(url, headers)
      } catch (curlError) {
        failure.error = curlError
        if (attempt < 4) {
          await sleep(attempt * 900)
        }
      }
    }
  }

  throw failure.error
}

function stringField(repo: RawGitHubRepo, key: string) {
  const value = repo[key]
  return typeof value === 'string' ? value : null
}

function numberField(repo: RawGitHubRepo, key: string) {
  const value = repo[key]
  return typeof value === 'number' ? value : 0
}

function normalizeStar(item: Record<string, unknown>) {
  const repo =
    item.repo && typeof item.repo === 'object'
      ? (item.repo as RawGitHubRepo)
      : (item as RawGitHubRepo)
  const fullName = stringField(repo, 'full_name') || ''

  return {
    id: numberField(repo, 'id'),
    name: stringField(repo, 'name') || '',
    fullName,
    owner: repo.owner?.login || fullName.split('/')[0] || '',
    htmlUrl: stringField(repo, 'html_url') || '',
    description: stringField(repo, 'description'),
    language: stringField(repo, 'language'),
    topics: Array.isArray(repo.topics) ? repo.topics : [],
    stargazersCount: numberField(repo, 'stargazers_count'),
    forksCount: numberField(repo, 'forks_count'),
    openIssuesCount: numberField(repo, 'open_issues_count'),
    watchersCount: numberField(repo, 'watchers_count'),
    createdAt: stringField(repo, 'created_at'),
    updatedAt: stringField(repo, 'updated_at'),
    pushedAt: stringField(repo, 'pushed_at'),
    starredAt: typeof item.starred_at === 'string' ? item.starred_at : null,
    archived: repo.archived === true,
    fork: repo.fork === true,
    disabled: repo.disabled === true,
    private: repo.private === true,
    licenseName: repo.license?.spdx_id || repo.license?.name || null,
    homepage: stringField(repo, 'homepage'),
    defaultBranch: stringField(repo, 'default_branch'),
    size: numberField(repo, 'size'),
  }
}

async function fetchStarPage(username: string, page: number, token: string) {
  const headers: HeaderMap = {
    Accept: 'application/vnd.github.star+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'github-stars-dashboard',
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await request(
    `https://api.github.com/users/${username}/starred?per_page=${perPage}&page=${page}`,
    headers,
  )

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`GitHub API ${response.status}: ${body}`)
  }

  const payload = (await response.json()) as Array<Record<string, unknown>>

  return {
    repos: payload.map(normalizeStar),
    lastPage: parseLastPage(response.headers.get('link')),
    rateLimit: {
      limit: response.headers.get('x-ratelimit-limit'),
      remaining: response.headers.get('x-ratelimit-remaining'),
      reset: response.headers.get('x-ratelimit-reset'),
    },
  }
}

async function fetchAllStars(username: string, token: string) {
  const repositories = []
  let page = 1
  let lastPage: number | null = null
  const latest: { rateLimit: RateLimit | null } = { rateLimit: null }

  do {
    const result = await fetchStarPage(username, page, token)
    repositories.push(...result.repos)
    lastPage = result.lastPage || lastPage
    latest.rateLimit = result.rateLimit

    if (!lastPage && result.repos.length < perPage) {
      break
    }

    page += 1
  } while (!lastPage || page <= lastPage)

  return {
    username,
    generatedAt: new Date().toISOString(),
    source: `https://github.com/${username}?tab=stars`,
    count: repositories.length,
    pages: lastPage || page - 1,
    rateLimit: latest.rateLimit,
    repositories,
  }
}

function githubStarsApiPlugin(): Plugin {
  return {
    name: 'github-stars-api',
    configureServer(server) {
      server.middlewares.use('/api/starred', async (req, res) => {
        try {
          const url = new URL(req.url || '/', 'http://localhost')
          const username = url.searchParams.get('username') || 'atxinsky'
          const tokenHeader = req.headers['x-github-token']
          const token = Array.isArray(tokenHeader) ? tokenHeader[0] : tokenHeader || ''
          const snapshot = await fetchAllStars(username, token)

          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(snapshot))
        } catch (error) {
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              message: error instanceof Error ? error.message : 'Failed to update stars',
            }),
          )
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: basePath,
  plugins: [githubStarsApiPlugin(), react()],
})
