import assert from 'node:assert/strict'
import test from 'node:test'
import { execFile } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { promisify } from 'node:util'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { fetchReadme, prepareReviewSources } from '../scripts/prepare-review-sources.mjs'
import { validateReviews } from '../scripts/validate-reviews.mjs'
import { assertPublicRepositories, gitBlobSha, sourceHash } from '../scripts/review-utils.mjs'
import { REVIEW_CATEGORY_NAMES } from '../src/reviewCatalog.ts'

const execute = promisify(execFile)
const merger = fileURLToPath(new URL('../scripts/merge-review-batches.mjs', import.meta.url))
const timestamp = '2026-01-01T00:00:00Z'
const repository = { id: 1, fullName: 'example/public-project', private: false, pushedAt: timestamp }
const hidden = { ...repository, id: 2, fullName: 'example/confidential-fixture', private: true }
const readme = 'This generic fixture documents public project capabilities.'
function review(project = repository) {
  return {
    review: {
      title: '检查公开项目评价的数据边界', summary: '此记录仅用于检查公开项目资料的评价与发布边界。',
      category: REVIEW_CATEGORY_NAMES[0], scenarios: ['research'], verdict: '按需使用',
      why: '用于离线核对评价流程，防止不应公开的仓库进入发布结果。',
      bestFor: ['离线核对数据'], caveats: ['这是测试数据，未执行真实软件。'],
      setup: '开发者工具', effort: '低', checkedAt: '2026-01-01', searchTerms: ['公开资料'],
      evidence: [{ label: '项目说明', url: `https://github.com/${project.fullName}/blob/main/README.md` }],
    },
    provenance: {
      model: 'Codex', promptVersion: 'codex-readme-v1', source: 'readme', repositoryId: project.id,
      pushedAt: timestamp, readmePath: 'README.md', readmeSha: gitBlobSha(readme),
      inputHash: sourceHash(project, readme), generatedAt: timestamp,
    },
    sourceQuotes: [readme],
  }
}
async function fixture(run: (root: string) => Promise<void>) {
  const root = await mkdtemp(path.join(tmpdir(), 'stars-privacy-'))
  await mkdir(path.join(root, 'public'))
  try { await run(root) } finally { await rm(root, { recursive: true, force: true }) }
}
async function snapshot(root: string, repositories: unknown[]) {
  await writeFile(path.join(root, 'public/stars-snapshot.json'), JSON.stringify({ repositories }))
}
async function catalog(root: string, reviews = {}) {
  await writeFile(path.join(root, 'public/project-reviews.json'), JSON.stringify({ version: 1, generatedAt: timestamp, reviews }))
}
const privacyError = (error: unknown) => {
  assert.match(String(error), /private or unverified repository visibility/)
  assert.ok(!String(error).includes(hidden.fullName))
  return true
}

test('private and unknown visibility fail closed before README requests or source caching', async () => {
  for (const privateValue of [true, undefined]) {
    const project = { ...hidden, private: privateValue }
    assert.throws(() => assertPublicRepositories([repository, project]), privacyError)
    let requests = 0
    await assert.rejects(fetchReadme(project, async () => { requests += 1; throw new Error('must not request') }), privacyError)
    await fixture(async (root) => {
      await snapshot(root, [repository, project])
      await assert.rejects(prepareReviewSources({ root, fetchSource: async () => { requests += 1; throw new Error('must not request') } }), privacyError)
      await assert.rejects(readFile(path.join(root, '.cache/review-sources/index.json')), { code: 'ENOENT' })
    })
    assert.equal(requests, 0)
  }
})

test('public validation and merger reject private snapshot data without revealing names or replacing output', async () => {
  await fixture(async (root) => {
    await snapshot(root, [repository, hidden])
    await catalog(root)
    const output = path.join(root, 'public/project-reviews.json')
    const before = await readFile(output, 'utf8')
    await assert.rejects(validateReviews({ root }), privacyError)
    await writeFile(path.join(root, 'batch.json'), '{}')
    await assert.rejects(execute(process.execPath, ['--experimental-strip-types', merger, 'batch.json'], { cwd: root }), privacyError)
    assert.equal(await readFile(output, 'utf8'), before)
  })
})

test('an old private review outside the clean snapshot cannot pass the publication gate', async () => {
  await fixture(async (root) => {
    await snapshot(root, [repository])
    await catalog(root, { [hidden.fullName]: review(hidden) })
    await assert.rejects(validateReviews({ root }), (error: unknown) => {
      assert.match(String(error), /records outside the current public snapshot/)
      assert.ok(!String(error).includes(hidden.fullName))
      return true
    })
  })
})

test('a private batch ID outside a clean snapshot is rejected without naming it', async () => {
  await fixture(async (root) => {
    await snapshot(root, [repository])
    await catalog(root)
    await writeFile(path.join(root, 'batch.json'), JSON.stringify({ [hidden.fullName]: review(hidden) }))
    await assert.rejects(execute(process.execPath, ['--experimental-strip-types', merger, 'batch.json'], { cwd: root }), (error: unknown) => {
      assert.match(String(error), /outside the current public snapshot/)
      assert.ok(!String(error).includes(hidden.fullName))
      return true
    })
  })
})

test('a prepared private source cannot authorize a batch for a current public repository', async () => {
  await fixture(async (root) => {
    await snapshot(root, [repository])
    await catalog(root)
    const entry = review(repository)
    await mkdir(path.join(root, '.cache/review-sources'), { recursive: true })
    await writeFile(path.join(root, '.cache/review-sources/1.json'), JSON.stringify({
      repository: { ...repository, private: true }, readme,
      inputHash: entry.provenance.inputHash, readmePath: 'README.md', readmeSha: gitBlobSha(readme),
    }))
    await writeFile(path.join(root, 'batch.json'), JSON.stringify({ [repository.fullName]: entry }))
    await assert.rejects(execute(process.execPath, ['--experimental-strip-types', merger, 'batch.json'], { cwd: root }), privacyError)
    await catalog(root, { [repository.fullName]: entry })
    await assert.rejects(validateReviews({ root }), /prepared source is invalid/)
  })
})
