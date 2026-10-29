import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'
import { fetchReadme, prepareReviewSources } from '../scripts/prepare-review-sources.mjs'
import { gitBlobSha, metadataHash, sourceHash, mapConcurrent } from '../scripts/review-utils.mjs'
import { validateReviews } from '../scripts/validate-reviews.mjs'
import { REVIEW_CATEGORY_NAMES, type GeneratedReview } from '../src/reviewCatalog.ts'
import type { StarredRepository } from '../src/types.ts'

const repository: StarredRepository = {
  id: 123, name: 'project', fullName: 'owner/project', owner: 'owner', htmlUrl: 'https://github.com/owner/project',
  description: 'Source-based testing project', language: 'TypeScript', topics: ['testing'],
  stargazersCount: 1, forksCount: 0, watchersCount: 1, openIssuesCount: 0,
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
  pushedAt: '2026-01-01T00:00:00Z', starredAt: '2026-01-01T00:00:00Z',
  archived: false, fork: false, disabled: false, private: false, licenseName: 'MIT',
  homepage: null, defaultBranch: 'main', size: 1,
}
const readme = '# Project\nRun tests against real project documentation.\n中文来源保持完整。\n'
const source = { readme, readmePath: 'README.md', readmeSha: gitBlobSha(readme), sourceUrl: 'https://github.com/owner/project/blob/main/README.md' }

function entry(): GeneratedReview {
  return {
    review: {
      title: '围绕真实文档校验测试结果', summary: '这是用于检查真实来源文档与评价一致性的测试项目。',
      category: REVIEW_CATEGORY_NAMES[0], scenarios: ['automation'], verdict: '按需使用',
      why: '适合把项目文档与具体测试结果放在一起核对。', bestFor: ['验证来源'], caveats: ['仅依据项目说明，尚未进行部署实测。'],
      setup: '开发者工具', effort: '中', checkedAt: '2026-10-29', searchTerms: ['文档测试'],
      evidence: [{ label: '项目 README', url: source.sourceUrl }],
    },
    provenance: {
      model: 'Codex', promptVersion: '1', source: 'readme', repositoryId: repository.id,
      pushedAt: repository.pushedAt, readmePath: source.readmePath, readmeSha: source.readmeSha,
      inputHash: sourceHash(repository, readme), generatedAt: '2026-10-29T00:00:00Z',
    },
    sourceQuotes: ['Run tests against real project documentation.'],
  }
}

async function fixture(run: (root: string) => Promise<void>) {
  const root = await mkdtemp(path.join(tmpdir(), 'stars-review-test-'))
  await mkdir(path.join(root, 'public'))
  await writeFile(path.join(root, 'public/stars-snapshot.json'), JSON.stringify({ repositories: [repository] }))
  try { await run(root) } finally { await rm(root, { recursive: true, force: true }) }
}

async function catalog(root: string, review = entry()) {
  await writeFile(path.join(root, 'public/project-reviews.json'), JSON.stringify({ version: 1, generatedAt: '2026-10-29T01:00:00Z', reviews: { 'owner/project': review } }))
}

test('review hash tracks actual source changes but ignores popularity and code-only pushes', () => {
  const changed = { ...repository, pushedAt: '2026-10-29T01:00:00Z', stargazersCount: 900, watchersCount: 900, updatedAt: '2026-10-29T01:00:00Z' }
  assert.equal(sourceHash(repository, readme), sourceHash(changed, readme))
  assert.notEqual(metadataHash(repository), metadataHash(changed))
  assert.notEqual(sourceHash(repository, readme), sourceHash(repository, `${readme}New feature`))
  assert.notEqual(sourceHash(repository, readme), sourceHash({ ...repository, description: 'Different purpose' }, readme))
})

test('GitHub source reader preserves complete README text and provenance', async () => {
  const result = await fetchReadme(repository, async (command: string, args: string[]) => {
    assert.equal(command, 'gh')
    assert.deepEqual(args.slice(0, 2), ['api', 'repos/owner/project/readme'])
    return { stdout: JSON.stringify({ path: source.readmePath, sha: source.readmeSha, html_url: source.sourceUrl, encoding: 'base64', content: Buffer.from(readme).toString('base64') }) }
  })
  assert.deepEqual(result, source)
})

