import type { StarredRepository } from './types.ts'

export type ActivityStatus = 'active' | 'maintained' | 'quiet' | 'archived' | 'fork'

export type CategoryDefinition = {
  name: string
  description: string
  intent: string
  keywords: string[]
}

export type CuratedRepository = StarredRepository & {
  activityStatus: ActivityStatus
  category: string
  categoryDescription: string
  categoryIntent: string
  curationNote: string
  signalScore: number
  pushedDaysAgo: number | null
}

const DAY = 24 * 60 * 60 * 1000

export const CATEGORY_DEFINITIONS: CategoryDefinition[] = [
  {
    name: '机器学习/计算机视觉',
    description: '传统机器学习、小样本学习、图像识别与视觉研究工具。',
    intent: '适合比较机器学习算法、复现实验和构建图像识别流程。',
    keywords: ['few-shot learning', 'meta-learning', 'computer vision', 'image classification', 'object detection', '小样本学习', '图像分类', '目标检测', '计算机视觉'],
  },
  {
    name: '游戏/娱乐',
    description: '游戏移植、模拟器、游戏引擎与个人娱乐工具。',
    intent: '适合找游戏移植、在不同设备上玩游戏，以及研究游戏兼容性。',
    keywords: ['game', 'games', 'gaming', 'emulator', 'nintendo', 'switch games', '游戏', '模拟器', '大富翁', 'astrology', 'divination', '术数', '排盘'],
  },
  {
    name: '教育/学习',
    description: '围绕教材、课程、练习与个性化辅导的学习工具。',
    intent: '适合寻找学习辅导、课程练习和教育内容工具。',
    keywords: ['tutor', 'tutoring', 'ai-tutor', 'education', 'educational', 'homework', 'curriculum', 'learning platform', 'personalized learning', '辅导', '教材', '课本', '教学', '蒙特梭利', 'historical atlas', 'historical map', '历史地图'],
  },
  {
    name: '网站复刻/设计提取',
    description: '参考已有网站重建界面，或提取网页的设计系统与样式。',
    intent: '适合把参考网页转成可修改的前端原型，或提取设计规范。',
    keywords: ['website-clone', 'website cloner', 'clone any website', 'website cloning', 'design extraction', 'design system extraction', 'design tokens', '网站复刻', '网页复刻', '克隆网站', '仿站', '设计提取'],
  },
  {
    name: 'AI 代理/编码助手',
    description: '能自主执行任务、写代码、调用工具、操作浏览器或终端的 agent 项目。',
    intent: '适合跟踪 AI agent、Claude Code、Codex、自动编码和任务执行框架。',
    keywords: [
      'agent',
      'agents',
      'ai-agent',
      'ai-agents',
      'coding-agent',
      'claude-code',
      'codex',
      'computer-use',
      'browser-use',
      'autonomous',
      'assistant',
      'multiagent',
      'multi-agent',
    ],
  },
  {
    name: 'LLM 应用/RAG/模型',
    description: '围绕大模型应用、RAG、推理、向量检索、模型服务和提示词工程的项目。',
    intent: '适合构建聊天、知识库、检索增强、模型接入和 LLM 应用基础能力。',
    keywords: [
      'llm',
      'rag',
      'langchain',
      'semantic-kernel',
      'openai',
      'ollama',
      'transformers',
      'embedding',
      'embeddings',
      'chatbot',
      'inference',
      'fine-tuning',
      'prompt',
      'vector',
      'retrieval',
      'huggingface',
      'model',
    ],
  },
  {
    name: '设计/UI/创意工具',
    description: '设计系统、Figma、原型、图形编辑、图标、动画、图片/视频和创意界面工具。',
    intent: '适合找设计灵感、UI 组件审美、原型工具、视觉编辑器和创意生产工具。',
    keywords: [
      'design',
      'figma',
      'ui',
      'ux',
      'prototype',
      'wireframe',
      'canvas',
      'whiteboard',
      'animation',
      'motion',
      'three',
      '3d',
      'svg',
      'icon',
      'icons',
      'drawing',
      'creative',
      'graphics',
    ],
  },
  {
    name: '前端组件/网页产品',
    description: '前端框架、组件库、Web UI、页面模板、仪表盘和浏览器端产品。',
    intent: '适合快速搭网页、做组件、看产品界面结构和前端工程实践。',
    keywords: [
      'react',
      'next',
      'vue',
      'svelte',
      'vite',
      'frontend',
      'component',
      'components',
      'shadcn',
      'tailwind',
      'css',
      'html',
      'dashboard',
      'webapp',
      'web-app',
      'website',
    ],
  },
  {
    name: '开发工具/工程效率',
    description: 'CLI、终端、调试、测试、编辑器、构建工具和日常研发提效工具。',
    intent: '适合提升开发流程、调试效率、代码质量和本地工程体验。',
    keywords: [
      'cli',
      'terminal',
      'developer-tools',
      'tooling',
      'devtools',
      'debug',
      'testing',
      'test',
      'lint',
      'git',
      'editor',
      'ide',
      'vscode',
      'compiler',
      'build',
    ],
  },
  {
    name: '自动化/MCP/工作流',
    description: 'MCP、浏览器自动化、工作流编排、集成、爬取和重复任务自动处理。',
    intent: '适合把多个工具串起来，做自动执行、数据抓取、浏览器操作和流程编排。',
    keywords: [
      'automation',
      'workflow',
      'mcp',
      'scheduler',
      'orchestration',
      'integration',
      'browser',
      'scraper',
      'crawler',
      'rpa',
      'bot',
    ],
  },
  {
    name: '数据/交易/金融',
    description: '数据处理、分析、可视化、量化、交易、金融市场、加密和回测项目。',
    intent: '适合做市场研究、量化策略、数据管道、分析看板和交易相关工具。',
    keywords: [
      'data',
      'database',
      'sql',
      'analytics',
      'visualization',
      'chart',
      'etl',
      'finance',
      'financial',
      'trading',
      'stock',
      'quant',
      'backtest',
      'crypto',
      'bitcoin',
      'ethereum',
      'defi',
    ],
  },
  {
    name: '后端/基础设施',
    description: 'API、服务端、部署、数据库、容器、云服务、队列、监控和基础设施。',
    intent: '适合搭后端服务、部署系统、管数据服务和研究工程架构。',
    keywords: [
      'backend',
      'api',
      'server',
      'docker',
      'kubernetes',
      'cloud',
      'deploy',
      'postgres',
      'redis',
      'queue',
      'microservice',
      'observability',
      'infra',
    ],
  },
  {
    name: '安全/隐私',
    description: '认证、加密、隐私保护、沙箱、漏洞研究、逆向和安全工程项目。',
    intent: '适合跟踪安全基础能力、权限系统、隐私保护和攻防研究工具。',
    keywords: [
      'security',
      'privacy',
      'auth',
      'authentication',
      'oauth',
      'encryption',
      'malware',
      'reverse-engineering',
      'pentest',
      'sandbox',
      'secret',
    ],
  },
  {
    name: '学习资料/清单',
    description: 'awesome 清单、教程、课程、示例、论文、路线图和参考资料。',
    intent: '适合系统学习、收藏资料、查案例和做技术方向调研。',
    keywords: [
      'awesome',
      'book',
      'course',
      'tutorial',
      'guide',
      'examples',
      'reference',
      'learning',
      'papers',
      'roadmap',
      'interview',
    ],
  },
  {
    name: '移动/桌面应用',
    description: 'iOS、Android、跨平台、Electron/Tauri 和桌面客户端相关项目。',
    intent: '适合做移动端、桌面端、跨平台客户端和设备侧应用。',
    keywords: [
      'ios',
      'android',
      'react-native',
      'flutter',
      'mobile',
      'swift',
      'kotlin',
      'desktop',
      'electron',
      'tauri',
    ],
  },
  {
    name: '媒体/内容处理',
    description: '音视频、语音、转写、文档、Markdown、PDF 和内容生产/处理工具。',
    intent: '适合处理内容资产、文档转换、音视频流水线和发布素材。',
    keywords: [
      'audio',
      'music',
      'image',
      'video',
      'downloader',
      'download',
      'ffmpeg',
      'youtube',
      'transcription',
      'tts',
      'speech',
      'pdf',
      'document',
      'markdown',
      'content',
      'podcast',
      '短剧',
      '漫剧',
      '分镜',
      'screenwriting',
      'storyboard',
    ],
  },
]

