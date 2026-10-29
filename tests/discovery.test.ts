import assert from 'node:assert/strict'
import test from 'node:test'
import { classifyRepo, curateRepos } from '../src/curation.ts'
import { buildLibrary, SCENARIOS, searchLibrary } from '../src/discovery.ts'
import type { StarredRepository } from '../src/types.ts'

function repository(overrides: Partial<StarredRepository> = {}): StarredRepository {
  return {
    id: 1, name: 'unknown-project', fullName: 'example/unknown-project', owner: 'example',
    htmlUrl: 'https://github.com/example/unknown-project', description: null, language: null,
    topics: [], stargazersCount: 10, forksCount: 0, openIssuesCount: 0, watchersCount: 10,
    createdAt: null, updatedAt: null, pushedAt: '2026-10-01T00:00:00Z', starredAt: null,
    archived: false, fork: false, disabled: false, private: false, licenseName: null,
    homepage: null, defaultBranch: 'main', size: 0, ...overrides,
  }
}

const tutor = repository({ id: 2, name: 'DeepTutor', fullName: 'HKUDS/DeepTutor', description: 'Lifelong Personalized Tutoring', topics: ['ai-agents', 'ai-tutor', 'rag'] })
const cloner = repository({ id: 3, name: 'ai-website-cloner-template', fullName: 'JCodesMore/ai-website-cloner-template', description: 'Clone any website with AI coding agents', topics: ['agent', 'react', 'website-clone'] })
const game = repository({ id: 4, name: 'nxnative', fullName: 'seedds/nxnative', description: 'Switch games running natively on iPhone, iPad and Mac', topics: ['agent'] })
const agent = repository({ id: 5, name: 'generic-agent', fullName: 'example/generic-agent', description: 'Autonomous coding agent', topics: ['ai-agents'] })

test('specific user tasks take priority over generic AI agent metadata', () => {
  assert.equal(classifyRepo(tutor).name, '教育/学习')
  assert.equal(classifyRepo(cloner).name, '网站复刻/设计提取')
  assert.equal(classifyRepo(game).name, '游戏/娱乐')
})

test('implementation language alone never invents a functional category', () => {
  for (const language of ['Swift', 'HTML', 'SQL', 'Python']) {
    assert.equal(classifyRepo(repository({ language })).name, '其他/待整理')
  }
})

test('few-shot visual learning research is distinct from language-model applications', () => {
  const repo = repository({ name: 'LibFewShot', description: 'A comprehensive library for few-shot learning', topics: ['computer-vision', 'meta-learning'] })
  assert.equal(classifyRepo(repo).name, '机器学习/计算机视觉')
})

test('specific description beats frontend and generic agent topics for design extraction', () => {
  const repo = repository({ name: 'dembrandt', description: 'Extract any website design system into tokens', topics: ['react', 'agent', 'typescript'] })
  assert.equal(classifyRepo(repo).name, '网站复刻/设计提取')
})

test('metadata-only evaluation states its evidence limit and does not pretend to have tested software', () => {
  const [repo] = buildLibrary([agent])
  assert.equal(repo.reviewed, false)
  assert.equal(repo.review.checkedAt, '')
  assert.match(repo.review.why, /简介与标签初筛/)
  assert(repo.review.caveats.some((caveat) => caveat.includes('未读取完整说明或进行功能实测')))
  assert.equal(repo.review.verdict, '按需使用')
})

test('unknown and archived projects are not given an eager recommendation', () => {
  const repos = buildLibrary([repository(), repository({ ...agent, archived: true })])
  assert.equal(repos[0].review.verdict, '先观望')
  assert.equal(repos[1].review.verdict, '先观望')
})

test('star counts are not a quality or recommendation score', () => {
  const [small, popular] = buildLibrary([agent, { ...agent, stargazersCount: 1000000 }])
  assert.deepEqual(small.review, popular.review)
  assert.equal(small.signalScore, popular.signalScore)
  assert(!curateRepos([{ ...agent, stargazersCount: 1000000 }])[0].curationNote.includes('社区验证'))
})

test('Chinese purpose search finds the three requested examples without generic agents', () => {
  const library = buildLibrary([agent, tutor, cloner, game])
  assert.equal(searchLibrary(library, '学习资料生成练习')[0]?.fullName, tutor.fullName)
  assert.equal(searchLibrary(library, '克隆网页')[0]?.fullName, cloner.fullName)
  assert.equal(searchLibrary(library, 'Switch 苹果 游戏')[0]?.fullName, game.fullName)
  assert(!searchLibrary(library, '克隆网页').some((repo) => repo.fullName === agent.fullName))
})