test('Git blob hashes use UTF-8 byte length for multilingual README content', () => {
  const bytes = Buffer.from(readme, 'utf8')
  const expected = createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes])).digest('hex')
  assert.equal(gitBlobSha(readme), expected)
  assert.notEqual(bytes.length, readme.length)
})

test('truncated README responses retrieve and verify the complete Git blob', async () => {
  const complete = `${'x'.repeat(512000)}\n中文与完整文档末尾。\n`
  const sha = gitBlobSha(complete)
  const endpoints: string[] = []
  const result = await fetchReadme(repository, async (command: string, args: string[]) => {
    assert.equal(command, 'gh')
    endpoints.push(args[1])
    if (args[1] === 'repos/owner/project/readme') {
      return { stdout: JSON.stringify({ path: source.readmePath, sha, html_url: source.sourceUrl, encoding: 'base64', content: Buffer.from(complete.slice(0, 512000)).toString('base64') }) }
    }
    assert.equal(args[1], `repos/owner/project/git/blobs/${sha}`)
    return { stdout: JSON.stringify({ sha, encoding: 'base64', content: Buffer.from(complete).toString('base64') }) }
  })
  assert.deepEqual(endpoints, ['repos/owner/project/readme', `repos/owner/project/git/blobs/${sha}`])
  assert.deepEqual(result, { ...source, readme: complete, readmeSha: sha })
})

test('missing or corrupt full Git blobs fail rather than become metadata-only sources', async () => {
  for (const missing of [true, false]) {
    let readmeCalls = 0, blobCalls = 0
    await assert.rejects(fetchReadme(repository, async (_command: string, args: string[]) => {
      if (args[1] === 'repos/owner/project/readme') {
        readmeCalls += 1
        return { stdout: JSON.stringify({ path: source.readmePath, sha: source.readmeSha, html_url: source.sourceUrl, encoding: 'base64', content: Buffer.from('truncated').toString('base64') }) }
      }
      assert.equal(args[1], `repos/owner/project/git/blobs/${source.readmeSha}`)
      blobCalls += 1
      if (missing) throw Object.assign(new Error('blob missing'), { stderr: 'gh: Not Found (HTTP 404)' })
      return { stdout: JSON.stringify({ encoding: 'base64', content: Buffer.from('still corrupt').toString('base64') }) }
    }, async () => {}), /README source failed.*no metadata-only substitute/)
    assert.equal(readmeCalls, missing ? 1 : 3)
    assert.equal(blobCalls, missing ? 1 : 3)
  }
})

test('only README 404 becomes metadata-only; authorization and throttling errors fail', async () => {
  const fail = (status: number) => async () => { throw Object.assign(new Error('GitHub source unavailable'), { stderr: `gh: request failed (HTTP ${status})` }) }
  const missing = await fetchReadme(repository, fail(404), async () => {})
  assert.equal(missing.readmePath, null)
  assert.equal(missing.readmeSha, null)
  for (const status of [401, 403, 429, 503]) {
    let calls = 0
    await assert.rejects(fetchReadme(repository, async () => { calls += 1; return fail(status)() }, async () => {}), new RegExp(`HTTP ${status}`))
    assert.equal(calls, status < 429 ? 1 : 3)
  }
})

test('source collection uses at most four concurrent requests', async () => {
  let active = 0, maximum = 0
  const result = await mapConcurrent(Array.from({ length: 20 }, (_, index) => index), 4, async (value: number) => {
    maximum = Math.max(maximum, ++active)
    await new Promise((resolve) => setTimeout(resolve, 2))
    active -= 1
    return value
  })
  assert.equal(maximum, 4)
  assert.deepEqual(result, Array.from({ length: 20 }, (_, index) => index))
})

