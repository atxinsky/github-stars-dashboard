import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import test, { type TestContext } from 'node:test'
import { fetchStarredRepositories } from '../src/github.ts'
import { fetchAllStars } from '../vite.config.ts'

function repository(id: number, privateRepo: boolean) {
  return {
    id, name: `project-${id}`, full_name: `sample/project-${id}`,
    html_url: `https://github.com/sample/project-${id}`,
    description: null, language: null, private: privateRepo,
  }
}

// No Link header: termination must depend on all 100 raw records, not the six public ones.
const firstPage = Array.from({ length: 100 }, (_, index) => ({
  starred_at: '2026-01-01T00:00:00Z', repo: repository(index + 1, index < 94),
}))
const unknownVisibility = { ...repository(103, false), private: undefined }
const finalPage = [repository(101, false), repository(102, true), unknownVisibility]
const publicIds = [95, 96, 97, 98, 99, 100, 101]

function mockPages(context: TestContext) {
  const pages: number[] = []
  context.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    const page = Number(new URL(String(input)).searchParams.get('page'))
    pages.push(page)
    return Response.json(page === 1 ? firstPage : page === 2 ? finalPage : [])
  })
  return pages
}

test('direct sync excludes private and unknown visibility while preserving raw pagination', async (context) => {
  const pages = mockPages(context)
  const progress: number[] = []
  const repositories = await fetchStarredRepositories('sample', '', (value) => progress.push(value.totalLoaded))
  assert.deepEqual(pages, [1, 2])
  assert.deepEqual(repositories.map((repo) => repo.id), publicIds)
  assert.ok(repositories.every((repo) => repo.private === false))
  assert.deepEqual(progress, [6, 7])
})

test('local server publishes only explicitly public repositories and an accurate count', async (context) => {
  const pages = mockPages(context)
  const snapshot = await fetchAllStars('sample', '')
  assert.deepEqual(pages, [1, 2])
  assert.equal(snapshot.count, 7)
  assert.deepEqual(snapshot.repositories.map((repo) => repo.id), publicIds)
  assert.ok(snapshot.repositories.every((repo) => repo.private === false))
})

test('frontend rejects private records even if the local API returns them', async (context) => {
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window')
  Object.defineProperty(globalThis, 'window', {
    configurable: true, value: { location: { hostname: 'localhost' } },
  })
  context.after(() => {
    if (windowDescriptor) Object.defineProperty(globalThis, 'window', windowDescriptor)
    else Reflect.deleteProperty(globalThis, 'window')
  })
  context.mock.method(globalThis, 'fetch', async () => Response.json({
    pages: 1,
    repositories: [{ id: 1, private: true }, { id: 2, private: false }, { id: 3 }],
  }))
  const progress: number[] = []
  const repositories = await fetchStarredRepositories('sample', '', (value) => progress.push(value.totalLoaded))
  assert.deepEqual(repositories.map((repo) => repo.id), [2])
  assert.deepEqual(progress, [0, 1])
})

test('snapshot CLI excludes private and missing visibility without truncating raw pagination', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'public-stars-'))
  try {
    const preload = path.join(directory, 'mock-fetch.mjs')
    await writeFile(preload, `
      import { writeFileSync } from 'node:fs';
      const pages = [];
      globalThis.fetch = async (input) => {
        const page = Number(new URL(String(input)).searchParams.get('page'));
        pages.push(page);
        writeFileSync('requests.json', JSON.stringify(pages));
        return Response.json(page === 1 ? ${JSON.stringify(firstPage)} : page === 2 ? ${JSON.stringify(finalPage)} : []);
      };
    `)
    const script = fileURLToPath(new URL('../scripts/fetch-stars.mjs', import.meta.url))
    const result = spawnSync(process.execPath, ['--import', preload, script], {
      cwd: directory, encoding: 'utf8',
      env: { ...process.env, GITHUB_TOKEN: '', GITHUB_STARS_USER: 'sample' },
    })
    assert.equal(result.status, 0, result.stderr)
    assert.deepEqual(JSON.parse(await readFile(path.join(directory, 'requests.json'), 'utf8')), [1, 2])
    const snapshot = JSON.parse(await readFile(path.join(directory, 'public/stars-snapshot.json'), 'utf8'))
    assert.equal(snapshot.count, 7)
    assert.deepEqual(snapshot.repositories.map((repo: { id: number }) => repo.id), publicIds)
    assert.ok(snapshot.repositories.every((repo: { private: boolean }) => repo.private === false))
    assert.match(result.stdout, /Wrote 7 repositories/)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
