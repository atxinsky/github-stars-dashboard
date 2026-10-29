import { useDeferredValue, useMemo, useRef, useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, BookOpenCheck, Bookmark, CheckCircle2, ChevronDown, Clock3, Filter, FolderOpen, ExternalLink, ListFilter, Menu, RefreshCw, Search, Settings2, Star, X, XCircle } from 'lucide-react'
import './App.css'
import { LibraryCard } from './components/LibraryCard'
import { ProjectDetail } from './components/ProjectDetail'
import { compactNumber, countBy, formatDate } from './curation'
import { buildLibrary, SCENARIOS, searchLibrary, type LibraryRepository } from './discovery'
import { categoryIcon, SCENE_ICONS } from './icons'
import { loadPersonalLibrary, parsePersonalImport, PERSONAL_STATUS_LABELS, savePersonalLibrary, type PersonalEntry, type PersonalStatus } from './personal'
import { useStarredLibrary } from './useStarredLibrary'

type Collection = 'all' | 'reviewed' | Exclude<PersonalStatus, 'unmarked'>
type SortMode = 'editorial' | 'starred' | 'updated' | 'stars'
const FEATURED = ['hkuds/deeptutor', 'seedds/nxnative', 'jcodesmore/ai-website-cloner-template']
const CATEGORY_ORDER = ['AI 代理/编码助手', '教育/学习', '游戏/娱乐', '网站复刻/设计提取', '媒体/内容处理', '设计/UI/创意工具', '自动化/MCP/工作流', 'LLM 应用/RAG/模型', '数据/交易/金融', '移动/桌面应用', '开发工具/工程效率', '前端组件/网页产品', '学习资料/清单', '后端/基础设施', '安全/隐私', '其他/待整理']
const COLLECTIONS = [{ id: 'all', label: '全部收藏', icon: FolderOpen }, { id: 'try', label: '待尝试', icon: Clock3 }, { id: 'used', label: '已用过', icon: CheckCircle2 }, { id: 'skip', label: '暂不考虑', icon: XCircle }] as const