test('unrecognized words remain required, rather than broadening every query to AI', () => {
  const library = buildLibrary([agent, tutor, cloner, game])
  assert.equal(searchLibrary(library, '游戏 not-a-real-keyword').length, 0)
  assert.equal(searchLibrary(library, 'missing-project').length, 0)
})

test('an empty search preserves caller ordering and scenarios have stable unique IDs', () => {
  const library = buildLibrary([tutor, game])
  assert.equal(searchLibrary(library, '  '), library)
  assert.equal(new Set(SCENARIOS.map((scenario) => scenario.id)).size, 8)
  assert.deepEqual(SCENARIOS.map((scenario) => scenario.id), ['build-web', 'learn', 'gaming', 'content', 'automation', 'research', 'data', 'devices'])
})


test('technical tutorials and terminal emulators do not masquerade as school tutors or games', () => {
  const tutorial = repository({ name: 'learn-claude-code', description: 'Build a coding agent from scratch', topics: ['agent', 'educational', 'tutorial'] })
  assert.equal(classifyRepo(tutorial).name, '学习资料/清单')
  const terminal = repository({ name: 'terminal-app', description: 'Cross-platform terminal', topics: ['terminal-emulators', 'macos'] })
  assert.notEqual(classifyRepo(terminal).name, '游戏/娱乐')
  assert.equal(searchLibrary(buildLibrary([terminal]), 'Switch 苹果 游戏').length, 0)
})

test('a forecasting model is categorized by its time-series use rather than the generic word model', () => {
  const forecasting = repository({ name: 'forecast-model', description: 'A time-series foundation model for forecasting' })
  assert.equal(classifyRepo(forecasting).name, '数据/交易/金融')
})


test('a previously reviewed project is downgraded if the fresh snapshot reports it archived', () => {
  const [repo] = buildLibrary([{ ...tutor, archived: true }])
  assert.equal(repo.reviewed, true)
  assert.equal(repo.review.verdict, '先观望')
  assert(repo.review.caveats[0].includes('归档'))
})

test('plugin marketplaces are tool extensions rather than financial markets', () => {
  const pluginMarket = repository({ name: 'tool-market', description: 'A plugin market for an AI tool · 可视化插件市场', topics: ['marketplace', 'plugin'] })
  assert.equal(classifyRepo(pluginMarket).name, '自动化/MCP/工作流')
  assert.notEqual(classifyRepo(repository({ name: 'market' })).name, '数据/交易/金融')
  assert.equal(classifyRepo(repository({ description: 'Analyze the stock market with quantitative backtesting' })).name, '数据/交易/金融')
})

test('actual Chinese game and short-drama purposes outrank their frontend stacks and list format', () => {
  const remake = repository({ description: '大富翁4 重制版 App 源码（Vite + TypeScript + Capacitor iOS）' })
  assert.equal(classifyRepo(remake).name, '游戏/娱乐')
  const drama = repository({ name: 'awesome-short-drama-skills', description: 'AI 短剧 · 漫剧 Skill 精选：剧本、改编、分镜、视频提示词', topics: ['awesome', 'claude-code', 'codex', 'agent-skills'] })
  const [classified] = buildLibrary([drama])
  assert.equal(classified.category, '媒体/内容处理')
  assert.deepEqual(classified.review.scenarios, ['content'])
})

test('web recreation phrases with intervening words retain their specific purpose', () => {
  const cloning = repository({ description: 'Clone and recreate any website as a modern React app in seconds' })
  assert.equal(classifyRepo(cloning).name, '网站复刻/设计提取')
  const design = repository({ name: 'awesome-design-md', description: 'A collection of DESIGN.md files', topics: ['awesome-list', 'design-tokens', 'design-system'] })
  assert.equal(classifyRepo(design).name, '网站复刻/设计提取')
})

test('cultural map and astrology projects have useful but qualified interest categories', () => {
  const map = repository({ description: '中国历史交互地图时间轴 | Interactive Historical Atlas of China', topics: ['interactive-map'] })
  const astrology = repository({ description: '紫微斗数开源排盘引擎，含古籍原文数据', topics: ['astrology', 'nextjs'] })
  const [mapEntry, astrologyEntry] = buildLibrary([map, astrology])
  assert.equal(mapEntry.category, '教育/学习')
  assert.match(mapEntry.review.title, /地图与时间线/)
  assert.equal(astrologyEntry.category, '游戏/娱乐')
  assert(astrologyEntry.review.caveats.some((caveat) => caveat.includes('不能把排盘输出当作已验证')))
  assert.equal(astrologyEntry.reviewed, false)
})

