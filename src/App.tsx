import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  AlertCircle,
  Archive,
  ArrowDownUp,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Code2,
  Download,
  ExternalLink,
  Filter,
  GitFork,
  GitPullRequest,
  KeyRound,
  Layers,
  RefreshCw,
  Search,
  Star,
  X,
  type LucideIcon,
} from 'lucide-react'
import './App.css'
import {
  compactNumber,
  countBy,
  curateRepos,
  formatDate,
  formatRelativeDays,
  getCategoryDefinition,
  type ActivityStatus,
  type CuratedRepository,
} from './curation'
import { fetchStarredRepositories, GitHubApiError } from './github'
import type { StarredRepository, StarsSnapshot, SyncProgress } from './types'

const USERNAME = 'atxinsky'
const CACHE_KEY = `github-stars-dashboard:${USERNAME}:stars:v1`
const TOKEN_KEY = `github-stars-dashboard:${USERNAME}:token`
const SELECTED_STATUSES: ActivityStatus[] = ['active', 'maintained', 'quiet', 'archived', 'fork']

type GroupMode = 'category' | 'language' | 'activity' | 'owner'
type SortMode = 'signal' | 'stars' | 'updated' | 'starred' | 'name'

type SnapshotCache = {
  generatedAt: string | null
  repositories: StarredRepository[]
}

const statusLabels: Record<ActivityStatus, string> = {
  active: '活跃',
  maintained: '维护中',
  quiet: '较久未更',
  archived: '已归档',
  fork: 'Fork',
}

const groupLabels: Record<GroupMode, string> = {
  category: '功能',
  language: '语言',
  activity: '状态',
  owner: '作者',
}

const statusIcons: Record<ActivityStatus, LucideIcon> = {
  active: CheckCircle2,
  maintained: CircleDot,
  quiet: AlertCircle,
  archived: Archive,
  fork: GitFork,
}

function loadCache(): SnapshotCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as SnapshotCache) : null
  } catch {
    return null
  }
}

function saveCache(cache: SnapshotCache) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
}

function sortRepos(repos: CuratedRepository[], sortMode: SortMode) {
  return [...repos].sort((a, b) => {
    if (sortMode === 'signal') {
      return b.signalScore - a.signalScore || b.stargazersCount - a.stargazersCount
    }

    if (sortMode === 'stars') {
      return b.stargazersCount - a.stargazersCount
    }

    if (sortMode === 'updated') {
      return new Date(b.pushedAt ?? 0).getTime() - new Date(a.pushedAt ?? 0).getTime()
    }

    if (sortMode === 'starred') {
      return new Date(b.starredAt ?? 0).getTime() - new Date(a.starredAt ?? 0).getTime()
    }

    return a.fullName.localeCompare(b.fullName)
  })
}

