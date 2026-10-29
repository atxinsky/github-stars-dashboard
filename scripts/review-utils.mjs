import { createHash } from 'node:crypto'

export function gitBlobSha(text) {
  return createHash('sha1').update(`blob ${Buffer.byteLength(text, 'utf8')}\0`).update(text).digest('hex')
}

export function reviewMetadata(repository) {
  return {
    id: repository.id,
    fullName: repository.fullName,
    description: repository.description ?? null,
    language: repository.language ?? null,
    topics: [...(repository.topics ?? [])].sort(),
    pushedAt: repository.pushedAt ?? null,
    archived: Boolean(repository.archived),
    fork: Boolean(repository.fork),
    disabled: Boolean(repository.disabled),
    private: Boolean(repository.private),
    licenseName: repository.licenseName ?? null,
    homepage: repository.homepage ?? null,
    defaultBranch: repository.defaultBranch ?? null,
  }
}

export function metadataHash(repository) {
  return createHash('sha256').update(JSON.stringify(reviewMetadata(repository))).digest('hex')
}

export function sourceHash(repository, readme) {
  const metadata = reviewMetadata(repository)
  delete metadata.pushedAt
  return createHash('sha256').update(JSON.stringify({ repository: metadata, readme })).digest('hex')
}

export function validRepository(repository) {
  return repository && Number.isSafeInteger(repository.id) && repository.id > 0
    && typeof repository.fullName === 'string'
    && /^[a-z0-9][a-z0-9-]*\/[a-z0-9_.-]+$/i.test(repository.fullName)
}

export async function mapConcurrent(items, concurrency, work) {
  const results = new Array(items.length)
  let next = 0
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const index = next++
      results[index] = await work(items[index], index)
    }
  }))
  return results
}

export function errorStatus(error) {
  return error?.status ?? (Number(`${error?.stderr ?? ''}\n${error?.stdout ?? ''}\n${error?.message ?? ''}`.match(/HTTP\s+(\d{3})/i)?.[1]) || null)
}

export function sourceReviewErrors(entry, source) {
  const errors = []
  const provenance = entry.provenance
  if (provenance.repositoryId !== source.repository.id) errors.push('repository ID differs from source')
  if (provenance.inputHash !== source.inputHash) errors.push('input hash differs from source')
  if (provenance.readmePath !== source.readmePath || provenance.readmeSha !== source.readmeSha) errors.push('README path or SHA differs from source')
  if (provenance.source !== (source.readmePath === null ? 'repository-metadata' : 'readme')) errors.push('source type differs from prepared source')
  if (provenance.source === 'repository-metadata' && entry.sourceQuotes.length) errors.push('metadata-only review contains README quotations')
  if (entry.sourceQuotes.some((quote) => !source.readme.includes(quote))) errors.push('a source quotation is absent from the README')
  return errors
}
