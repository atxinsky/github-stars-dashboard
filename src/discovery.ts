import { curateRepos, getCategoryDefinition, type CuratedRepository } from './curation.ts'
import { EDITORIAL_REVIEWS, type EditorialReview } from './reviews.ts'
import type { StarredRepository } from './types.ts'

export const SCENARIOS = [
  { id: 'build-web', label: '做网站', description: '从参考网页、设计系统到可以修改的前端。', keywords: ['网站', '网页', '落地页', '前端', '界面', 'website', 'frontend', 'design', 'clone'] },
  { id: 'learn', label: '学习辅导', description: '围绕教材、课程和问题找学习工具。', keywords: ['学习', '辅导', '教材', '课本', '练习', '课程', 'tutor', 'education', 'learning'] },
  { id: 'gaming', label: '游戏与娱乐', description: '游戏移植、跨设备游玩与娱乐探索。', keywords: ['游戏', '娱乐', 'switch', '任天堂', 'game', 'gaming', 'emulator'] },
  { id: 'content', label: '内容创作', description: '把文字、音视频和文档变成可交付的内容。', keywords: ['内容', '视频', '文章', '剪辑', '语音', '图片', 'video', 'audio', 'document', 'content'] },
  { id: 'automation', label: '自动化', description: '把重复操作交给工作流、代理和工具集成。', keywords: ['自动化', '工作流', '批量', '代理', 'mcp', 'automation', 'workflow', 'agent'] },
  { id: 'research', label: '知识与研究', description: '整理资料、搜索信息并构建知识库。', keywords: ['知识库', '研究', '资料', '论文', '检索', 'rag', 'research', 'knowledge'] },
  { id: 'data', label: '数据分析', description: '从数据图表到量化与业务分析。', keywords: ['数据', '分析', '图表', '量化', '交易', '股票', 'data', 'analytics', 'trading', 'chart'] },
  { id: 'devices', label: '设备工具', description: '找手机、Mac、桌面与设备维护工具。', keywords: ['手机', '设备', '安卓', '验机', '桌面', 'mac', 'android', 'iphone', 'desktop', 'device'] },
]

export type LibraryRepository = CuratedRepository & {
  review: EditorialReview
  reviewed: boolean
}

type CategoryGuide = {
  title: string
  scenarios: string[]
  bestFor: string[]
  caveat: string
  setup: EditorialReview['setup']
  effort: EditorialReview['effort']
}