function groupRepos(repos: CuratedRepository[], groupMode: GroupMode) {
  const groups = new Map<string, CuratedRepository[]>()

  for (const repo of repos) {
    const key =
      groupMode === 'category'
        ? repo.category
        : groupMode === 'language'
          ? repo.language || 'Unknown'
          : groupMode === 'activity'
            ? statusLabels[repo.activityStatus]
            : repo.owner

    groups.set(key, [...(groups.get(key) ?? []), repo])
  }

  return [...groups.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
}

function percentage(part: number, total: number) {
  if (!total) {
    return 0
  }

  return Math.round((part / total) * 100)
}

function downloadJson(repositories: StarredRepository[], generatedAt: string | null) {
  const payload = {
    username: USERNAME,
    generatedAt,
    count: repositories.length,
    repositories,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${USERNAME}-github-stars.json`
  link.click()
  URL.revokeObjectURL(url)
}

function useBundledSnapshot(setSnapshot: (snapshot: SnapshotCache) => void) {
  useEffect(() => {
    const cached = loadCache()
    if (cached?.repositories.length) {
      setSnapshot(cached)
      return
    }

    fetch(`${import.meta.env.BASE_URL}stars-snapshot.json`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('snapshot unavailable')
        }
        return response.json() as Promise<StarsSnapshot>
      })
      .then((snapshot) => {
        setSnapshot({
          generatedAt: snapshot.generatedAt,
          repositories: snapshot.repositories ?? [],
        })
      })
      .catch(() => {
        setSnapshot({ generatedAt: null, repositories: [] })
      })
  }, [setSnapshot])
}

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon
  label: string
  value: string
  detail: string
}) {
  return (
    <section className="stat-card">
      <div className="stat-icon">
        <Icon size={18} aria-hidden="true" />
      </div>
      <div>
        <p className="meta-label">{label}</p>
        <strong>{value}</strong>
        <span>{detail}</span>
      </div>
    </section>
  )
}

function FilterButton({
  active,
  children,
  count,
  onClick,
}: {
  active: boolean
  children: ReactNode
  count: number
  onClick: () => void
}) {
  return (
    <button className={`filter-button ${active ? 'is-active' : ''}`} type="button" onClick={onClick}>
      <span>{children}</span>
      <strong>{count}</strong>
    </button>
  )
}

function RepoRow({
  repo,
  selected,
  onSelect,
}: {
  repo: CuratedRepository
  selected: boolean
  onSelect: () => void
}) {
  const StatusIcon = statusIcons[repo.activityStatus]

  return (
    <button
      aria-label={`选择 ${repo.fullName}`}
      aria-pressed={selected}
      className={`repo-row ${selected ? 'is-selected' : ''}`}
      data-repo-id={repo.id}
      type="button"
      onClick={onSelect}
    >
      <span className="repo-main">
        <span className="repo-title-line">
          <GitPullRequest size={16} aria-hidden="true" />
          <strong>{repo.fullName}</strong>
          {repo.archived ? <span className="tiny-tag">归档</span> : null}
        </span>
        <span className="repo-description">{repo.description || '没有简介'}</span>
        <span className="repo-tags">
          <span className="language-dot" data-language={repo.language || 'Unknown'} />
          <span>{repo.language || '未知'}</span>
          <span className="dot-separator" />
          <StatusIcon size={13} aria-hidden="true" />
          <span>{statusLabels[repo.activityStatus]}</span>
          {repo.topics.slice(0, 4).map((repoTopic) => (
            <span className="topic-tag" key={repoTopic}>
              {repoTopic}
            </span>
          ))}
        </span>
      </span>
      <span className="repo-metrics">
        <span>
          <Star size={14} aria-hidden="true" />
          {compactNumber(repo.stargazersCount)}
        </span>
        <span>
          <GitFork size={14} aria-hidden="true" />
          {compactNumber(repo.forksCount)}
        </span>
        <span>{formatRelativeDays(repo.pushedDaysAgo)}</span>
        <ChevronRight size={16} aria-hidden="true" />
      </span>
    </button>
  )
}

function DetailPanel({ repo }: { repo: CuratedRepository | null }) {
  if (!repo) {
    return (
      <aside className="detail-panel empty-panel">
        <BookOpen size={24} aria-hidden="true" />
        <h2>选择一个仓库</h2>
        <p>点一行查看功能分类、简介、活跃度、标签和链接。</p>
      </aside>
    )
  }

  const StatusIcon = statusIcons[repo.activityStatus]

  return (
    <aside className="detail-panel">
      <div className="detail-heading">
        <span className="detail-mark">
          <GitPullRequest size={20} aria-hidden="true" />
        </span>
        <div>
          <p className="meta-label">{repo.category}</p>
          <h2>{repo.name}</h2>
          <a href={repo.htmlUrl} target="_blank" rel="noreferrer">
            {repo.fullName}
            <ExternalLink size={13} aria-hidden="true" />
          </a>
        </div>
      </div>

      <p className="detail-description">{repo.description || '没有可用简介。'}</p>

      <div className="category-note">
        <p className="meta-label">功能判断</p>
        <strong>{repo.categoryDescription}</strong>
        <span>{repo.curationNote}</span>
      </div>

      <div className="signal-meter">
        <div>
          <span>参考分</span>
          <strong>{repo.signalScore}</strong>
        </div>
        <div className="meter-track" aria-hidden="true">
          <span style={{ width: `${repo.signalScore}%` }} />
        </div>
      </div>

      <dl className="detail-grid">
        <div>
          <dt>Stars</dt>
          <dd>{compactNumber(repo.stargazersCount)}</dd>
        </div>
        <div>
          <dt>Forks</dt>
          <dd>{compactNumber(repo.forksCount)}</dd>
        </div>
        <div>
          <dt>更新</dt>
          <dd>{formatDate(repo.pushedAt)}</dd>
        </div>
        <div>
          <dt>状态</dt>
          <dd>
            <StatusIcon size={14} aria-hidden="true" />
            {statusLabels[repo.activityStatus]}
          </dd>
        </div>
        <div>
          <dt>许可证</dt>
          <dd>{repo.licenseName || '未知'}</dd>
        </div>
        <div>
          <dt>默认分支</dt>
          <dd>{repo.defaultBranch || '未知'}</dd>
        </div>
      </dl>

      <div className="topic-cloud">
        {(repo.topics.length ? repo.topics : [repo.language || 'uncategorized']).map((repoTopic) => (
          <span key={repoTopic}>{repoTopic}</span>
        ))}
      </div>

      <div className="detail-actions">
        <a href={repo.htmlUrl} target="_blank" rel="noreferrer">
          <GitPullRequest size={16} aria-hidden="true" />
          GitHub
        </a>
        {repo.homepage ? (
          <a href={repo.homepage} target="_blank" rel="noreferrer">
            <ExternalLink size={16} aria-hidden="true" />
            Homepage
          </a>
        ) : null}
      </div>
    </aside>
  )
}

function App() {
  const [snapshot, setSnapshot] = useState<SnapshotCache>({ generatedAt: null, repositories: [] })
  const [query, setQuery] = useState('')
  const [language, setLanguage] = useState('All')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [topic, setTopic] = useState('All')
  const [groupMode, setGroupMode] = useState<GroupMode>('category')
  const [sortMode, setSortMode] = useState<SortMode>('signal')
  const [selectedStatuses, setSelectedStatuses] = useState<Set<ActivityStatus>>(new Set(SELECTED_STATUSES))
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) ?? '')
  const [showToken, setShowToken] = useState(false)

  useBundledSnapshot(setSnapshot)

  const curated = useMemo(() => curateRepos(snapshot.repositories), [snapshot.repositories])
  const languageCounts = useMemo(() => countBy(curated.map((repo) => repo.language || 'Unknown')), [curated])
  const categoryCounts = useMemo(() => countBy(curated.map((repo) => repo.category)), [curated])
  const statusCounts = useMemo(() => countBy(curated.map((repo) => repo.activityStatus)), [curated])
  const categoryRows = useMemo(
    () =>
      Object.entries(categoryCounts)
        .map(([name, count]) => ({ name, count, definition: getCategoryDefinition(name) }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    [categoryCounts],
  )
  const topicCounts = useMemo(() => {
    const topics = curated.flatMap((repo) => (repo.topics.length ? repo.topics : []))
    return Object.entries(countBy(topics)).sort((a, b) => b[1] - a[1]).slice(0, 12)
  }, [curated])

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return sortRepos(
      curated.filter((repo) => {
        const matchesQuery =
          !normalizedQuery ||
          [
            repo.fullName,
            repo.description ?? '',
            repo.language ?? '',
            repo.category,
            repo.categoryDescription,
            repo.curationNote,
            ...repo.topics,
          ]
            .join(' ')
            .toLowerCase()
            .includes(normalizedQuery)
        const matchesCategory = categoryFilter === 'All' || repo.category === categoryFilter
        const matchesLanguage = language === 'All' || (repo.language || 'Unknown') === language
        const matchesTopic = topic === 'All' || repo.topics.includes(topic)
        const matchesStatus = selectedStatuses.has(repo.activityStatus)
        return matchesQuery && matchesCategory && matchesLanguage && matchesTopic && matchesStatus
      }),
      sortMode,
    )
  }, [categoryFilter, curated, language, query, selectedStatuses, sortMode, topic])

  const groups = useMemo(() => groupRepos(filtered, groupMode), [filtered, groupMode])
  const selectedRepo = useMemo(
    () => filtered.find((repo) => repo.id === selectedId) ?? filtered[0] ?? null,
    [filtered, selectedId],
  )

  const topCategory = categoryRows[0]
  const designCount = categoryCounts['设计/UI/创意工具'] ?? 0
  const activeTotal = (statusCounts.active ?? 0) + (statusCounts.maintained ?? 0)

  async function refreshStars() {
    setIsSyncing(true)
    setError(null)
    setSyncProgress(null)

    try {
      if (token.trim()) {
        localStorage.setItem(TOKEN_KEY, token.trim())
      }

      const repositories = await fetchStarredRepositories(USERNAME, token, setSyncProgress)
      const next = { generatedAt: new Date().toISOString(), repositories }
      setSnapshot(next)
      saveCache(next)
      setSelectedId(repositories[0]?.id ?? null)
    } catch (caught) {
      if (caught instanceof GitHubApiError) {
        const reset = caught.resetAt ? ` Reset: ${caught.resetAt.toLocaleString()}` : ''
        setError(`${caught.message}.${reset}`)
      } else {
        setError(caught instanceof Error ? caught.message : 'Sync failed')
      }
    } finally {
      setIsSyncing(false)
    }
  }

  function toggleStatus(status: ActivityStatus) {
    setSelectedStatuses((current) => {
      const next = new Set(current)
      if (next.has(status)) {
        next.delete(status)
      } else {
        next.add(status)
      }
      return next.size ? next : new Set(SELECTED_STATUSES)
    })
  }

  const syncLabel = isSyncing
    ? syncProgress
      ? `Page ${syncProgress.page}${syncProgress.lastPage ? `/${syncProgress.lastPage}` : ''} · ${syncProgress.totalLoaded}`
      : '正在更新'
    : snapshot.generatedAt
      ? `最后更新 ${formatDate(snapshot.generatedAt)}`
      : '还没有加载快照'

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-icon">
            <Star size={20} aria-hidden="true" />
          </div>
          <div>
            <h1>{USERNAME} stars</h1>
            <p>{compactNumber(snapshot.repositories.length)} 个仓库</p>
          </div>
        </div>

        <div className="sidebar-section">
          <p className="meta-label">分组方式</p>
          <div className="segmented-control">
            {(['category', 'language', 'activity', 'owner'] as GroupMode[]).map((mode) => (
              <button
                className={groupMode === mode ? 'is-active' : ''}
                key={mode}
                type="button"
                onClick={() => setGroupMode(mode)}
              >
                {groupLabels[mode]}
              </button>
            ))}
          </div>
        </div>

        <div className="sidebar-section">
          <p className="meta-label">功能分类</p>
          <div className="filter-stack">
            <FilterButton
              active={categoryFilter === 'All'}
              count={curated.length}
              onClick={() => setCategoryFilter('All')}
            >
              全部功能
            </FilterButton>
            {categoryRows.slice(0, 10).map(({ name, count }) => (
              <FilterButton
                active={categoryFilter === name}
                count={count}
                key={name}
                onClick={() => setCategoryFilter(name)}
              >
                {name}
              </FilterButton>
            ))}
          </div>
        </div>

        <div className="sidebar-section">
          <p className="meta-label">状态</p>
          <div className="status-stack">
            {SELECTED_STATUSES.map((status) => {
              const Icon = statusIcons[status]
              return (
                <button
                  className={selectedStatuses.has(status) ? 'is-active' : ''}
                  key={status}
                  type="button"
                  onClick={() => toggleStatus(status)}
                >
                  <Icon size={15} aria-hidden="true" />
                  <span>{statusLabels[status]}</span>
                  <strong>{statusCounts[status] ?? 0}</strong>
                </button>
              )
            })}
          </div>
        </div>

        <div className="sidebar-section">
          <p className="meta-label">语言（辅助）</p>
          <div className="filter-stack">
            <FilterButton active={language === 'All'} count={curated.length} onClick={() => setLanguage('All')}>
              All
            </FilterButton>
            {Object.entries(languageCounts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .map(([name, count]) => (
                <FilterButton
                  active={language === name}
                  count={count}
                  key={name}
                  onClick={() => setLanguage(name)}
                >
                  {name}
                </FilterButton>
              ))}
          </div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="search-field">
            <Search size={17} aria-hidden="true" />
            <input
              aria-label="Search repositories"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索仓库、功能、主题"
              value={query}
            />
            {query ? (
              <button type="button" aria-label="清空搜索" onClick={() => setQuery('')}>
                <X size={15} aria-hidden="true" />
              </button>
            ) : null}
          </div>

          <div className="topbar-actions">
            <button className="ghost-button" type="button" onClick={() => setShowToken((value) => !value)}>
              <KeyRound size={16} aria-hidden="true" />
              Token
            </button>
            <button
              className="ghost-button"
              type="button"
              onClick={() => downloadJson(snapshot.repositories, snapshot.generatedAt)}
              disabled={!snapshot.repositories.length}
            >
              <Download size={16} aria-hidden="true" />
              导出
            </button>
            <button className="primary-button" type="button" onClick={refreshStars} disabled={isSyncing}>
              <RefreshCw className={isSyncing ? 'is-spinning' : ''} size={16} aria-hidden="true" />
              更新
            </button>
          </div>
        </header>

        {showToken ? (
          <div className="token-row">
            <KeyRound size={16} aria-hidden="true" />
            <input
              aria-label="GitHub token"
              onChange={(event) => setToken(event.target.value)}
              placeholder="GitHub token"
              type="password"
              value={token}
            />
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem(TOKEN_KEY)
                setToken('')
              }}
            >
              Clear
            </button>
          </div>
        ) : null}

        <section className="dashboard-head">
          <div>
            <p className="meta-label">来源 · github.com/{USERNAME}?tab=stars</p>
            <h2>Stars 功能索引</h2>
            <p>{syncLabel}</p>
          </div>
          <div className="sort-control">
            <ArrowDownUp size={16} aria-hidden="true" />
            <select
              aria-label="排序仓库"
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
            >
              <option value="signal">参考价值</option>
              <option value="stars">Stars</option>
              <option value="updated">最近更新</option>
              <option value="starred">最近收藏</option>
              <option value="name">名称</option>
            </select>
          </div>
        </section>

        {error ? (
          <div className="alert-row">
            <AlertCircle size={17} aria-hidden="true" />
            <span>{error}</span>
          </div>
        ) : null}

        <section className="stats-grid">
          <StatCard
            icon={Layers}
            label="已索引"
            value={compactNumber(curated.length)}
            detail={`${filtered.length} 个当前可见`}
          />
          <StatCard
            icon={Filter}
            label="最大功能类"
            value={topCategory?.name ?? '未知'}
            detail={`${percentage(topCategory?.count ?? 0, curated.length)}% 的收藏`}
          />
          <StatCard
            icon={Code2}
            label="设计类"
            value={`${designCount}`}
            detail="UI / 设计 / 创意工具"
          />
          <StatCard
            icon={CheckCircle2}
            label="可参考"
            value={`${percentage(activeTotal, curated.length)}%`}
            detail={`${activeTotal} 个活跃或维护中`}
          />
        </section>

        <section className="insights-row">
          <div className="insight-panel">
            <div className="panel-heading">
              <Filter size={16} aria-hidden="true" />
              <h3>功能分类</h3>
            </div>
            <div className="bar-list category-bar-list">
              {categoryRows.slice(0, 8).map(({ name, count, definition }) => (
                  <button
                    className={categoryFilter === name ? 'is-active' : ''}
                    key={name}
                    type="button"
                    onClick={() => setCategoryFilter(name)}
                  >
                    <span>
                      <strong>{name}</strong>
                      <small>{definition.description}</small>
                    </span>
                    <span className="bar-track" aria-hidden="true">
                      <span style={{ width: `${percentage(count, curated.length)}%` }} />
                    </span>
                    <strong>{count}</strong>
                  </button>
                ))}
            </div>
          </div>

          <div className="insight-panel">
            <div className="panel-heading">
              <Layers size={16} aria-hidden="true" />
              <h3>主题标签</h3>
            </div>
            <div className="topic-filter-cloud">
              <button className={topic === 'All' ? 'is-active' : ''} type="button" onClick={() => setTopic('All')}>
                全部
              </button>
              {topicCounts.map(([name, count]) => (
                <button
                  className={topic === name ? 'is-active' : ''}
                  key={name}
                  type="button"
                  onClick={() => setTopic(name)}
                >
                  {name}
                  <span>{count}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="content-grid">
          <section className="repo-list" aria-label="仓库列表">
            {groups.length ? (
              groups.map(([name, repos]) => (
                <section className="repo-group" key={name}>
                  <div className="group-heading">
                    <h3>{name}</h3>
                    <span>{repos.length}</span>
                  </div>
                  <div className="repo-group-list">
                    {repos.map((repo) => (
                      <RepoRow
                        key={repo.id}
                        repo={repo}
                        selected={repo.id === selectedRepo?.id}
                        onSelect={() => setSelectedId(repo.id)}
                      />
                    ))}
                  </div>
                </section>
              ))
            ) : (
              <section className="empty-state">
                <Search size={24} aria-hidden="true" />
                <h3>没有匹配的仓库</h3>
                <p>清空筛选或重新更新 GitHub 索引。</p>
              </section>
            )}
          </section>

          <DetailPanel repo={selectedRepo} />
        </div>
      </section>
    </main>
  )
}

export default App
