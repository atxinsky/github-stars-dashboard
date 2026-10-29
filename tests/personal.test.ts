import assert from 'node:assert/strict'
import test from 'node:test'
import {
  loadPersonalLibrary,
  parsePersonalImport,
  PERSONAL_STATUS_LABELS,
  PERSONAL_STORAGE_KEY,
  savePersonalLibrary,
  type PersonalEntry,
  type PersonalLibrary,
} from '../src/personal.ts'

const entry: PersonalEntry = {
  status: 'try',
  note: '用自己的讲义试一下，记录实际效果。',
  updatedAt: '2026-10-29T09:00:00.000Z',
}

function withStorage(storage: Pick<Storage, 'getItem' | 'setItem'>, run: () => void) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage })
  try {
    run()
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
}

test('valid notes and statuses round-trip without additional credentials or metadata', () => {
  const values = new Map<string, string>()
  withStorage({ getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value) } }, () => {
    const library: PersonalLibrary = { '1124219907': entry }
    assert.equal(savePersonalLibrary(library), true)
    assert.deepEqual(loadPersonalLibrary(), library)
    assert.deepEqual(JSON.parse(values.get(PERSONAL_STORAGE_KEY)!), { version: 1, personal: library })
    assert.deepEqual(PERSONAL_STATUS_LABELS, { unmarked: '未标记', try: '待尝试', used: '已用过', skip: '暂不考虑' })
  })
})

test('import extracts only personal state and removes unexpected fields from entries', () => {
  const value = {
    version: 1,
    personal: { '123': { ...entry, token: 'must-not-survive' } },
    token: 'must-not-survive',
    repositories: [{ id: 123 }],
  }
  assert.deepEqual(parsePersonalImport(value), { '123': entry })
  assert.deepEqual(parsePersonalImport({ version: 1, personal: {} }), {})
  assert.deepEqual(parsePersonalImport({ version: 1, personal: { '123': { ...entry, note: '' } } }), {
    '123': { ...entry, note: '' },
  })
})

test('unsupported, old, or malformed backup envelopes are rejected', () => {
  for (const value of [null, [], {}, { version: 2, personal: {} }, { personal: {} }, { version: 1, personal: [] }, { '123': entry }]) {
    assert.throws(() => parsePersonalImport(value), /备份格式不正确/)
  }
})

test('invalid entries cause full import rejection instead of partially importing valid records', () => {
  for (const invalid of [
    { ...entry, status: 'unknown' },
    { ...entry, status: 'toString' },
    { ...entry, note: null },
    { ...entry, note: 'a'.repeat(10001) },
    { ...entry, updatedAt: 'yesterday' },
    { ...entry, updatedAt: '2026-02-30T09:00:00Z' },
    { ...entry, updatedAt: '2026-10-29' },
  ]) {
    assert.throws(() => parsePersonalImport({ version: 1, personal: { '123': entry, '456': invalid } }))
  }
})

test('non-numeric and prototype-related keys cannot enter the personal library', () => {
  for (const id of ['__proto__', 'constructor', 'prototype', 'repo/123', '-12', '1.5']) {
    const personal = JSON.parse(JSON.stringify({ [id]: entry }))
    assert.throws(() => parsePersonalImport({ version: 1, personal }), /无效的仓库 ID/)
  }
  assert.throws(() => parsePersonalImport({ version: 1, personal: Object.create({ '123': entry }) }))
  assert.equal(Object.hasOwn(Object.prototype, 'note'), false)
})

test('large notes, valid timezone offsets, and at most 10000 entries are accepted', () => {
  const personal = Object.fromEntries(Array.from({ length: 10000 }, (_, index) => [String(index), entry]))
  assert.equal(Object.keys(parsePersonalImport({ version: 1, personal })).length, 10000)
  personal['10000'] = entry
  assert.throws(() => parsePersonalImport({ version: 1, personal }), /超过 10000 条/)
  const valid = { ...entry, note: 'a'.repeat(10000), updatedAt: '2024-02-29T17:00:00+08:00' }
  assert.deepEqual(parsePersonalImport({ version: 1, personal: { '123': valid } }), { '123': valid })
})

test('missing, damaged, or old stored data loads as an empty library', () => {
  for (const value of [null, '{broken', '{}', JSON.stringify({ '123': entry }), JSON.stringify({ version: 1, personal: { '123': { ...entry, note: null } } })]) {
    withStorage({ getItem: () => value, setItem: () => {} }, () => {
      assert.deepEqual(loadPersonalLibrary(), {})
    })
  }
})

test('browser storage failures do not throw or pretend a save succeeded', () => {
  withStorage({ getItem: () => { throw new Error('storage blocked') }, setItem: () => { throw new Error('quota exceeded') } }, () => {
    assert.deepEqual(loadPersonalLibrary(), {})
    assert.equal(savePersonalLibrary({ '123': entry }), false)
  })
})