const GUIDES: Record<string, CategoryGuide> = {
  'AI 代理/编码助手': { title: '让代理参与开发与任务执行', scenarios: ['automation'], bestFor: ['研究 AI 编码和任务执行方式', '寻找可接入现有流程的代理工具'], caveat: '需确认支持的模型、授权范围、API 费用和人工复核方式。', setup: '开发者工具', effort: '中' },
  'LLM 应用/RAG/模型': { title: '搭建知识检索或大模型应用', scenarios: ['research'], bestFor: ['整理知识与文档', '研究模型接入和知识检索'], caveat: '需确认模型接口、资料格式、部署资源与数据处理方式。', setup: '需要部署', effort: '高' },
  '设计/UI/创意工具': { title: '为界面与视觉设计寻找工具', scenarios: ['build-web', 'content'], bestFor: ['做界面原型和视觉表达', '寻找设计系统与创作工具'], caveat: '需确认实际输出格式、所需软件，以及素材的使用许可。', setup: '开发者工具', effort: '中' },
  '前端组件/网页产品': { title: '少写重复的网页界面代码', scenarios: ['build-web'], bestFor: ['搭建网页和交互原型', '选用可复用的前端组件'], caveat: '需核对框架版本、响应式与可访问性；现成界面不等于完整业务系统。', setup: '开发者工具', effort: '中' },
  '网站复刻/设计提取': { title: '把参考网页变成可修改的原型', scenarios: ['build-web'], bestFor: ['参考已有网站重建界面', '提取网页设计规范'], caveat: '需核对复刻范围和模型费用；登录、数据与后端功能通常需要另行实现。', setup: '开发者工具', effort: '中' },
  '开发工具/工程效率': { title: '减少开发与调试中的重复劳动', scenarios: ['automation'], bestFor: ['改善终端和研发工作流', '寻找调试与工程效率工具'], caveat: '需核对系统支持、安装方式和对现有项目的影响。', setup: '开发者工具', effort: '中' },
  '自动化/MCP/工作流': { title: '把多个工具串成可重复的流程', scenarios: ['automation'], bestFor: ['批量处理重复任务', '接入 MCP 或工作流工具'], caveat: '需确认可调用的服务、凭据权限及失败后的恢复机制。', setup: '开发者工具', effort: '中' },
  '数据/交易/金融': { title: '处理数据并辅助分析判断', scenarios: ['data'], bestFor: ['制作数据图表和分析看板', '研究数据处理与量化工具'], caveat: '需核对数据源和计算口径；开源与历史回测不代表收益或结论可靠。', setup: '需要部署', effort: '高' },
  '后端/基础设施': { title: '为应用准备后端与部署能力', scenarios: ['automation'], bestFor: ['搭建 API 和基础服务', '研究应用部署与数据服务'], caveat: '需评估服务器、运维、备份和安全配置成本。', setup: '需要部署', effort: '高' },
  '安全/隐私': { title: '研究权限、安全与隐私工具', scenarios: ['devices'], bestFor: ['排查权限和隐私问题', '研究安全工具的适用范围'], caveat: '需核对具体权限与运行范围；收藏或开源本身不能证明安全。', setup: '开发者工具', effort: '高' },
  '学习资料/清单': { title: '用资料与案例系统学习一个方向', scenarios: ['learn', 'research'], bestFor: ['查阅教程与项目清单', '建立某一技术方向的学习路径'], caveat: '资料集合不等于完整课程；需核对更新时间、原始来源与实践条件。', setup: '直接体验', effort: '低' },
  '教育/学习': { title: '寻找围绕材料与课程的学习工具', scenarios: ['learn'], bestFor: ['根据自己的材料辅助学习', '寻找教学与课程工具'], caveat: '需核对课程覆盖、模型费用与回答依据；学习效果还需实际试用。', setup: '需要部署', effort: '中' },
  '游戏/娱乐': { title: '探索游戏移植与跨设备游玩', scenarios: ['gaming'], bestFor: ['研究游戏移植和兼容性', '寻找个人娱乐工具'], caveat: '需核对具体游戏、设备和版本；项目简介不能证明全部游戏可用或达到特定帧率。', setup: '本地安装', effort: '高' },
  '移动/桌面应用': { title: '给手机与电脑补一项实用能力', scenarios: ['devices'], bestFor: ['寻找设备侧应用', '研究跨平台客户端'], caveat: '需确认操作系统、安装包签名、权限以及是否需要额外服务。', setup: '本地安装', effort: '中' },
  '媒体/内容处理': { title: '处理文档、音视频与创作素材', scenarios: ['content'], bestFor: ['整理和转换内容素材', '研究音视频与文档处理流程'], caveat: '需核对输入输出格式、模型费用和素材使用权限。', setup: '本地安装', effort: '中' },
}

