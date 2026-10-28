import assert from 'node:assert/strict'
import test from 'node:test'
import { newestSnapshot, type SnapshotCache } from '../src/snapshot.ts'

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
