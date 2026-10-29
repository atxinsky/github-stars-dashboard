import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseReviewCatalog } from '../src/reviewCatalog.ts'
import { sourceHash, sourceReviewErrors, validRepository } from './review-utils.mjs'

async function readJson(file, optional = false) {
  try { return JSON.parse(await readFile(file, 'utf8')) }
  catch (error) { if (optional && error.code === 'ENOENT') return null; throw error }
}

export async function validateReviews({ root = process.cwd(), strict = false } = {}) {
  const snapshot = await readJson(path.join(root, 'public/stars-snapshot.json'))
  if (!Array.isArray(snapshot?.repositories) || !snapshot.repositories.every(validRepository)) throw new Error('Star snapshot contains invalid repositories')
  if (new Set(snapshot.repositories.map((repository) => repository.id)).size !== snapshot.repositories.length) throw new Error('Star snapshot contains duplicate repository IDs')
  const value = await readJson(path.join(root, 'public/project-reviews.json'), true)
  const catalog = value ? parseReviewCatalog(value) : { version: 1, generatedAt: new Date().toISOString(), reviews: {} }
  const failures = []
  const pending = []
  let reviewed = 0
  for (const repository of snapshot.repositories) {
    const key = repository.fullName.toLowerCase()
    const entry = catalog.reviews[key]
    if (!entry) { pending.push(key); continue }
    if (entry.provenance.repositoryId !== repository.id) {
      failures.push(`${key}: repository ID does not match current stars`)
      continue
    }
    if (entry.provenance.source === 'repository-metadata' && entry.sourceQuotes.length) failures.push(`${key}: metadata-only review must not quote an absent README`)
    const source = await readJson(path.join(root, '.cache/review-sources', `${repository.id}.json`), true)
    if (source) {
      if (!validRepository(source.repository) || source.repository.id !== repository.id || typeof source.readme !== 'string'
        || source.inputHash !== sourceHash(source.repository, source.readme)) {
        failures.push(`${key}: prepared source is invalid`)
      } else {
        failures.push(...sourceReviewErrors(entry, source).map((message) => `${key}: ${message}`))
      }
    }
    reviewed += 1
  }
  const result = { repositories: snapshot.repositories.length, reviewed, pending }
  if (strict && pending.length) failures.push(`Strict coverage failed: ${pending.length} repository review(s) missing: ${pending.join(', ')}`)
  if (failures.length) throw new Error(`Review validation failed:\n${failures.join('\n')}`)
  console.log(`Validated reviews: ${reviewed}/${result.repositories}; ${pending.length} explicitly pending${strict ? ' (strict)' : ''}`)
  return result
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  validateReviews({ strict: process.argv.includes('--strict') }).catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
