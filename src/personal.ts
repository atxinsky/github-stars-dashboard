export type PersonalStatus = 'unmarked' | 'try' | 'used' | 'skip'

export type PersonalEntry = {
  status: PersonalStatus
  note: string
  updatedAt: string
}

export type PersonalLibrary = Record<string, PersonalEntry>

export const PERSONAL_STORAGE_KEY = 'github-stars-dashboard:atxinsky:personal:v1'

export const PERSONAL_STATUS_LABELS: Record<PersonalStatus, string> = {
  unmarked: '未标记',
  try: '待尝试',
  used: '已用过',
  skip: '暂不考虑',
}

const MAX_ENTRIES = 10000
const MAX_NOTE_LENGTH = 10000
const ISO_DATE = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_DATE.test(value) || !Number.isFinite(Date.parse(value))) {
    return false
  }

  // Date.parse normalizes dates such as February 30; backups must contain an actual calendar date.
  const calendar = new Date(`${value.slice(0, 10)}T00:00:00Z`)
  return calendar.toISOString().slice(0, 10) === value.slice(0, 10)
}

export function parsePersonalImport(value: unknown): PersonalLibrary {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.personal)) {
    throw new Error('备份格式不正确，请选择版本为 1 的工具库备份。')
  }

  const entries = Object.entries(value.personal)
  if (entries.length > MAX_ENTRIES) {
    throw new Error('备份包含超过 10000 条记录，无法导入。')
  }

  const library: PersonalLibrary = {}
  for (const [id, entry] of entries) {
    if (!/^\d+$/.test(id) || !isRecord(entry)) {
      throw new Error('备份中包含无效的仓库 ID 或记录。')
    }
    if (typeof entry.status !== 'string' || !Object.hasOwn(PERSONAL_STATUS_LABELS, entry.status)) {
      throw new Error(`仓库 ${id} 的收藏状态不正确。`)
    }
    if (typeof entry.note !== 'string' || entry.note.length > MAX_NOTE_LENGTH) {
      throw new Error(`仓库 ${id} 的笔记必须是字符串，且不超过 10000 个字符。`)
    }
    if (!isIsoDate(entry.updatedAt)) {
      throw new Error(`仓库 ${id} 的更新时间不是有效的 ISO 日期。`)
    }

    // Copy only the public contract, never imported tokens or additional object properties.
    library[id] = {
      status: entry.status as PersonalStatus,
      note: entry.note,
      updatedAt: entry.updatedAt,
    }
  }
  return library
}

export function loadPersonalLibrary(): PersonalLibrary {
  try {
    const raw = localStorage.getItem(PERSONAL_STORAGE_KEY)
    return raw ? parsePersonalImport(JSON.parse(raw)) : {}
  } catch {
    return {}
  }
}

export function savePersonalLibrary(library: PersonalLibrary): boolean {
  try {
    const personal = parsePersonalImport({ version: 1, personal: library })
    localStorage.setItem(PERSONAL_STORAGE_KEY, JSON.stringify({ version: 1, personal }))
    return true
  } catch {
    return false
  }
}
