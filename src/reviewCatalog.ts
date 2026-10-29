import { CATEGORY_DEFINITIONS } from './curation.ts'
import type { EditorialReview } from './reviews.ts'

export type GeneratedReview = {
  review: EditorialReview
  provenance: {
    model: string
    promptVersion: string
    source: 'readme' | 'repository-metadata'
    repositoryId: number
    pushedAt: string | null
    readmePath: string | null
    readmeSha: string | null
    inputHash: string
    generatedAt: string
  }
  sourceQuotes: string[]
}

export type ReviewCatalog = {
  version: 1
  generatedAt: string
  reviews: Record<string, GeneratedReview>
}

export const REVIEW_CATEGORY_NAMES = [...CATEGORY_DEFINITIONS.map((category) => category.name), '其他/待整理']
export const REVIEW_SCENARIO_IDS = ['build-web', 'learn', 'gaming', 'content', 'automation', 'research', 'data', 'devices']
const VERDICTS = ['值得先试', '按需使用', '先观望']
const SETUPS = ['直接体验', '本地安装', '需要部署', '开发者工具']
const EFFORTS = ['低', '中', '高']
const REPOSITORY_KEY = /^[a-z0-9][a-z0-9-]*\/[a-z0-9_.-]+$/

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
    && [Object.prototype, null].includes(Object.getPrototypeOf(value))
}

function text(value: unknown, min = 1, max = 5000): value is string {
  return typeof value === 'string' && value.trim().length >= min && value.length <= max
}

function date(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)) return false
  const [year, month, day] = value.slice(0, 10).split('-').map(Number)
  return Number.isFinite(Date.parse(value)) && month >= 1 && month <= 12 && day >= 1
    && day <= new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function timestamp(value: unknown): value is string {
  return date(value) && value.includes('T')
}

function strings(value: unknown, minItems: number, maxItems: number, minLength = 1, maxLength = 2000): value is string[] {
  return Array.isArray(value) && value.length >= minItems && value.length <= maxItems
    && value.every((item) => text(item, minLength, maxLength))
}

function githubUrl(value: unknown): value is string {
  if (!text(value, 20, 2000)) return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname === 'github.com' && !url.username && !url.password
      && !url.port && url.pathname.split('/').filter(Boolean).length >= 2
  } catch { return false }
}

export function validateGeneratedReview(value: unknown): value is GeneratedReview {
  if (!record(value) || !record(value.review) || !record(value.provenance)) return false
  const review = value.review
  const provenance = value.provenance
  if (!text(review.title, 4, 200) || !text(review.summary, 12) || !text(review.why, 12)
    || !REVIEW_CATEGORY_NAMES.includes(review.category as string)
    || !strings(review.scenarios, 0, 8) || !review.scenarios.every((item) => REVIEW_SCENARIO_IDS.includes(item))
    || !VERDICTS.includes(review.verdict as string) || !SETUPS.includes(review.setup as string)
    || !EFFORTS.includes(review.effort as string) || !strings(review.bestFor, 1, 8, 2)
    || !strings(review.caveats, 1, 10, 4) || !strings(review.searchTerms, 1, 24)
    || !date(review.checkedAt) || !Array.isArray(review.evidence) || review.evidence.length < 1 || review.evidence.length > 8
    || !review.evidence.every((item) => record(item) && text(item.label, 2, 200) && githubUrl(item.url))) return false
  if (!text(provenance.model, 1, 200) || !text(provenance.promptVersion, 1, 100)
    || !['readme', 'repository-metadata'].includes(provenance.source as string)
    || !Number.isSafeInteger(provenance.repositoryId) || (provenance.repositoryId as number) <= 0
    || !(provenance.pushedAt === null || timestamp(provenance.pushedAt))
    || !text(provenance.inputHash, 64, 64) || !/^[a-f0-9]{64}$/.test(provenance.inputHash)
    || !timestamp(provenance.generatedAt) || !strings(value.sourceQuotes, 0, 8, 6, 3000)) return false
  if (provenance.source === 'readme') {
    return text(provenance.readmePath, 1, 500) && !provenance.readmePath.startsWith('/')
      && !provenance.readmePath.split('/').includes('..') && ![...provenance.readmePath].some((character) => character.charCodeAt(0) < 32)
      && text(provenance.readmeSha, 40, 40) && /^[a-f0-9]{40}$/.test(provenance.readmeSha)
      && value.sourceQuotes.length > 0
  }
  return provenance.readmePath === null && provenance.readmeSha === null
}

export function parseReviewCatalog(value: unknown): ReviewCatalog {
  if (!record(value) || value.version !== 1 || !timestamp(value.generatedAt) || !record(value.reviews)
    || Object.keys(value.reviews).length > 10000) throw new Error('AI 评价目录格式无效')
  const repositoryIds = new Set<number>()
  for (const [key, entry] of Object.entries(value.reviews)) {
    if (!REPOSITORY_KEY.test(key) || !validateGeneratedReview(entry) || repositoryIds.has(entry.provenance.repositoryId)) {
      throw new Error(`AI 评价记录无效：${key}`)
    }
    // A record must cite its own repository rather than borrowing another project's evidence.
    if (!entry.review.evidence.some((item) => new URL(item.url).pathname.split('/').filter(Boolean).slice(0, 2).join('/').toLowerCase() === key)) {
      throw new Error(`AI 评价来源与项目不一致：${key}`)
    }
    if (Date.parse(entry.provenance.generatedAt) > Date.parse(value.generatedAt)) throw new Error(`AI 评价时间与目录不一致：${key}`)
    repositoryIds.add(entry.provenance.repositoryId)
  }
  return value as ReviewCatalog
}

export function newestReviewCatalog(current: ReviewCatalog | null, incoming: ReviewCatalog): ReviewCatalog {
  return !current || Date.parse(incoming.generatedAt) > Date.parse(current.generatedAt) ? incoming : current
}
