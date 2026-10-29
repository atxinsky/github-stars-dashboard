import { BookmarkCheck, BookmarkPlus, ChevronRight, FileCheck2, FileSearch, Star, TriangleAlert } from 'lucide-react'
import { compactNumber } from '../curation'
import { reviewEvidenceLabel, type LibraryRepository } from '../discovery'
import { categoryIconElement } from '../icons'
import { PROJECT_INTROS } from '../projectIntros'
import { PERSONAL_STATUS_LABELS, type PersonalStatus } from '../personal'

export function LibraryCard({ repo, selected, status, onSelect, onTry }: {
  repo: LibraryRepository; selected: boolean; status: PersonalStatus; onSelect: () => void; onTry: () => void
}) {
  const EvidenceIcon = repo.reviewed ? FileCheck2 : FileSearch
  const intro = PROJECT_INTROS[repo.fullName.toLowerCase()]
  const manageOnly = status === 'used' || status === 'skip'
  return (
    <article className={`library-card${selected ? ' is-selected' : ''}`} data-repository={repo.fullName}>
      <button className="card-open" onClick={onSelect} aria-label={`查看 ${repo.fullName}`} aria-pressed={selected}>
        <span className="project-symbol">{categoryIconElement(repo.category, 24)}</span>
        <span className="project-name"><strong>{repo.name}</strong><small>{repo.fullName}</small></span>
        <span className={`verdict ${repo.review.verdict === '值得先试' ? 'positive' : repo.review.verdict === '先观望' ? 'cautious' : ''}`}>{repo.review.verdict}</span>
        <ChevronRight size={17} className="card-chevron" />
      </button>
      <button className="card-value" onClick={onSelect} tabIndex={-1}>
        <span className="category-label">{repo.category}</span>
        <h2>{repo.review.title}</h2>
        {intro && <p className="card-hook">{intro.hook}</p>}
        <p>{intro ? intro.intro : repo.review.summary}</p>
      </button>
      <details className="card-more">
        <summary>展开介绍</summary>
        {intro && <ul className="card-highlights">{intro.highlights.map((item) => <li key={item}>{item}</li>)}</ul>}
        {intro && <p>{repo.review.summary}</p>}
        <p><strong>为什么值得看：</strong>{repo.review.why}</p>
        <p><strong>适合：</strong>{repo.review.bestFor.join('；')}</p>
        <p className="card-facts">{[repo.language, `上手难度 ${repo.review.effort}`, repo.review.setup, ...(repo.topics ?? []).slice(0, 4).map((topic) => `#${topic}`)].filter(Boolean).join(' · ')}</p>
      </details>
      <p className="card-caveat"><TriangleAlert size={14} /><span>{repo.review.caveats[0]}</span></p>
      <footer className="card-footer">
        <span className={`evidence-label${repo.reviewed ? ' checked' : ''}`}><EvidenceIcon size={14} />{reviewEvidenceLabel(repo)}</span>
        <span className="star-count" title="GitHub 收藏数量，不代表质量或实测评分"><Star size={13} />{compactNumber(repo.stargazersCount)}</span>
        <button className={`save-project${status === 'try' ? ' saved' : ''}`} onClick={manageOnly ? onSelect : onTry} aria-label={`${manageOnly ? '管理状态' : status === 'try' ? '移出待尝试' : '加入待尝试'} ${repo.fullName}`}>
          {status === 'try' ? <BookmarkCheck size={15} /> : <BookmarkPlus size={15} />}
          {status === 'unmarked' ? '加入待尝试' : PERSONAL_STATUS_LABELS[status]}
        </button>
      </footer>
    </article>
  )
}
