import { Check, Heart } from 'lucide-react'

const criteria = [
  { label: 'Impact & results', score: 88, color: 'bg-[#d85e42]' },
  { label: 'Clarity', score: 82, color: 'bg-[#87a390]' },
  { label: 'ATS readability', score: 76, color: 'bg-[#d2a83e]' },
]

export function SampleScoreCard() {
  return (
    <div className="relative rounded-[24px] border border-[#e9e4dc] bg-[#fffefa] p-5 shadow-[0_22px_70px_-42px_rgba(43,47,37,0.32)] sm:p-7">
      <div className="flex items-center justify-between border-b border-[#eeeae3] pb-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#98968d]">The first impression</p>
          <p className="mt-1.5 font-display text-[16px] font-bold">Your resume, at a glance</p>
        </div>
        <span className="rounded-full bg-[#f5eddd] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.8px] text-[#9b7836]">Sample</span>
      </div>

      <div className="flex items-center gap-5 py-6 sm:gap-7 sm:py-7">
        <div className="score-ring grid size-[104px] shrink-0 place-items-center rounded-full sm:size-[118px]" role="img" aria-label="Sample resume score: 82 out of 100">
          <div className="grid size-[81px] place-content-center rounded-full bg-[#fffefa] text-center sm:size-[93px]">
            <span className="font-display text-[32px] font-extrabold leading-none tracking-[-1.5px]">82<span className="text-[15px] text-[#929187]">/100</span></span>
            <span className="mt-1.5 text-[9px] font-bold uppercase tracking-[1px] text-[#898a80]">Your score</span>
          </div>
        </div>
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e7efe7] px-2.5 py-1 text-[10px] font-semibold text-[#567260]"><Check size={12} /> A solid start</span>
          <p className="mt-2.5 font-display text-[19px] font-bold leading-tight">Youre closer<br />than you think.</p>
          <p className="mt-1.5 text-[11px] text-[#898a80]">A few small tweaks could help.</p>
        </div>
      </div>

      <div className="space-y-4 border-t border-[#eeeae3] pt-5">
        {criteria.map((item) => (
          <div key={item.label}>
            <div className="mb-1.5 flex items-center justify-between text-[11px]">
              <span className="font-medium text-[#55584f]">{item.label}</span>
              <span className="font-semibold text-[#55584f]">{item.score}</span>
            </div>
            <div className="h-[5px] overflow-hidden rounded-full bg-[#eeece6]">
              <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.score}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-start gap-2.5 rounded-[13px] bg-[#f8f3e9] px-3.5 py-3">
        <Heart size={15} className="mt-0.5 shrink-0 text-[#c87d59]" />
        <p className="text-[11px] leading-[1.65] text-[#777366]">A real review should feel useful, not like a grade. Think of this as your next step, not the whole story.</p>
      </div>
      <p className="mt-4 text-center text-[10px] font-medium text-[#a09d93]">Illustrative score · no resume analyzed</p>
    </div>
  )
}
