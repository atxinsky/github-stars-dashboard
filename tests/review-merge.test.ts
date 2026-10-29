import assert from 'node:assert/strict'
import test from 'node:test'
import { execFile } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { REVIEW_CATEGORY_NAMES, parseReviewCatalog, type GeneratedReview } from '../src/reviewCatalog.ts'
import { sourceHash } from '../scripts/review-utils.mjs'

const execute = promisify(execFile)
const merger = fileURLToPath(new URL('../scripts/merge-review-batches.mjs', import.meta.url))
const readme = 'A documented project for checking incremental review updates.'
const timestamp = '2026-01-01T00:00:00Z'

function project(id: number, fullName: string) {
  return { id, fullName, description: 'A source-backed test project', topics: [], pushedAt: timestamp }
}

function review(repository: ReturnType<typeof project>): GeneratedReview {
  return {
    review: {
      title: '核对增量合并后的项目资料', summary: '这是用于核对项目来源和增量评价合并行为的测试资料。',
      category: REVIEW_CATEGORY_NAMES[0], scenarios: ['research'], verdict: '按需使用',
      why: '保留已有有效评价，同时仅合并本轮明确指定的新增结果。',
      bestFor: ['验证增量合并'], caveats: ['仅用于离线测试，不执行外部服务或模型调用。'],
      setup: '开发者工具', effort: '低', checkedAt: '2026-01-01', searchTerms: ['来源合并'],
      evidence: [{ label: '项目说明', url: `https://github.com/${repository.fullName}/blob/main/README.md` }],
    },
    provenance: {
      model: 'Codex', promptVersion: 'codex-readme-v1', source: 'readme', repositoryId: repository.id,
      pushedAt: timestamp, readmePath: 'README.md', readmeSha: 'a'.repeat(40),
      inputHash: sourceHash(repository, readme), generatedAt: timestamp,
    },
    sourceQuotes: [readme],
  }
}

async function writeJson(file: string, value: unknown) {
  await writeFile(file, JSON.stringify(value))
}

async function fixture(run: (root: string) => Promise<void>) {
  const root = await mkdtemp(path.join(tmpdir(), 'stars-review-merge-'))
  for (const directory of ['public', '.cache/review-batches', '.cache/review-sources']) {
    await mkdir(path.join(root, directory), { recursive: true })
  }
  try { await run(root) } finally { await rm(root, { recursive: true, force: true }) }
}

async function previous(root: string, reviews: Record<string, GeneratedReview>) {
  await writeJson(path.join(root, 'public/project-reviews.json'), { version: 1, generatedAt: timestamp, reviews })
}

async function source(root: string, repository: ReturnType<typeof project>, entry = review(repository)) {
  await writeJson(path.join(root, `.cache/review-sources/${repository.id}.json`), {
    repository, readme, readmePath: entry.provenance.readmePath, readmeSha: entry.provenance.readmeSha,
    inputHash: entry.provenance.inputHash,
  })
}

async function runMerger(root: string, batches: string[]) {
  return execute(process.execPath, ['--experimental-strip-types', merger, ...batches], { cwd: root })
}

async function result(root: string) {
  return parseReviewCatalog(JSON.parse(await readFile(path.join(root, 'public/project-reviews.json'), 'utf8')))
}

test('merger requires explicit current-run batches rather than replaying historical cache', async () => {
  await fixture(async (root) => {
    const repository = project(1, 'owner/first')
    await previous(root, { [repository.fullName]: review(repository) })
    const before = await readFile(path.join(root, 'public/project-reviews.json'), 'utf8')
    await assert.rejects(runMerger(root, []), /historical batches must not be replayed/)
    assert.equal(await readFile(path.join(root, 'public/project-reviews.json'), 'utf8'), before)
  })
})