const FALLBACK_CATEGORY: CategoryDefinition = {
  name: '其他/待整理',
  description: '暂时没有强功能信号的仓库，需要人工点开后再细分。',
  intent: '适合后续人工复核、补标签或合并到更明确的功能分类。',
  keywords: [],
}

const statusCopy: Record<ActivityStatus, string> = {
  active: '近期仍活跃',
  maintained: '维护频率偏低但未长期沉寂',
  quiet: '较久未更新',
  archived: '已归档',
  fork: '是 fork 仓库',
}

export function getCategoryDefinition(name: string) {
  return CATEGORY_DEFINITIONS.find((definition) => definition.name === name) ?? FALLBACK_CATEGORY
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[_./:]+/g, ' ')
}

function hasKeyword(haystack: string, keyword: string) {
  const normalizedKeyword = normalizeText(keyword).trim()
  if (!normalizedKeyword) {
    return false
  }

  if (normalizedKeyword.includes('-') || normalizedKeyword.includes(' ')) {
    return haystack.includes(normalizedKeyword)
  }

  return new RegExp(`(^|[^a-z0-9])${normalizedKeyword}([^a-z0-9]|$)`).test(haystack)
}

export function daysAgo(dateValue: string | null) {
  if (!dateValue) {
    return null
  }

  const timestamp = new Date(dateValue).getTime()
  if (Number.isNaN(timestamp)) {
    return null
  }

  return Math.max(0, Math.floor((Date.now() - timestamp) / DAY))
}

