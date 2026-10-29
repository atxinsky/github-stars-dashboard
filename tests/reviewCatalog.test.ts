import assert from 'node:assert/strict'
import test from 'node:test'
import { EDITORIAL_REVIEWS } from '../src/reviews.ts'
import { newestReviewCatalog, parseReviewCatalog, validateGeneratedReview, type GeneratedReview, type ReviewCatalog } from '../src/reviewCatalog.ts'

function generated(): GeneratedReview {
  return {
    review: structuredClone(EDITORIAL_REVIEWS['hkuds/deeptutor']),
    provenance: {
      model: 'Codex', promptVersion: 'readme-v1', source: 'readme', repositoryId: 1124219907,
      pushedAt: '2026-10-28T04:28:33Z', readmePath: 'README.md', readmeSha: 'a'.repeat(40),
      inputHash: 'b'.repeat(64), generatedAt: '2026-10-29T08:00:00.000Z',
    },
    sourceQuotes: ['Lifelong Personalized Tutoring'],
  }
}

function catalog(entry = generated()): ReviewCatalog {
  return { version: 1, generatedAt: '2026-10-29T08:01:00.000Z', reviews: { 'hkuds/deeptutor': entry } }
}

test('a grounded README review is accepted by the shared browser and generator validator', () => {
  const value = catalog()
  assert(validateGeneratedReview(value.reviews['hkuds/deeptutor']))
  assert.equal(parseReviewCatalog(value), value)
})

test('unknown categories, task IDs and recommendation enums are rejected', () => {
  for (const [key, value] of [['category', 'AI评价的新分类'], ['verdict', '保证可用'], ['setup', '一键万能'], ['effort', '完全免费'], ['scenarios', ['unknown-task']]]) {
    const entry = generated()
    Object.assign(entry.review, { [key]: value })
    assert.equal(validateGeneratedReview(entry), false, key as string)
  }
})

test('empty promotional text is not a detailed review', () => {
  for (const key of ['title', 'summary', 'why', 'bestFor', 'caveats', 'searchTerms']) {
    const entry = generated()
    Object.assign(entry.review, { [key]: Array.isArray(entry.review[key as keyof typeof entry.review]) ? [] : '好' })
    assert.equal(validateGeneratedReview(entry), false, key)
  }
})

test('evidence is limited to credential-free HTTPS GitHub URLs', () => {
  for (const url of ['javascript:alert(1)', 'http://github.com/HKUDS/DeepTutor', 'https://github.com.evil.test/HKUDS/DeepTutor', 'https://user:secret@github.com/HKUDS/DeepTutor', 'https://github.com:8443/HKUDS/DeepTutor']) {
    const entry = generated()
    entry.review.evidence[0].url = url
    assert.equal(validateGeneratedReview(entry), false, url)
  }
})

test('a README source requires its path, SHA and a source excerpt', () => {
  for (const patch of [{ readmePath: null }, { readmeSha: null }, { readmePath: '../secrets.md' }, { readmeSha: 'wrong' }]) {
    const entry = generated()
    Object.assign(entry.provenance, patch)
    assert.equal(validateGeneratedReview(entry), false)
  }
  const noQuote = generated()
  noQuote.sourceQuotes = []
  assert.equal(validateGeneratedReview(noQuote), false)
})

test('limited metadata reviews remain explicit and cannot pretend to cite a README', () => {
  const entry = generated()
  entry.provenance.source = 'repository-metadata'
  entry.provenance.readmePath = null
  entry.provenance.readmeSha = null
  entry.sourceQuotes = []
  assert(validateGeneratedReview(entry))
  entry.provenance.readmePath = 'README.md'
  assert.equal(validateGeneratedReview(entry), false)
})

test('invalid identities, input hashes and timestamps are rejected', () => {
  for (const patch of [{ repositoryId: 0 }, { repositoryId: 1.5 }, { inputHash: 'missing' }, { generatedAt: 'not-a-date' }, { generatedAt: '2026-02-30T08:00:00Z' }, { pushedAt: 'tomorrow' }]) {
    const entry = generated()
    Object.assign(entry.provenance, patch)
    assert.equal(validateGeneratedReview(entry), false)
  }
})

test('catalog records use lowercase repository keys and cite their own project', () => {
  const value = catalog()
  assert.throws(() => parseReviewCatalog({ ...value, reviews: { 'HKUDS/DeepTutor': generated() } }))
  const wrongProject = generated()
  wrongProject.review.evidence[0].url = 'https://github.com/other/project'
  assert.throws(() => parseReviewCatalog(catalog(wrongProject)), /来源与项目不一致/)
})

test('a catalog cannot associate one repository ID with multiple names or contain future entries', () => {
  const duplicate = generated()
  duplicate.review.evidence[0].url = 'https://github.com/other/project'
  assert.throws(() => parseReviewCatalog({ ...catalog(), reviews: { ...catalog().reviews, 'other/project': duplicate } }))
  const future = generated()
  future.provenance.generatedAt = '2026-10-30T00:00:00Z'
  assert.throws(() => parseReviewCatalog(catalog(future)), /时间与目录不一致/)
})

test('bad envelopes and object instances are rejected without partially trusting the catalog', () => {
  for (const value of [null, [], new Date(), { ...catalog(), version: 2 }, { ...catalog(), generatedAt: '' }, { ...catalog(), reviews: [] }]) {
    assert.throws(() => parseReviewCatalog(value))
  }
})

test('newer cached catalog wins over a delayed older response', () => {
  const current = catalog()
  const older = { ...current, generatedAt: '2026-10-29T07:00:00Z' }
  const newer = { ...current, generatedAt: '2026-10-29T09:00:00Z' }
  assert.equal(newestReviewCatalog(current, older), current)
  assert.equal(newestReviewCatalog(current, newer), newer)
  assert.equal(newestReviewCatalog(null, current), current)
})