function initialReview(repo: CuratedRepository): EditorialReview {
  const purpose = `${repo.description ?? ''} ${repo.topics.join(' ')}`.toLowerCase()
  let guide = GUIDES[repo.category]
  if (/plugins? (?:market|marketplace)|extension marketplace|插件(?:市场|商店|管理)/.test(purpose)) {
    guide = { title: '集中查找和安装工具插件', scenarios: ['automation'], bestFor: ['查找可用插件', '扩展现有工具的能力'], caveat: '需确认插件适配的宿主、版本和权限；插件市场不等于独立 AI 服务。', setup: '本地安装', effort: '中' }
  } else if (/historical (?:atlas|map)|历史.{0,10}(?:地图|时间轴)/.test(purpose)) {
    guide = { title: '把历史内容变成可探索的地图与时间线', scenarios: ['learn', 'research'], bestFor: ['按时间和地点探索历史', '寻找历史学习与文化资料的可视化参考'], caveat: '需核对史料来源、年代和地图边界说明，界面展示本身不代表历史结论已获验证。', setup: '需要部署', effort: '中' }
  } else if (/astrology|divination|fortune-telling|紫微斗数|术数|排盘/.test(purpose)) {
    guide = { title: '研究传统排盘规则与文化资料', scenarios: ['gaming'], bestFor: ['传统术数兴趣探索', '了解排盘程序与规则实现'], caveat: '属于传统文化与兴趣工具；不能把排盘输出当作已验证的预测方法或决策依据。', setup: '需要部署', effort: '中' }
  } else if (/短剧|漫剧|分镜|short[ -]drama|micro[ -]?drama/.test(purpose)) {
    guide = { title: '为短剧制作寻找剧本、分镜与技能素材', scenarios: ['content'], bestFor: ['寻找剧本和分镜的工作流参考', '选择可配合视频生成工具的技能素材'], caveat: '需核对每个技能依赖的模型和费用；技能清单本身不会自动生成完整成片。', setup: '开发者工具', effort: '中' }
  }
  const unavailable = repo.archived || repo.disabled
  return {
    title: guide ? `${repo.name}：${guide.title}` : `${repo.name}：用途还需要补充核实`,
    summary: repo.description || '仓库未填写简介。现有信息不足以判断功能，先查看 README 或演示再决定。',
    category: repo.category,
    scenarios: guide?.scenarios ?? [],
    verdict: unavailable || !guide ? '先观望' : '按需使用',
    why: unavailable
      ? '仓库已归档或被停用。可参考已有内容，采用前需要确认可用版本和维护接替。'
      : guide
        ? `仅按仓库简介与标签初筛：${getCategoryDefinition(repo.category).intent}具体效果与安装条件待核实。`
        : '仅凭当前简介与标签无法给出可靠评价，暂不把收藏数当成功能或质量证明。',
    bestFor: guide?.bestFor ?? ['先阅读项目说明，确认它解决什么问题'],
    caveats: [guide?.caveat ?? '功能、安装条件、费用与维护情况尚未核实。', '以上为仓库元数据初筛，未读取完整说明或进行功能实测。'],
    setup: guide?.setup ?? '开发者工具',
    effort: guide?.effort ?? '中',
    evidence: [{ label: '仓库简介与标签', url: repo.htmlUrl }],
    checkedAt: '',
    searchTerms: guide ? [...guide.bestFor, ...guide.scenarios.map((id) => SCENARIOS.find((scenario) => scenario.id === id)?.label ?? '')] : [],
  }
}

export function buildLibrary(repos: StarredRepository[]): LibraryRepository[] {
  return curateRepos(repos).map((repo) => {
    const editorial = EDITORIAL_REVIEWS[repo.fullName.toLowerCase()]
    const assessment = editorial ?? initialReview(repo)
    const review: EditorialReview = editorial && (repo.archived || repo.disabled)
      ? { ...assessment, verdict: '先观望', caveats: ['当前仓库已归档或停用，采用前先确认可用版本与维护接替。', ...assessment.caveats] }
      : assessment
    const category = getCategoryDefinition(review.category)
    return {
      ...repo,
      category: review.category,
      categoryDescription: category.description,
      categoryIntent: category.intent,
      curationNote: review.why,
      review,
      reviewed: Boolean(editorial),
    }
  })
}

type SearchConcept = { pattern: RegExp; terms: string[]; scenario?: string }

