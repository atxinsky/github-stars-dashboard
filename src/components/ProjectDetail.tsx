import { useState } from 'react'
import { ArrowUpRight, Check, ExternalLink, FileCheck2, Flag, NotebookPen, Star, TriangleAlert, X } from 'lucide-react'
import { compactNumber, formatDate } from '../curation'
import { reviewEvidenceLabel, type LibraryRepository } from '../discovery'
import { categoryIconElement } from '../icons'
import { PERSONAL_STATUS_LABELS, type PersonalEntry, type PersonalStatus } from '../personal'

export function ProjectDetail({ repo, entry, mobileOpen, onClose, onSave }: {
  repo: LibraryRepository; entry?: PersonalEntry; mobileOpen: boolean; onClose: () => void
  onSave: (patch: { status?: PersonalStatus; note?: string }) => void
}) {
  const [note, setNote] = useState(entry?.note ?? '')
  return (
    <>
      {mobileOpen ? <button className="detail-backdrop" aria-label="关闭项目详情" onClick={onClose} /> : null}
      <aside className={`project-detail${mobileOpen ? ' mobile-open' : ''}`} aria-label={`${repo.name} 项目详情`}>
        <button className="detail-close" onClick={onClose} aria-label="关闭详情"><X size={19} /></button>
        <div className="detail-header">
          <span className="project-symbol">{categoryIconElement(repo.category, 26)}</span>
          <div className="project-name"><h2>{repo.name}</h2><a href={repo.htmlUrl} target="_blank" rel="noreferrer">{repo.fullName}<ArrowUpRight size={14} /></a></div>
          <span className="star-count"><Star size={14} />{compactNumber(repo.stargazersCount)}</span>
        </div>
        <div className="detail-tags"><span>{repo.category}</span><span className={`verdict ${repo.review.verdict === '值得先试' ? 'positive' : ''}`}>{repo.review.verdict}</span></div>
        <section className="detail-section">
          <h3>为什么值得关注</h3>
          <p className="detail-value">{repo.review.title}</p>
          <p>{repo.review.why}</p>
        </section>
        <section className="detail-section">
          <h3>适合拿来做什么</h3>
          <ul className="use-cases">{repo.review.bestFor.map((item) => <li key={item}><Check size={15} /><span>{item}</span></li>)}</ul>
        </section>
        <section className="detail-section caveat-section">
          <h3>动手前要知道 <TriangleAlert size={15} /></h3>
          <ul>{repo.review.caveats.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
        <div className="detail-facts"><div><small>使用门槛</small><strong>{repo.review.effort} · {repo.review.setup}</strong></div><div><small>维护情况</small><strong>{repo.archived ? '已归档' : repo.disabled ? '已停用' : repo.pushedDaysAgo === null ? '更新信息缺失' : repo.pushedDaysAgo > 365 ? '较久未更新' : '近一年有更新'}</strong><span>最近推送 {formatDate(repo.pushedAt)}</span></div></div>
        <section className="detail-section sources-section">
          <h3>评价依据与来源</h3>
          <p className="evidence-explainer">{reviewEvidenceLabel(repo)}。{repo.reviewSource === 'editorial'
            ? `说明解读日期 ${repo.review.checkedAt}，尚未部署实测。`
            : repo.reviewSource === 'ai'
              ? `由 ${repo.generatedReview?.provenance.model} 生成于 ${repo.generatedReview?.provenance.generatedAt.slice(0, 10)}。${repo.generatedReview?.provenance.source === 'readme' ? '基于项目 README 分析，尚未部署实测。' : '仅取得仓库元数据，信息不足的部分保留限制，不代表已读取 README 或实测。'}`
              : '详细评价尚在生成；当前仅依据仓库简介与标签初筛，暂不据此承诺功能和效果。'}</p>
          {repo.generatedReview?.sourceQuotes.length ? <details><summary>查看原始依据摘录</summary>{repo.generatedReview.sourceQuotes.map((quote, index) => <blockquote key={index} style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{quote}</blockquote>)}</details> : null}
          {repo.review.evidence.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.url}><FileCheck2 size={14} /><span>{source.label}</span><ExternalLink size={12} /></a>)}
          <a href={repo.htmlUrl} target="_blank" rel="noreferrer"><ArrowUpRight size={14} /><span>在 GitHub 查看项目</span></a>
        </section>
        <section className="detail-section personal-section">
          <label className="personal-status"><span><Flag size={14} />我的状态</span><select value={entry?.status ?? 'unmarked'} onChange={(event) => onSave({ status: event.target.value as PersonalStatus, note })} aria-label="我的使用状态">{Object.entries(PERSONAL_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="note-label" htmlFor="project-note"><NotebookPen size={14} />个人笔记<span>{note.length} / 10000</span></label>
          <textarea id="project-note" value={note} maxLength={10000} onChange={(event) => setNote(event.target.value)} placeholder="记下你为什么收藏它，或你的使用想法…" rows={3} />
          <button className="primary-button note-save" onClick={() => onSave({ note })}>保存笔记</button>
          <p className="personal-help">状态和笔记仅保存在当前浏览器；可导出备份，换设备后导入。</p>
        </section>
      </aside>
    </>
  )
}
