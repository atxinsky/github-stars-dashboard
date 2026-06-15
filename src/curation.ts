import type { StarredRepository } from './types'

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
      'market',
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
  const haystack = normalizeText(
    [
      repo.name,
      repo.fullName,
      repo.description ?? '',
      repo.language ?? '',
      ...repo.topics,
    ].join(' '),
  )

  for (const definition of CATEGORY_DEFINITIONS) {
    if (definition.keywords.some((keyword) => hasKeyword(haystack, keyword))) {
      return definition
    }
  }

  return FALLBACK_CATEGORY
}

function buildCurationNote(
  repo: StarredRepository,
  category: CategoryDefinition,
  activityStatus: ActivityStatus,
) {
  const popularity =
    repo.stargazersCount > 50000
      ? '社区热度很高'
      : repo.stargazersCount > 10000
        ? '社区关注度高'
        : repo.stargazersCount > 1000
          ? '已有一定社区验证'
          : '偏小众或早期项目'
  const topicText = repo.topics.slice(0, 3).join(' / ')
  const topicPart = topicText ? `；关键词：${topicText}` : ''
  const description = repo.description ? `简介：${repo.description}` : '简介：仓库没有填写描述'

  return `${category.intent}${topicPart}。${description}。${popularity}，${statusCopy[activityStatus]}。`
}

export function curateRepos(repos: StarredRepository[]): CuratedRepository[] {
  return repos.map((repo) => {
    const pushedDaysAgo = daysAgo(repo.pushedAt)
    const activityStatus = getActivityStatus(repo)
    const category = classifyRepo(repo)
    const recencyScore =
      pushedDaysAgo === null ? 0 : Math.max(0, 100 - Math.min(100, pushedDaysAgo / 9))
    const popularityScore = Math.min(100, Math.log10(repo.stargazersCount + 1) * 20)
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
        Math.round(recencyScore * 0.45 + popularityScore * 0.55 - maintenancePenalty),
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