const SEARCH_CONCEPTS: SearchConcept[] = [
  { pattern: /克隆|复刻|仿站|clone|cloner/, terms: ['克隆', '复刻', '仿站', 'clone', 'cloner', '网站复刻/设计提取'] },
  { pattern: /网站|网页|落地页|前端|website|frontend/, terms: ['网站', '网页', '前端', 'website', 'frontend', 'webapp'], scenario: 'build-web' },
  { pattern: /学习|辅导|教材|课本|讲义|家教|私教|tutor|education/, terms: ['学习', '辅导', '教材', '课本', '讲义', 'tutor', 'education'], scenario: 'learn' },
  { pattern: /练习|出题|习题|试题|quiz|exercise/, terms: ['练习', '出题', '习题', '试题', 'quiz', 'exercise'] },
  { pattern: /出题|生成练习|生成试题|question generation|quiz generation/, terms: ['出题', '生成练习', '生成试题', 'question generation', 'quiz generation'] },
  { pattern: /游戏|任天堂|switch|gaming|game|模拟器/, terms: ['游戏', '任天堂', 'switch', 'gaming', 'game'], scenario: 'gaming' },
  { pattern: /苹果|apple|iphone|ipad|mac\b/, terms: ['苹果', 'apple', 'iphone', 'ipad', 'mac'] },
  { pattern: /短剧|漫剧|分镜|short[ -]drama|microdrama/, terms: ['短剧', '漫剧', '分镜', 'short drama', 'short-drama', 'microdrama', 'storyboard', 'screenwriting'] },
  { pattern: /视频|剪辑|video|movie/, terms: ['视频', '剪辑', 'video', 'movie', 'montage'] },
  { pattern: /语音|配音|转写|tts|speech|transcri/, terms: ['语音', '配音', '转写', 'tts', 'speech', 'transcri'] },
  { pattern: /知识库|检索|论文|research|knowledge|rag/, terms: ['知识库', '检索', '论文', 'research', 'knowledge', 'rag'], scenario: 'research' },
  { pattern: /自动化|工作流|批量|automation|workflow|mcp/, terms: ['自动化', '工作流', '批量', 'automation', 'workflow', 'mcp'], scenario: 'automation' },
  { pattern: /数据|分析|图表|量化|股票|交易|analytics|trading|chart/, terms: ['数据', '分析', '图表', '量化', '股票', '交易', 'data', 'analytics', 'trading', 'chart'], scenario: 'data' },
  { pattern: /手机|安卓|设备|验机|android|device/, terms: ['手机', '安卓', '设备', '验机', 'android', 'device'], scenario: 'devices' },
]

function searchableText(repo: LibraryRepository) {
  return [repo.fullName, repo.description, repo.category, repo.review.title, repo.review.summary,
    repo.review.why, ...repo.review.bestFor, ...repo.review.searchTerms, ...repo.topics]
    .filter(Boolean).join(' ').toLowerCase()
}

export function searchLibrary(repos: LibraryRepository[], query: string): LibraryRepository[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return repos
  const tokens = normalized.split(/\s+/).filter(Boolean)
  const concepts = SEARCH_CONCEPTS.filter((concept) => concept.pattern.test(normalized))

  return repos.map((repo, index) => {
    const text = searchableText(repo)
    // Generic category guidance is not evidence that a project has a specific feature.
    const evidenceText = [repo.fullName, repo.description, ...repo.topics, ...(repo.reviewed ? [repo.review.title, repo.review.summary, ...repo.review.bestFor, ...repo.review.searchTerms] : [])].filter(Boolean).join(' ').toLowerCase()
    const conceptScores = concepts.map((concept) => {
      const hits = concept.terms.filter((term) => evidenceText.includes(term)).length
      return hits || (concept.scenario && repo.review.scenarios.includes(concept.scenario)) ? Math.max(1, hits) : 0
    })
    const matchesConcepts = conceptScores.every((score) => score > 0)
    // A token without a known task meaning still has to occur literally.
    const namedPlatforms = new Set(['switch', 'iphone', 'ipad', 'mac', 'ios', 'android', 'mcp', 'rag'])
    const matchesTokens = tokens.every((token) => text.includes(token) || (!namedPlatforms.has(token) && SEARCH_CONCEPTS.some((concept) => concept.pattern.test(token))))
    const literalScore = tokens.reduce((score, token) => score + (text.includes(token) ? 12 : 0), 0)
    const score = (text.includes(normalized) ? 40 : 0) + literalScore + conceptScores.reduce((sum, value) => sum + value * 3, 0)
    return { repo, index, score, matches: matchesConcepts && matchesTokens && score > 0 }
  }).filter((result) => result.matches)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((result) => result.repo)
}
