import type { StarredRepository } from './types'

export type SnapshotCache = {
  generatedAt: string | null
  repositories: StarredRepository[]
}

export function publicSnapshot(snapshot: SnapshotCache): SnapshotCache {
  const repositories = snapshot.repositories.filter((repository) => repository?.private === false)
  return repositories.length === snapshot.repositories.length ? snapshot : { ...snapshot, repositories }
}

export function newestSnapshot(current: SnapshotCache | null, incoming: SnapshotCache): SnapshotCache {
  const currentTime = Date.parse(current?.generatedAt ?? '')
  const incomingTime = Date.parse(incoming.generatedAt ?? '')

  return publicSnapshot(!current || !Number.isFinite(currentTime) || incomingTime > currentTime
    ? incoming
    : current)
}
