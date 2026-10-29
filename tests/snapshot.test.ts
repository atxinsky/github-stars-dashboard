import assert from 'node:assert/strict'
import test from 'node:test'
import { newestSnapshot, publicSnapshot, type SnapshotCache } from '../src/snapshot.ts'
import { buildLibrary } from '../src/discovery.ts'
import type { StarredRepository } from '../src/types.ts'

const older: SnapshotCache = { generatedAt: '2026-06-15T00:00:00Z', repositories: [] }
const newer: SnapshotCache = { generatedAt: '2026-10-28T00:00:00Z', repositories: [] }

test('a fresh server snapshot replaces old browser data', () => {
  assert.equal(newestSnapshot(older, newer), newer)
})

test('a late server response cannot replace a newer manual update', () => {
  assert.equal(newestSnapshot(newer, older), newer)
})

test('an empty refreshed list is accepted, including removal of all stars', () => {
  assert.equal(newestSnapshot(older, newer).repositories.length, 0)
  assert.equal(newestSnapshot(older, newer).generatedAt, newer.generatedAt)
})

test('no cache or a cache without a valid date does not block server data', () => {
  assert.equal(newestSnapshot(null, newer), newer)
  assert.equal(newestSnapshot({ ...older, generatedAt: null }, newer), newer)
  assert.equal(newestSnapshot({ ...older, generatedAt: 'invalid' }, newer), newer)
})

test('an undated server snapshot does not replace valid cached data', () => {
  assert.equal(newestSnapshot(newer, { ...older, generatedAt: null }), newer)
})

test('equally dated snapshots preserve current state', () => {
  assert.equal(newestSnapshot(newer, { ...newer }), newer)
})

const publicRepository = { id: 1, fullName: 'example/public-project', name: 'public-project', owner: 'example', private: false, topics: [] } as unknown as StarredRepository
const privateRepository = { ...publicRepository, id: 2, fullName: 'example/private-project', private: true }

test('initial cached and incoming snapshots retain only explicitly public repositories', () => {
  const contaminated = { ...older, repositories: [publicRepository, privateRepository, { ...publicRepository, id: 3, private: undefined } as unknown as StarredRepository] }
  assert.deepEqual(publicSnapshot(contaminated).repositories, [publicRepository])
  assert.deepEqual(newestSnapshot(null, contaminated).repositories, [publicRepository])
  assert.equal(contaminated.repositories.length, 3)
})

test('a newer current snapshot is sanitized even when an older server response loses', () => {
  const current = { ...newer, repositories: [publicRepository, privateRepository] }
  const selected = newestSnapshot(current, older)
  assert.equal(selected.generatedAt, newer.generatedAt)
  assert.deepEqual(selected.repositories, [publicRepository])
})

test('the display library independently excludes private and unverified repositories', () => {
  assert.deepEqual(buildLibrary([privateRepository]), [])
  assert.deepEqual(buildLibrary([{ ...privateRepository, private: undefined } as unknown as StarredRepository]), [])
})
