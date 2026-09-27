import type { CSSProperties } from 'react'
import { Check, Info, X } from 'lucide-react'
import type { ScoreResult } from './api'

function verdictFor(score: number) {
  if (score >= 75) return { label: 'Strong match', headline: "You speak this job's language.", tone: 'bg-[#e7efe7] text-[#567260]' }
  if (score >= 50) return { label: 'Partial match', headline: 'Close, with a few gaps.', tone: 'bg-[#f5eddd] text-[#9b7836]' }
  return { label: 'Needs work', headline: 'Worth tailoring for this role.', tone: 'bg-[#f8e8df] text-[#b5543c]' }
}

function KeywordList({ title, keywords, matched }: { title: string; keywords: string[]; matched: boolean }) {
  if (keywords.length === 0) return null
  const Icon = matched ? Check : X
  const chip = matched ? 'bg-[#e7efe7] text-[#4c6755]' : 'bg-[#f8e8df] text-[#a64c35]'
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold text-[#55584f]">{title} <span className="font-normal text-[#98968d]">({keywords.length})</span></p>
      <ul className="flex flex-wrap gap-1.5">
        {keywords.map((keyword) => (
          <li key={keyword} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${chip}`}>
            <Icon size={11} strokeWidth={2.4} /> {keyword}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ScoreResultCard({ result }: { result: ScoreResult }) {
  const verdict = verdictFor(result.score)
  return (
    <div className="relative rounded-[24px] border border-[#e9e4dc] bg-[#fffefa] p-5 shadow-[0_22px_70px_-42px_rgba(43,47,37,0.32)] sm:p-7" aria-live="polite">
      <div className="flex items-center justify-between gap-4 border-b border-[#eeeae3] pb-5">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#98968d]">Match against your JD</p>
          <p className="mt-1.5 truncate font-display text-[16px] font-bold">{result.filename}</p>
        </div>
        <span className="shrink-0 rounded-full bg-[#e7efe7] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.8px] text-[#567260]">Your result</span>
      </div>

      <div className="flex items-center gap-5 py-6 sm:gap-7 sm:py-7">
        <div className="score-ring grid size-[104px] shrink-0 place-items-center rounded-full sm:size-[118px]" style={{ '--score': `${result.score}%` } as CSSProperties} role="img" aria-label={`Resume match score: ${result.score} out of 100`}>
          <div className="grid size-[81px] place-content-center rounded-full bg-[#fffefa] text-center sm:size-[93px]">
            <span className="font-display text-[32px] font-extrabold leading-none tracking-[-1.5px]">{result.score}<span className="text-[15px] text-[#929187]">/100</span></span>
            <span className="mt-1.5 text-[9px] font-bold uppercase tracking-[1px] text-[#898a80]">Your score</span>
          </div>
        </div>
        <div>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${verdict.tone}`}>{verdict.label}</span>
          <p className="mt-2.5 font-display text-[19px] font-bold leading-tight">{verdict.headline}</p>
          <p className="mt-1.5 text-[11px] text-[#898a80]">
            {result.matchedKeywords.length} of {result.keywordCount} key terms found
          </p>
        </div>
      </div>

      <div className="space-y-4 border-t border-[#eeeae3] pt-5">
        <KeywordList title="Missing from your resume" keywords={result.missingKeywords} matched={false} />
        <KeywordList title="Already covered" keywords={result.matchedKeywords} matched />
      </div>

      <div className="mt-5 flex items-start gap-2.5 rounded-[13px] bg-[#f8f3e9] px-3.5 py-3">
        <Info size={15} className="mt-0.5 shrink-0 text-[#c87d59]" />
        <p className="text-[11px] leading-[1.65] text-[#777366]">The score is the share of the job description's key terms that appear in your resume, weighted by how often the posting repeats them. Add missing terms only where they're true for you.</p>
      </div>
    </div>
  )
}
