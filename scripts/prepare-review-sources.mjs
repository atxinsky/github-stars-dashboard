import { execFile } from 'node:child_process'
import { readFile, mkdir, writeFile, rename } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import { validateGeneratedReview } from '../src/reviewCatalog.ts'
import { assertPublicRepositories, errorStatus, gitBlobSha, mapConcurrent, metadataHash, sourceHash, sourceReviewErrors } from './review-utils.mjs'

const execFileAsync = promisify(execFile)

async function readJson(file, optional = false) {
  try { return JSON.parse(await readFile(file, 'utf8')) }
  catch (error) { if (optional && error.code === 'ENOENT') return null; throw error }
}

async function atomicJson(file, value) {
  const temporary = `${file}.${process.pid}.tmp`
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`)
  await rename(temporary, file)
}

export async function fetchReadme(repository, run = execFileAsync, pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))) {
  assertPublicRepositories([repository])
  const endpoint = `repos/${repository.fullName}/readme`
  for (let attempt = 0; attempt < 3; attempt += 1) {
    let readmeFound = false
    try {
      const { stdout } = await run('gh', ['api', endpoint, '-H', 'Accept: application/vnd.github+json'], { timeout: 30000, maxBuffer: 16 * 1024 * 1024 })
      const readme = JSON.parse(stdout)
      if (typeof readme.path !== 'string' || !/^[a-f0-9]{40}$/.test(readme.sha ?? '') || typeof readme.html_url !== 'string') {
        throw new Error('README response has no usable path, SHA or source URL')
      }
      readmeFound = true
      let text
      if (readme.encoding === 'base64' && typeof readme.content === 'string') {
        text = Buffer.from(readme.content, 'base64').toString('utf8')
      } else {
        const raw = await run('gh', ['api', endpoint, '-H', 'Accept: application/vnd.github.raw+json'], { timeout: 30000, maxBuffer: 16 * 1024 * 1024 })
        text = raw.stdout
      }
      // Large README responses can be truncated while retaining the complete blob's SHA.
      if (gitBlobSha(text) !== readme.sha) {
        const blobResponse = await run('gh', ['api', `repos/${repository.fullName}/git/blobs/${readme.sha}`], { timeout: 30000, maxBuffer: 32 * 1024 * 1024 })
        const blob = JSON.parse(blobResponse.stdout)
        if (blob.encoding !== 'base64' || typeof blob.content !== 'string') throw new Error('Git blob has no readable source content')
        text = Buffer.from(blob.content, 'base64').toString('utf8')
        if (gitBlobSha(text) !== readme.sha) throw new Error('README content does not match its Git blob SHA')
      }
      return { readme: text, readmePath: readme.path, readmeSha: readme.sha, sourceUrl: readme.html_url }
    } catch (error) {
      const status = errorStatus(error)
      if (status === 404 && !readmeFound) return { readme: '', readmePath: null, readmeSha: null, sourceUrl: repository.htmlUrl || `https://github.com/${repository.fullName}` }
      if (status === 401 || status === 403 || (status && status < 500 && status !== 429) || attempt === 2) {
        throw new Error(`${repository.fullName}: README source failed${status ? ` (HTTP ${status})` : ''}; no metadata-only substitute was created`)
      }
      await pause(700 * (attempt + 1))
    }
  }
}

export async function prepareReviewSources({ root = process.cwd(), force = false, fetchSource = fetchReadme, concurrency = 4 } = {}) {
  const snapshot = await readJson(path.join(root, 'public/stars-snapshot.json'))
  assertPublicRepositories(snapshot?.repositories)
  let catalog = null
  try { catalog = await readJson(path.join(root, 'public/project-reviews.json'), true) }
  catch { console.warn('Existing review catalog is unreadable; its sources will be marked pending.') }
  const directory = path.join(root, '.cache/review-sources')
  await mkdir(directory, { recursive: true })
  let done = 0
  const failures = []
  const sources = await mapConcurrent(snapshot.repositories, concurrency, async (repository) => {
    try {
      const file = path.join(directory, `${repository.id}.json`)
      let cached = null
      try { cached = await readJson(file, true) } catch { /* Re-fetch a corrupt local cache. */ }
      const signature = metadataHash(repository)
      const reusable = !force && cached?.repository?.id === repository.id && cached.metadataHash === signature
        && typeof cached.readme === 'string' && cached.inputHash === sourceHash(repository, cached.readme)
        && (cached.readmeSha === null || gitBlobSha(cached.readme) === cached.readmeSha)
        && (cached.readmePath === null && cached.readmeSha === null || typeof cached.readmePath === 'string' && /^[a-f0-9]{40}$/.test(cached.readmeSha ?? ''))
      const source = reusable ? { ...cached, repository } : {
        repository,
        ...await fetchSource(repository),
        preparedAt: new Date().toISOString(),
      }
      source.metadataHash = signature
      source.inputHash = sourceHash(repository, source.readme)
      await atomicJson(file, source)
      const entry = catalog?.version === 1 ? catalog.reviews?.[repository.fullName.toLowerCase()] : null
      const needsReview = !validateGeneratedReview(entry) || sourceReviewErrors(entry, source).length > 0
      done += 1
      if (done % 20 === 0 || done === snapshot.repositories.length) console.log(`Prepared ${done}/${snapshot.repositories.length} sources`)
      return { id: repository.id, fullName: repository.fullName, path: path.relative(root, file), inputHash: source.inputHash, needsReview }
    } catch (error) {
      failures.push(error.message)
      return null
    }
  })
  const index = { generatedAt: new Date().toISOString(), sources: sources.filter(Boolean), errors: failures }
  await atomicJson(path.join(directory, 'index.json'), index)
  if (failures.length) throw new Error(`Failed to prepare ${failures.length} source(s):\n${failures.join('\n')}`)
  console.log(`Source index: .cache/review-sources/index.json; ${index.sources.filter((source) => source.needsReview).length} pending review(s)`)
  return index
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  prepareReviewSources({ force: process.argv.includes('--force') }).catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