test('cache reuse, invalid hash refetch and code-only source refresh preserve detailed reviews', async () => {
  await fixture(async (root) => {
    let requests = 0
    const fetchSource = async () => { requests += 1; return source }
    const first = await prepareReviewSources({ root, fetchSource })
    assert.equal(requests, 1)
    assert.equal(first.sources[0].needsReview, true)
    await catalog(root)
    const reused = await prepareReviewSources({ root, fetchSource })
    assert.equal(requests, 1)
    assert.equal(reused.sources[0].needsReview, false)
    const file = path.join(root, first.sources[0].path)
    const cached = JSON.parse(await readFile(file, 'utf8'))
    cached.inputHash = 'old-hash-format'
    await writeFile(file, JSON.stringify(cached))
    const repaired = await prepareReviewSources({ root, fetchSource })
    assert.equal(requests, 2)
    assert.equal(repaired.sources[0].needsReview, false)
    await writeFile(path.join(root, 'public/stars-snapshot.json'), JSON.stringify({ repositories: [{ ...repository, pushedAt: '2026-10-29T01:00:00Z' }] }))
    const refreshed = await prepareReviewSources({ root, fetchSource })
    assert.equal(requests, 3)
    assert.equal(refreshed.sources[0].inputHash, first.sources[0].inputHash)
    assert.equal(refreshed.sources[0].needsReview, false)
    assert.equal((await validateReviews({ root, strict: true })).reviewed, 1)
  })
})

test('corrupted cached README text refetches even when its claimed input hash is recomputed', async () => {
  await fixture(async (root) => {
    let requests = 0
    const fetchSource = async () => { requests += 1; return source }
    const first = await prepareReviewSources({ root, fetchSource })
    await catalog(root)
    const file = path.join(root, first.sources[0].path)
    for (const rehash of [false, true]) {
      const cached = JSON.parse(await readFile(file, 'utf8'))
      cached.readme = `${readme}An invented cache-only claim.`
      if (rehash) cached.inputHash = sourceHash(repository, cached.readme)
      await writeFile(file, JSON.stringify(cached))
      const repaired = await prepareReviewSources({ root, fetchSource })
      assert.equal(requests, rehash ? 3 : 2)
      assert.equal(repaired.sources[0].needsReview, false)
      const saved = JSON.parse(await readFile(file, 'utf8'))
      assert.equal(saved.readme, readme)
      assert.equal(saved.readmeSha, source.readmeSha)
      assert.equal(saved.inputHash, first.sources[0].inputHash)
    }
  })
})

test('strict validation requires coverage while normal CI accepts explicitly pending new stars', async () => {
  await fixture(async (root) => {
    assert.deepEqual((await validateReviews({ root })).pending, ['owner/project'])
    await assert.rejects(validateReviews({ root, strict: true }), /Strict coverage failed/)
    await catalog(root)
    assert.equal((await validateReviews({ root, strict: true })).reviewed, 1)
  })
})

test('catalog validation rejects malformed records, wrong identities and invented source quotations', async () => {
  await fixture(async (root) => {
    await prepareReviewSources({ root, fetchSource: async () => source })
    const malformed = entry(); malformed.review.summary = 'short'
    await catalog(root, malformed)
    await assert.rejects(validateReviews({ root }), /评价记录无效/)
    const wrong = entry(); wrong.provenance.repositoryId = 456
    await catalog(root, wrong)
    await assert.rejects(validateReviews({ root }), /repository ID does not match/)
    const invented = entry(); invented.sourceQuotes = ['A claim that the README never makes.']
    await catalog(root, invented)
    await assert.rejects(validateReviews({ root }), /quotation is absent/)
    const changed = entry(); changed.provenance.inputHash = 'b'.repeat(64)
    await catalog(root, changed)
    await assert.rejects(validateReviews({ root }), /input hash differs/)
  })
})

test('failed source requests are recorded as errors rather than fabricated metadata-only evidence', async () => {
  await fixture(async (root) => {
    await assert.rejects(prepareReviewSources({ root, fetchSource: async () => { throw new Error('HTTP 403') } }), /Failed to prepare 1 source/)
    const index = JSON.parse(await readFile(path.join(root, '.cache/review-sources/index.json'), 'utf8'))
    assert.equal(index.sources.length, 0)
    assert.deepEqual(index.errors, ['HTTP 403'])
    await assert.rejects(readFile(path.join(root, '.cache/review-sources/123.json')), { code: 'ENOENT' })
  })
})