test('the shorter Chinese task materials to questions still prioritizes DeepTutor', () => {
  const library = buildLibrary([agent, tutor, cloner, game])
  assert.equal(searchLibrary(library, '资料出题')[0]?.fullName, tutor.fullName)
})


test('category guidance does not fabricate exercise generation or short-drama capabilities in search', () => {
  const map = repository({ description: '中国历史交互地图时间轴 | Historical Atlas of China', topics: ['interactive-map'] })
  const video = repository({ description: 'A general video format conversion utility', topics: ['ffmpeg'] })
  const exerciseTutorial = repository({ description: 'Master programming by recreating technologies from scratch', topics: ['tutorial-exercises'] })
  const library = buildLibrary([tutor, map, video, exerciseTutorial])
  assert.deepEqual(searchLibrary(library, '资料出题').map((repo) => repo.fullName), [tutor.fullName])
  assert.equal(searchLibrary(library, '短剧').length, 0)
})

test('generated reviews replace pending metadata with their own category, value and provenance', async () => {
  const { EDITORIAL_REVIEWS } = await import('../src/reviews.ts')
  const { reviewEvidenceLabel } = await import('../src/discovery.ts')
  const generatedReview = {
    review: { ...structuredClone(EDITORIAL_REVIEWS['hkuds/deeptutor']), title: '围绕资料出题和复习的 AI 学习工具' },
    provenance: { model: 'Codex', promptVersion: 'v1', source: 'readme' as const, repositoryId: agent.id, pushedAt: agent.pushedAt, readmePath: 'README.md', readmeSha: 'a'.repeat(40), inputHash: 'b'.repeat(64), generatedAt: '2026-10-29T10:00:00Z' },
    sourceQuotes: ['Generate questions based on learning materials.'],
  }
  const catalog = { version: 1 as const, generatedAt: '2026-10-29T10:00:00Z', reviews: { [agent.fullName.toLowerCase()]: generatedReview } }
  const [entry] = buildLibrary([agent], catalog)
  assert.equal(entry.reviewSource, 'ai')
  assert.equal(entry.reviewed, true)
  assert.equal(entry.category, '教育/学习')
  assert.equal(entry.review.title, generatedReview.review.title)
  assert.equal(entry.generatedReview, generatedReview)
  assert.equal(reviewEvidenceLabel(entry), 'AI 评价 · 基于 README')
})

test('AI reviews based only on metadata are detailed but retain the limited-information label', async () => {
  const { EDITORIAL_REVIEWS } = await import('../src/reviews.ts')
  const { reviewEvidenceLabel } = await import('../src/discovery.ts')
  const limited = {
    review: structuredClone(EDITORIAL_REVIEWS['hkuds/deeptutor']),
    provenance: { model: 'Codex', promptVersion: 'v1', source: 'repository-metadata' as const, repositoryId: agent.id, pushedAt: agent.pushedAt, readmePath: null, readmeSha: null, inputHash: 'b'.repeat(64), generatedAt: '2026-10-29T10:00:00Z' },
    sourceQuotes: [],
  }
  const [entry] = buildLibrary([agent], { version: 1, generatedAt: '2026-10-29T10:00:00Z', reviews: { [agent.fullName]: limited } })
  assert.equal(entry.reviewed, true)
  assert.equal(entry.reviewSource, 'ai')
  assert.equal(reviewEvidenceLabel(entry), 'AI 评价 · 资料有限')
})

test('fresh generated reviews supersede legacy editorial text and stale names cannot change identities', async () => {
  const { EDITORIAL_REVIEWS } = await import('../src/reviews.ts')
  const template = {
    review: { ...structuredClone(EDITORIAL_REVIEWS['hkuds/deeptutor']), title: 'A newer generated review replaces legacy editorial work' },
    provenance: { model: 'Codex', promptVersion: 'v1', source: 'repository-metadata' as const, repositoryId: tutor.id, pushedAt: tutor.pushedAt, readmePath: null, readmeSha: null, inputHash: 'b'.repeat(64), generatedAt: '2026-10-29T10:00:00Z' },
    sourceQuotes: [],
  }
  const [editorial] = buildLibrary([tutor], { version: 1, generatedAt: '2026-10-29T10:00:00Z', reviews: { [tutor.fullName.toLowerCase()]: template } })
  assert.equal(editorial.reviewSource, 'ai')
  assert.equal(editorial.review.title, template.review.title)
  const [fallback] = buildLibrary([tutor])
  assert.equal(fallback.reviewSource, 'editorial')
  const [pending] = buildLibrary([agent], { version: 1, generatedAt: '2026-10-29T10:00:00Z', reviews: { [agent.fullName]: template } })
  assert.equal(pending.reviewSource, 'metadata')
  assert.equal(pending.reviewed, false)
})
