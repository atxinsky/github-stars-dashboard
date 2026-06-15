export type StarredRepository = {
  id: number
  name: string
  fullName: string
  owner: string
  htmlUrl: string
  description: string | null
  language: string | null
  topics: string[]
  stargazersCount: number
  forksCount: number
  openIssuesCount: number
  watchersCount: number
  createdAt: string | null
  updatedAt: string | null
  pushedAt: string | null
  starredAt: string | null
  archived: boolean
  fork: boolean
  disabled: boolean
  private: boolean
  licenseName: string | null
  homepage: string | null
  defaultBranch: string | null
  size: number
}

export type StarsSnapshot = {
  username: string
  generatedAt: string | null
  source: string
  count: number
  repositories: StarredRepository[]
}

export type SyncProgress = {
  page: number
  lastPage: number | null
  totalLoaded: number
  remaining: string | null
}
