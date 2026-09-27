import type { CSSProperties } from 'react'
import { Check, Info, Lightbulb, X } from 'lucide-react'
import type { ScoreResult } from './api'

function verdictFor(score: number) {
  // Bands follow the rubric the labd prompt scores against.
  if (score >= 70) return { label: 'Strong match', headline: "You speak this job's language.", tone: 'bg-[#e7efe7] text-[#567260]' }
  if (score >= 40) return { label: 'Partial match', headline: 'Close, with a few gaps.', tone: 'bg-[#f5eddd] text-[#9b7836]' }
  return { label: 'Needs work', headline: 'Worth tailoring for this role.', tone: 'bg-[#f8e8df] text-[#b5543c]' }
}

function SkillList({ title, skills, matched }: { title: string; skills: string[]; matched: boolean }) {
  if (skills.length === 0) return null
  const Icon = matched ? Check : X
  const chip = matched ? 'bg-[#e7efe7] text-[#4c6755]' : 'bg-[#f8e8df] text-[#a64c35]'
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold text-[#55584f]">{title} <span className="font-normal text-[#98968d]">({skills.length})</span></p>
      <ul className="flex flex-wrap gap-1.5">
        {skills.map((skill) => (
          <li key={skill} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${chip}`}>
            <Icon size={11} strokeWidth={2.4} /> {skill}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ScoreResultCard({ result }: { result: ScoreResult }) {
  const verdict = verdictFor(result.score)
  return (
    <div className="relative rounded-[24px] border border-[#e9e4dc] bg-[#fffefa] p-5 shadow-[0_22px_70px_-42px_rgba(43,47,37,0.32)] sm:p-7">
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
            {result.matchedSkills.length} of {result.matchedSkills.length + result.missingSkills.length} skills checked are on your resume
          </p>
        </div>
      </div>

      <p className="border-t border-[#eeeae3] pt-5 text-[12px] leading-[1.7] text-[#55584f]">{result.summary}</p>

      <div className="mt-5 space-y-4">
        <SkillList title="Missing from your resume" skills={result.missingSkills} matched={false} />
        <SkillList title="Already covered" skills={result.matchedSkills} matched />
      </div>

      {result.suggestions.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-[11px] font-semibold text-[#55584f]">What to change</p>
          <ul className="space-y-2">
            {result.suggestions.map((suggestion) => (
              <li key={suggestion} className="flex items-start gap-2 text-[11px] leading-[1.6] text-[#55584f]">
                <Lightbulb size={13} className="mt-0.5 shrink-0 text-[#d2a83e]" /> {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 flex items-start gap-2.5 rounded-[13px] bg-[#f8f3e9] px-3.5 py-3">
        <Info size={15} className="mt-0.5 shrink-0 text-[#c87d59]" />
        <p className="text-[11px] leading-[1.65] text-[#777366]">This score is an AI estimate of how well your resume fits this posting. Add missing skills only where they're true for you.</p>
      </div>
    </div>
  )
}
