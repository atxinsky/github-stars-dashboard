import type { StarredRepository } from './types'

export type SnapshotCache = {
  generatedAt: string | null
  repositories: StarredRepository[]
}

export function newestSnapshot(current: SnapshotCache | null, incoming: SnapshotCache): SnapshotCache {
  const currentTime = Date.parse(current?.generatedAt ?? '')
  const incomingTime = Date.parse(incoming.generatedAt ?? '')

  return !current || !Number.isFinite(currentTime) || incomingTime > currentTime
    ? incoming
    : current
}