export function compactNumber(value: number) {
  return new Intl.NumberFormat('en', {
    notation: value >= 10000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(value)
}

export function formatDate(dateValue: string | null) {
  if (!dateValue) {
    return 'unknown'
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(dateValue))
}

export function formatRelativeDays(value: number | null) {
  if (value === null) {
    return 'unknown'
  }

  if (value === 0) {
    return 'today'
  }

  if (value < 30) {
    return `${value}d`
  }

  if (value < 365) {
    return `${Math.floor(value / 30)}mo`
  }

  return `${Math.floor(value / 365)}y`
}

export function getActivityStatus(repo: StarredRepository): ActivityStatus {
  if (repo.archived) {
    return 'archived'
  }

  if (repo.fork) {
    return 'fork'
  }

  const pushed = daysAgo(repo.pushedAt)
  if (pushed === null || pushed > 730) {
    return 'quiet'
  }

  if (pushed > 365) {
    return 'maintained'
  }

  return 'active'
}

export function classifyRepo(repo: StarredRepository) {
  // Classify by what the project does, never by its implementation language.
  const name = normalizeText(repo.name)
  const description = normalizeText(repo.description ?? '')
  const topics = normalizeText(repo.topics.join(' '))
  const purpose = `${name} ${description} ${topics}`
  const specific = [
    ['网站复刻/设计提取', /website[ -]?(?:clon|recreat)|\b(?:clone|recreate).{0,32}\bwebsite\b|clone (?:any |a )?web|extract.{0,40}design system|design.{0,20}(?:tokens|extraction)|网页复刻|网站复刻|克隆网站|仿站/],
    ['游戏/娱乐', /\b(?:games?|gaming|nintendo|astrology|divination|fortune-telling)\b|switch games|游戏|游戏模拟器|大富翁|紫微斗数|术数|排盘/],
    ['媒体/内容处理', /短剧|漫剧|分镜|剧本|\b(?:screenwriting|storyboards?)\b|short[ -]drama|micro[ -]?drama|video (?:production|editing|generation)|视频(?:生成|制作|剪辑)|(?:音频|语音)(?:合成|转写)/],
    ['自动化/MCP/工作流', /plugins? (?:market|marketplace)|extension marketplace|插件(?:市场|商店|管理)/],
    ['教育/学习', /\b(?:tutor|tutoring|education|homework|curriculum)\b|learning platform|personalized learning|辅导|教材|课本|教学|蒙特梭利|historical (?:atlas|map)|历史.{0,10}(?:地图|时间轴)/],
    ['学习资料/清单', /^(?:awesome|learn|tutorial|guide)[ -]|\btutorial\b|学习路线|教程|项目清单/],
    ['数据/交易/金融', /time[ -]series|forecasting|\b(?:trading|backtest|quantitative|stock market)\b|量化|回测|股票/],
  ] as const
  for (const [category, pattern] of specific) {
    if (pattern.test(purpose)) return getCategoryDefinition(category)
  }

  const scored = CATEGORY_DEFINITIONS.map((definition) => ({
    definition,
    score: definition.keywords.reduce((score, keyword) => {
      const specificity = keyword.includes('-') || keyword.includes(' ') ? 2 : 1
      return score + specificity * (
        (hasKeyword(name, keyword) ? 4 : 0) +
        (hasKeyword(topics, keyword) ? 3 : 0) +
        (hasKeyword(description, keyword) ? 1 : 0)
      )
    }, 0),
  })).sort((a, b) => b.score - a.score)

  return scored[0]?.score ? scored[0].definition : FALLBACK_CATEGORY
}

function buildCurationNote(
  repo: StarredRepository,
  category: CategoryDefinition,
  activityStatus: ActivityStatus,
) {

  const topicText = repo.topics.slice(0, 3).join(' / ')
  const topicPart = topicText ? `；关键词：${topicText}` : ''
  const description = repo.description ? `简介：${repo.description}` : '简介：仓库没有填写描述'

  return `${category.intent}${topicPart}。${description}。${statusCopy[activityStatus]}；以上仅按简介与标签初筛，未经功能实测。`
}

export function curateRepos(repos: StarredRepository[]): CuratedRepository[] {
  return repos.map((repo) => {
    const pushedDaysAgo = daysAgo(repo.pushedAt)
    const activityStatus = getActivityStatus(repo)
    const category = classifyRepo(repo)
    const recencyScore =
      pushedDaysAgo === null ? 0 : Math.max(0, 100 - Math.min(100, pushedDaysAgo / 9))
    const metadataScore = (repo.description ? 50 : 0) + (repo.topics.length ? 30 : 0) + (repo.licenseName ? 20 : 0)
    const maintenancePenalty =
      activityStatus === 'archived' ? 35 : activityStatus === 'quiet' ? 16 : 0

    return {
      ...repo,
      activityStatus,
      category: category.name,
      categoryDescription: category.description,
      categoryIntent: category.intent,
      curationNote: buildCurationNote(repo, category, activityStatus),
      pushedDaysAgo,
      signalScore: Math.max(
        0,
        Math.round(recencyScore * 0.45 + metadataScore * 0.55 - maintenancePenalty),
      ),
    }
  })
}

export function countBy<T extends string>(values: T[]) {
  return values.reduce<Record<T, number>>(
    (acc, value) => {
      acc[value] = (acc[value] ?? 0) + 1
      return acc
    },
    {} as Record<T, number>,
  )
}
