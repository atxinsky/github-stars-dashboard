import { readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseReviewCatalog } from '../src/reviewCatalog.ts'

// Text is authored by Codex after reading sources; this utility only merges and checks it.
const batchFiles = process.argv.slice(2)
if (!batchFiles.length) throw new Error('Pass only this run’s batch file paths; historical batches must not be replayed.')
const output = path.resolve('public/project-reviews.json')
let previous = { reviews: {} }
try { previous = parseReviewCatalog(JSON.parse(await readFile(output, 'utf8'))) }
catch (error) { if (error.code !== 'ENOENT') throw error }
const snapshot = JSON.parse(await readFile('public/stars-snapshot.json', 'utf8'))
const namesById = new Map(snapshot.repositories.map((repository) => [repository.id, repository.fullName.toLowerCase()]))
// Drop removed stars and old aliases after a repository rename.
const reviews = Object.fromEntries(Object.entries(previous.reviews).filter(([key, entry]) => namesById.get(entry.provenance.repositoryId) === key))
const owners = new Map()
for (const file of batchFiles) {
  const batch = JSON.parse(await readFile(file, 'utf8'))
  for (const [key, entry] of Object.entries(batch)) {
    if (namesById.get(entry.provenance.repositoryId) !== key) throw new Error(`Batch is outside the current snapshot: ${key}`)
    if (owners.has(key)) throw new Error(`Duplicate batch ownership: ${key} (${owners.get(key)}, ${file})`)
    owners.set(key, file)
    const source = JSON.parse(await readFile(`.cache/review-sources/${entry.provenance.repositoryId}.json`, 'utf8'))
    if (source.repository.fullName.toLowerCase() !== key || source.inputHash !== entry.provenance.inputHash
      || source.readmeSha !== entry.provenance.readmeSha || source.readmePath !== entry.provenance.readmePath) {
      throw new Error(`Source identity mismatch: ${key}`)
    }
    if (entry.sourceQuotes.some((quote) => !source.readme.includes(quote))) throw new Error(`Unmatched source quotation: ${key}`)
    reviews[key] = entry
  }
}
const catalog = parseReviewCatalog({ version: 1, generatedAt: new Date().toISOString(), reviews })
await writeFile(`${output}.tmp`, `${JSON.stringify(catalog, null, 2)}\n`)
await rename(`${output}.tmp`, output)
console.log(`Merged ${owners.size} authored reviews; catalog contains ${Object.keys(reviews).length} records.`)