test('incremental merge ignores stale historical batches and preserves earlier valid reviews', async () => {
  await fixture(async (root) => {
    const first = project(1, 'owner/first'), second = project(2, 'owner/second')
    const oldReview = review(first), newReview = review(second)
    await previous(root, { [first.fullName]: oldReview })
    await writeJson(path.join(root, 'public/stars-snapshot.json'), { repositories: [first, second] })
    // A previous full run remains on disk with an obsolete hash and overlapping ownership.
    await writeJson(path.join(root, '.cache/review-batches/historical.json'), {
      [second.fullName]: { ...newReview, provenance: { ...newReview.provenance, inputHash: 'f'.repeat(64) } },
    })
    await writeJson(path.join(root, '.cache/review-batches/current.json'), { [second.fullName]: newReview })
    await source(root, second, newReview)
    await runMerger(root, ['.cache/review-batches/current.json'])
    const catalog = await result(root)
    assert.deepEqual(catalog.reviews[first.fullName], oldReview)
    assert.deepEqual(catalog.reviews[second.fullName], newReview)
    assert.equal(Object.keys(catalog.reviews).length, 2)
  })
})

test('rename and unstar remove obsolete identities while retaining unrelated reviews', async () => {
  await fixture(async (root) => {
    const old = project(1, 'owner/old-name'), renamed = project(1, 'owner/new-name')
    const retained = project(2, 'owner/retained'), removed = project(3, 'owner/removed')
    const retainedReview = review(retained), renamedReview = review(renamed)
    await previous(root, { [old.fullName]: review(old), [retained.fullName]: retainedReview, [removed.fullName]: review(removed) })
    await writeJson(path.join(root, 'public/stars-snapshot.json'), { repositories: [renamed, retained] })
    await writeJson(path.join(root, '.cache/review-batches/historical.json'), { [old.fullName]: review(old), [removed.fullName]: review(removed) })
    await writeJson(path.join(root, '.cache/review-batches/current.json'), { [renamed.fullName]: renamedReview })
    await source(root, renamed, renamedReview)
    await runMerger(root, ['.cache/review-batches/current.json'])
    const catalog = await result(root)
    assert.deepEqual(Object.keys(catalog.reviews).sort(), [renamed.fullName, retained.fullName].sort())
    assert.deepEqual(catalog.reviews[retained.fullName], retainedReview)
    assert.equal(catalog.reviews[renamed.fullName].provenance.repositoryId, old.id)
  })
})

test('duplicate ownership in the same explicit run fails without replacing the published catalog', async () => {
  await fixture(async (root) => {
    const repository = project(1, 'owner/first'), entry = review(repository)
    await previous(root, {})
    await writeJson(path.join(root, 'public/stars-snapshot.json'), { repositories: [repository] })
    await source(root, repository, entry)
    for (const name of ['current-a.json', 'current-b.json']) {
      await writeJson(path.join(root, '.cache/review-batches', name), { [repository.fullName]: entry })
    }
    await assert.rejects(runMerger(root, ['.cache/review-batches/current-a.json', '.cache/review-batches/current-b.json']), /Duplicate batch ownership/)
    assert.deepEqual((await result(root)).reviews, {})
  })
})

test('mismatched or invented evidence in a new batch cannot replace the catalog', async () => {
  await fixture(async (root) => {
    const repository = project(1, 'owner/first'), entry = review(repository)
    await previous(root, {})
    await writeJson(path.join(root, 'public/stars-snapshot.json'), { repositories: [repository] })
    await source(root, repository, entry)
    const file = path.join(root, '.cache/review-batches/current.json')
    await writeJson(file, { [repository.fullName]: { ...entry, provenance: { ...entry.provenance, inputHash: 'f'.repeat(64) } } })
    await assert.rejects(runMerger(root, [file]), /Source identity mismatch/)
    await writeJson(file, { [repository.fullName]: { ...entry, sourceQuotes: ['An invented statement absent from the source.'] } })
    await assert.rejects(runMerger(root, [file]), /Unmatched source quotation/)
    assert.deepEqual((await result(root)).reviews, {})
  })
})
