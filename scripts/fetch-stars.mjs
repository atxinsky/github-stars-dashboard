import { mkdir, writeFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import path from 'node:path'
import { promisify } from 'node:util'

const USERNAME = process.env.GITHUB_STARS_USER || 'atxinsky'
const TOKEN = process.env.GITHUB_TOKEN || ''
const OUTPUT = path.resolve('public/stars-snapshot.json')
const PER_PAGE = 100
const execFileAsync = promisify(execFile)

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function parseHeaders(headerBlock) {
  const headers = new Map()
  for (const line of headerBlock.split(/\r?\n/).slice(1)) {
    const separator = line.indexOf(':')
    if (separator > -1) {
      headers.set(line.slice(0, separator).trim().toLowerCase(), line.slice(separator + 1).trim())
    }
  }
  return headers
}

async function curlRequest(url, headers) {
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
      get(name) {
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

async function request(url, headers) {
  let lastError = null

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      return await fetch(url, { headers })
    } catch (error) {
      lastError = error
      try {
        return await curlRequest(url, headers)
      } catch (curlError) {
        lastError = curlError
        if (attempt < 4) {
          await sleep(attempt * 900)
        }
      }
    }
  }

  throw lastError
}

function parseLastPage(linkHeader) {
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

function normalizeStar(item) {
  const repo = item.repo || item

  return {
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    owner: repo.owner?.login || repo.full_name?.split('/')[0] || '',
    htmlUrl: repo.html_url,
    description: repo.description,
    language: repo.language,
    topics: Array.isArray(repo.topics) ? repo.topics : [],
    stargazersCount: repo.stargazers_count || 0,
    forksCount: repo.forks_count || 0,
    openIssuesCount: repo.open_issues_count || 0,
    watchersCount: repo.watchers_count || 0,
    createdAt: repo.created_at,
    updatedAt: repo.updated_at,
    pushedAt: repo.pushed_at,
    starredAt: item.starred_at || null,
    archived: Boolean(repo.archived),
    fork: Boolean(repo.fork),
    disabled: Boolean(repo.disabled),
    private: Boolean(repo.private),
    licenseName: repo.license?.spdx_id || repo.license?.name || null,
    homepage: repo.homepage || null,
    defaultBranch: repo.default_branch || null,
    size: repo.size || 0,
  }
}

async function fetchPage(page) {
  const headers = {
    Accept: 'application/vnd.github.star+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'github-stars-dashboard',
  }

  if (TOKEN) {
    headers.Authorization = `Bearer ${TOKEN}`
  }

  const response = await request(
    `https://api.github.com/users/${USERNAME}/starred?per_page=${PER_PAGE}&page=${page}`,
    headers,
  )

  if (!response.ok) {
    const body = await response.text()
    const reset = response.headers.get('x-ratelimit-reset')
    const resetText = reset
      ? ` Rate limit resets at ${new Date(Number(reset) * 1000).toISOString()}.`
      : ''
    throw new Error(`GitHub API ${response.status}: ${body}${resetText}`)
  }

  const payload = await response.json()
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

async function main() {
  const allRepos = []
  let page = 1
  let lastPage = null
  let rateLimit = null

  do {
    const result = await fetchPage(page)
    allRepos.push(...result.repos)
    lastPage = result.lastPage || lastPage
    rateLimit = result.rateLimit
    console.log(`Fetched page ${page}${lastPage ? `/${lastPage}` : ''}`)

    if (!lastPage && result.repos.length < PER_PAGE) {
      break
    }

    page += 1
  } while (!lastPage || page <= lastPage)

  const snapshot = {
    username: USERNAME,
    generatedAt: new Date().toISOString(),
    source: `https://github.com/${USERNAME}?tab=stars`,
    count: allRepos.length,
    rateLimit,
    repositories: allRepos,
  }

  await mkdir(path.dirname(OUTPUT), { recursive: true })
  await writeFile(OUTPUT, `${JSON.stringify(snapshot, null, 2)}\n`)
  console.log(`Wrote ${allRepos.length} repositories to ${OUTPUT}`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