function downloadBackup(value: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `atxinsky-工具库-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function orderProjects(repos: LibraryRepository[], mode: SortMode) {
  return [...repos].sort((a, b) => {
    if (mode === 'starred') return Date.parse(b.starredAt ?? '') - Date.parse(a.starredAt ?? '')
    if (mode === 'updated') return Date.parse(b.pushedAt ?? '') - Date.parse(a.pushedAt ?? '')
    if (mode === 'stars') return b.stargazersCount - a.stargazersCount
    const aPinned = FEATURED.indexOf(a.fullName.toLowerCase())
    const bPinned = FEATURED.indexOf(b.fullName.toLowerCase())
    return (aPinned < 0 ? 100 : aPinned) - (bPinned < 0 ? 100 : bPinned)
      || Number(b.reviewed) - Number(a.reviewed)
      || Date.parse(b.starredAt ?? '') - Date.parse(a.starredAt ?? '')
  })
}

function App() {
  const { snapshot, reviewCatalog, reviewError, reviewsLoading, token, setToken, syncing, progress, error, loading, refresh } = useStarredLibrary()
  const [personal, setPersonal] = useState(loadPersonalLibrary)
  const personalRef = useRef(personal)
  const [personalRevision, setPersonalRevision] = useState(0)
  const [collection, setCollection] = useState<Collection>('all')
  const [category, setCategory] = useState('all')
  const [scenario, setScenario] = useState('all')
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [reviewedOnly, setReviewedOnly] = useState(false)
  const [sort, setSort] = useState<SortMode>('editorial')
  const [language, setLanguage] = useState('all')
  const [verdict, setVerdict] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showCategories, setShowCategories] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [mobileDetail, setMobileDetail] = useState(false)
  const [limit, setLimit] = useState(30)
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const library = useMemo(() => buildLibrary(snapshot.repositories, reviewCatalog), [snapshot.repositories, reviewCatalog])
  const ordered = useMemo(() => orderProjects(library, sort), [library, sort])
  const categories = useMemo(() => Object.entries(countBy(library.map((repo) => repo.category))).sort((a, b) => {
    const aRank = CATEGORY_ORDER.indexOf(a[0])
    const bRank = CATEGORY_ORDER.indexOf(b[0])
    return (aRank < 0 ? 99 : aRank) - (bRank < 0 ? 99 : bRank) || b[1] - a[1]
  }), [library])
  const languages = useMemo(() => [...new Set(library.map((repo) => repo.language).filter((item): item is string => Boolean(item)))].sort(), [library])
  const reviewedCount = library.filter((repo) => repo.reviewed).length
  const editorialCount = library.filter((repo) => repo.reviewSource === 'editorial').length
  const aiReadmeCount = library.filter((repo) => repo.reviewSource === 'ai' && repo.generatedReview?.provenance.source === 'readme').length
  const aiLimitedCount = library.filter((repo) => repo.reviewSource === 'ai' && repo.generatedReview?.provenance.source === 'repository-metadata').length
  const pendingCount = library.length - reviewedCount
  const personalCounts = useMemo(() => library.reduce((counts, repo) => {
    const state = personal[repo.id]?.status
    if (state && state !== 'unmarked') counts[state]++
    return counts
  }, { try: 0, used: 0, skip: 0 }), [library, personal])
  const results = useMemo(() => searchLibrary(ordered, deferredQuery).filter((repo) =>
    (collection === 'all' || collection === 'reviewed' && repo.reviewed || personal[repo.id]?.status === collection)
    && (category === 'all' || repo.category === category)
    && (scenario === 'all' || repo.review.scenarios.includes(scenario))
    && (!reviewedOnly || repo.reviewed)
    && (language === 'all' || repo.language === language)
    && (verdict === 'all' || repo.review.verdict === verdict)
  ), [ordered, deferredQuery, collection, personal, category, scenario, reviewedOnly, language, verdict])
  const selectedRepo = results.find((repo) => repo.id === selectedId) ?? results[0] ?? null
  const visibleResults = results.slice(0, limit)
  const isFiltered = query || category !== 'all' || scenario !== 'all' || collection !== 'all' || reviewedOnly || language !== 'all' || verdict !== 'all'

  function resetFilters() {
    setQuery(''); setCategory('all'); setScenario('all'); setCollection('all')
    setReviewedOnly(false); setLanguage('all'); setVerdict('all'); setLimit(30)
  }

  function chooseCollection(next: Collection) { resetFilters(); setCollection(next) }

  function savePersonal(repo: LibraryRepository, patch: Partial<Pick<PersonalEntry, 'status' | 'note'>>) {
    const current = personalRef.current
    const entry = current[repo.id] ?? { status: 'unmarked' as PersonalStatus, note: '', updatedAt: '' }
    const next = { ...current, [repo.id]: { ...entry, ...patch, updatedAt: new Date().toISOString() } }
    personalRef.current = next
    setPersonal(next)
    const saved = savePersonalLibrary(next)
    setMessage({ text: saved ? patch.note !== undefined ? '笔记已保存到当前浏览器。' : '收藏状态已保存。' : '当前浏览器无法保存记录，请及时导出备份。', error: !saved })
  }

  async function importBackup(file: File | undefined) {
    if (!file) return
    try {
      if (file.size > 25 * 1024 * 1024) throw new Error('备份文件过大，请选择小于 25 MB 的 JSON 文件。')
      const imported = parsePersonalImport(JSON.parse(await file.text()))
      const next = { ...personalRef.current, ...imported }
      personalRef.current = next
      setPersonal(next)
      setPersonalRevision((value) => value + 1)
      const saved = savePersonalLibrary(next)
      setMessage({ text: saved ? `已导入 ${Object.keys(imported).length} 条状态与笔记，同一项目以导入记录为准。` : '记录已载入，但浏览器无法持久保存，请保留备份。', error: !saved })
    } catch (caught) { setMessage({ text: caught instanceof Error ? caught.message : '导入失败，请检查备份格式。', error: true }) }
    if (fileInput.current) fileInput.current.value = ''
  }

  const currentTitle = category !== 'all' ? category : scenario !== 'all' ? SCENARIOS.find((item) => item.id === scenario)?.label : collection === 'all' ? '全部项目' : collection === 'reviewed' ? '有详细评价的项目' : PERSONAL_STATUS_LABELS[collection]

  return (
    <div className="library-shell">
      <aside className="library-sidebar">
        <div className="brand-lockup"><Star size={29} strokeWidth={1.8} /><div><strong>我的开源工具库</strong><p>atxinsky · GitHub 收藏</p></div></div>
        <nav className="collection-nav" aria-label="我的清单">
          {COLLECTIONS.map(({ id, label, icon: Icon }) => <button key={id} className={collection === id && category === 'all' && scenario === 'all' ? 'active' : ''} onClick={() => chooseCollection(id)}><Icon size={18} /><span>{label}</span><small>{id === 'all' ? library.length : personalCounts[id]}</small></button>)}
        </nav>
        <button className="mobile-category-toggle" onClick={() => setShowCategories(!showCategories)} aria-expanded={showCategories}><Menu size={16} />用途分类<ChevronDown size={14} /></button>
        <div className={`category-nav${showCategories ? ' show' : ''}`}><p className="nav-label">按用途浏览</p>{categories.map(([name, count]) => { const Icon = categoryIcon(name); return <button key={name} className={category === name ? 'active' : ''} onClick={() => { resetFilters(); setCategory(name); setShowCategories(false) }} title={name}><Icon size={17} /><span>{name}</span><small>{count}</small></button> })}</div>
        <div className="sidebar-bottom"><button onClick={() => chooseCollection('reviewed')}><BookOpenCheck size={16} />详细评价 <strong>{reviewedCount}/{library.length}</strong></button><p><RefreshCw size={13} />快照 {snapshot.generatedAt ? formatDate(snapshot.generatedAt) : '读取中'}</p><a href="https://github.com/atxinsky?tab=stars" target="_blank" rel="noreferrer"><ExternalLink size={15} />在 GitHub 查看收藏</a><button onClick={() => setShowSettings(!showSettings)}><Settings2 size={15} />同步与备份设置</button></div>
      </aside>

      <main className="library-workspace">
        <header className="workspace-header"><div><h1>让收藏，真正用起来。</h1><p>看懂价值，按场景找到下一个趁手工具。</p></div><div className="header-actions"><button className="icon-button mobile-settings" aria-label="同步与备份设置" onClick={() => setShowSettings(!showSettings)}><Settings2 size={17} /></button><button className="ghost-button" onClick={() => downloadBackup({ version: 1, username: 'atxinsky', generatedAt: snapshot.generatedAt, exportedAt: new Date().toISOString(), personal, repositories: library })} disabled={!library.length}><ArrowDownToLine size={16} />导出清单</button><button className="primary-button" disabled={syncing} onClick={() => void refresh()}><RefreshCw size={16} className={syncing ? 'is-spinning' : ''} />{syncing ? '同步中' : '同步收藏'}</button></div></header>

        {showSettings ? <section className="settings-panel"><div><h2>同步与备份</h2><button className="icon-button" onClick={() => setShowSettings(false)} aria-label="关闭设置"><X size={16} /></button></div><label>GitHub Token（可选）<input type="password" value={token} onChange={(event) => setToken(event.target.value)} autoComplete="off" placeholder="留空也可同步公开收藏；Token 可提高 API 额度" /></label><p>同步时仅向 GitHub 发出请求。Token 仅保存在当前浏览器，不包含在导出清单中。</p><button className="ghost-button" onClick={() => fileInput.current?.click()}><ArrowUpFromLine size={15} />导入状态与笔记备份</button><p>笔记和使用状态仅属于当前浏览器，不会提交到公开网站。导入会合并记录，同一项目采用导入的状态和笔记。</p></section> : null}
        <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={(event) => void importBackup(event.target.files?.[0])} />
        {error ? <div className="notice error-notice" role="alert">{error}</div> : null}
        {reviewError ? <div className="notice" role="status">{reviewError}</div> : null}
        {reviewsLoading && !reviewCatalog ? <div className="notice" role="status">正在读取项目详细评价…</div> : null}
        {syncing && progress ? <div className="notice" role="status">正在同步第 {progress.page}{progress.lastPage ? ` / ${progress.lastPage}` : ''} 页，已读取 {progress.totalLoaded} 个项目…</div> : null}
        {message ? <div className={`notice floating-notice${message.error ? ' error-notice' : ''}`} role={message.error ? 'alert' : 'status'}>{message.text}<button onClick={() => setMessage(null)} aria-label="关闭提示"><X size={14} /></button></div> : null}

        <div className="task-search"><Search size={22} /><input aria-label="按用途搜索项目" value={query} onChange={(event) => { setQuery(event.target.value); setLimit(30) }} placeholder="想做什么？试试「克隆网页」「资料出题」「Switch 游戏」" />{query ? <button className="icon-button" onClick={() => setQuery('')} aria-label="清空搜索"><X size={17} /></button> : null}<kbd>⌕</kbd></div>
        <nav className="scenario-nav" aria-label="我想做什么">{SCENARIOS.map((item) => { const Icon = SCENE_ICONS[item.id as keyof typeof SCENE_ICONS] ?? Bookmark; return <button key={item.id} className={scenario === item.id ? 'active' : ''} title={item.description} onClick={() => { resetFilters(); setScenario(scenario === item.id ? 'all' : item.id) }}><Icon size={17} />{item.label}</button> })}</nav>

        <div className="results-toolbar"><div className="results-title"><h2>{currentTitle}</h2><span>{compactNumber(results.length)}</span>{isFiltered ? <button className="reset-button" onClick={resetFilters}>重置筛选</button> : null}</div><div className="results-controls"><label className="reviewed-toggle"><input type="checkbox" checked={reviewedOnly} onChange={(event) => { setReviewedOnly(event.target.checked); setLimit(30) }} /><span className="toggle-track" />有详细评价</label><button className={`filter-trigger${showFilters ? ' active' : ''}`} onClick={() => setShowFilters(!showFilters)} aria-expanded={showFilters}><Filter size={15} /><span>筛选</span></button><label className="sort-control"><ListFilter size={15} /><select aria-label="项目排序" value={sort} onChange={(event) => setSort(event.target.value as SortMode)}><option value="editorial">优先看评价</option><option value="starred">最近收藏</option><option value="updated">最近更新</option><option value="stars">GitHub 热度</option></select></label></div></div>
        {showFilters ? <div className="advanced-filters"><label>编程语言<select aria-label="编程语言" value={language} onChange={(event) => { setLanguage(event.target.value); setLimit(30) }}><option value="all">全部语言</option>{languages.map((item) => <option key={item}>{item}</option>)}</select></label><label>采用建议<select aria-label="采用建议" value={verdict} onChange={(event) => { setVerdict(event.target.value); setLimit(30) }}><option value="all">全部建议</option>{['值得先试', '按需使用', '先观望'].map((item) => <option key={item}>{item}</option>)}</select></label><p>热度与维护记录只作参考，不代表软件质量。评价均保留来源；资料有限和待生成项目会单独标明。</p></div> : null}

        <div className="discovery-layout"><section className="project-results" aria-label="项目搜索结果" aria-busy={loading && !library.length}>
          {visibleResults.map((repo) => <LibraryCard key={repo.id} repo={repo} selected={selectedRepo?.id === repo.id} status={personal[repo.id]?.status ?? 'unmarked'} onSelect={() => { setSelectedId(repo.id); setMobileDetail(true) }} onTry={() => savePersonal(repo, { status: personal[repo.id]?.status === 'try' ? 'unmarked' : 'try' })} />)}
          {!results.length ? <div className="empty-results"><Search size={30} /><h2>{loading ? '正在读取你的收藏…' : collection === 'try' ? '把想试的项目，放进这里。' : collection === 'used' ? '记录用过的工具，下次更好找。' : collection === 'skip' ? '暂时不适合的项目，可以先放这里。' : '还没有找到匹配的项目'}</h2><p>{collection !== 'all' ? '在项目详情中设置「我的状态」，就能整理自己的使用清单。' : '试试更短的任务词，比如「克隆网页」「资料出题」或项目名。'}</p>{!loading ? <button className="ghost-button" onClick={resetFilters}>查看全部收藏</button> : null}</div> : null}
          {results.length > limit ? <button className="load-more" onClick={() => setLimit(limit + 30)}>再显示 {Math.min(30, results.length - limit)} 个项目 <ChevronDown size={15} /></button> : null}
          {results.length ? <p className="list-footnote">说明解读 {editorialCount} · AI 评价（README）{aiReadmeCount} · AI 评价（资料有限）{aiLimitedCount} · 待生成 {pendingCount}。评价基于资料分析，尚未部署实测。</p> : null}
        </section>
        {selectedRepo ? <ProjectDetail key={`${selectedRepo.id}-${personalRevision}`} repo={selectedRepo} entry={personal[selectedRepo.id]} mobileOpen={mobileDetail} onClose={() => setMobileDetail(false)} onSave={(patch) => savePersonal(selectedRepo, patch)} /> : <aside className="empty-detail"><BookOpenCheck size={32} /><h2>先找到，再看懂。</h2><p>项目的价值、使用场景、安装门槛和来源都会显示在这里。</p></aside>}
        </div>
        <footer className="workspace-footer"><span>基于 atxinsky 的公开收藏 · 最后更新 {snapshot.generatedAt ? formatDate(snapshot.generatedAt) : '—'}</span><button onClick={() => setShowSettings(true)}>导入备份</button></footer>
      </main>
    </div>
  )
}

export default App
