import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react'
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  FileText,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from 'lucide-react'
import { scoreResume, type ScoreResult } from './api'
import { SampleScoreCard } from './SampleScoreCard'
import { ScoreResultCard } from './ScoreResultCard'

const acceptedExtensions = /\.pdf$/i
const maxFileSize = 4 * 1024 * 1024
const maxJobDescriptionLength = 20000

function formatFileSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function App() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [isScoring, setIsScoring] = useState(false)
  const [result, setResult] = useState<ScoreResult | null>(null)
  const resultRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (result) resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [result])

  function addFile(nextFile?: File) {
    // Each score spends labd credits, so the file is locked until the current one returns.
    if (!nextFile || isScoring) return
    if (!acceptedExtensions.test(nextFile.name)) {
      setError('Choose a PDF file to continue.')
      return
    }
    if (nextFile.size > maxFileSize) {
      setError('This file is over 4 MB. Try a smaller resume.')
      return
    }
    setError('')
    setResult(null)
    setFile(nextFile)
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    addFile(event.target.files?.[0])
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)
    addFile(event.dataTransfer.files[0])
  }

  function clearFile() {
    setFile(null)
    setResult(null)
    setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!file) {
      setError('Add your resume first.')
      return
    }
    if (!jobDescription.trim()) {
      setError('Paste the job description you want to be scored against.')
      return
    }
    if (jobDescription.trim().length > maxJobDescriptionLength) {
      setError(`The job description is too long. Keep it under ${maxJobDescriptionLength.toLocaleString('en-IN')} characters.`)
      return
    }
    setError('')
    setIsScoring(true)
    try {
      setResult(await scoreResume(file, jobDescription))
    } catch (err) {
      setResult(null)
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
    } finally {
      setIsScoring(false)
    }
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#f6f4ef] text-[#232620]">
      <header className="mx-auto flex max-w-[1240px] items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <a href="#top" className="flex items-center gap-2.5" aria-label="Noted home">
          <span className="grid size-9 place-items-center rounded-[12px] bg-[#303a34] text-[#f5c966]">
            <Sparkles size={18} strokeWidth={1.8} />
          </span>
          <span className="font-display text-[21px] font-extrabold tracking-[-0.7px]">noted<span className="text-[#d85e42]">.</span></span>
        </a>

        <nav className="hidden items-center gap-8 text-[13px] font-medium text-[#777970] sm:flex">
          <a className="transition-colors hover:text-[#232620]" href="#how-it-works">How it works</a>
          <a className="transition-colors hover:text-[#232620]" href="#your-privacy">Your privacy</a>
        </nav>

        <a href="#upload" className="inline-flex items-center gap-2 rounded-full bg-[#303a34] px-4 py-2.5 text-[12px] font-semibold text-white transition-transform hover:-translate-y-0.5 sm:px-5 sm:text-[13px]">
          Get your score <ArrowUpRight size={15} />
        </a>
      </header>

      <main id="top" className="mx-auto max-w-[1240px] px-5 pb-16 sm:px-8 lg:px-12">
        <section className="grid items-center gap-10 pb-16 pt-10 sm:pt-14 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16 lg:pb-24 lg:pt-20">
          <div className="animate-rise">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#e6ddd0] bg-[#fbfaf7] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.7px] text-[#686c61]">
              <span className="size-1.5 rounded-full bg-[#d85e42]" /> A little clarity goes a long way
            </div>
            <h1 className="font-display max-w-[630px] text-[clamp(48px,7vw,78px)] font-extrabold leading-[0.99] tracking-[-3.6px]">
              Hey, your next job starts <span className="relative inline-block whitespace-nowrap text-[#d85e42]">right here<span className="absolute -bottom-1 left-0 -z-0 h-[5px] w-full rounded-full bg-[#e9cc82] sm:bottom-0 sm:h-[7px]" /></span>.
            </h1>
            <p className="mt-6 max-w-[440px] text-[16px] leading-7 text-[#777970] sm:text-[17px]">
              Get your resume reviewed and get a score. Find out whats working, what isnt, and where to focus next.
            </p>

            <form id="upload" onSubmit={handleSubmit} noValidate className="mt-9 scroll-mt-8">
              <input
                ref={fileInputRef}
                className="sr-only"
                type="file"
                accept=".pdf,application/pdf"
                disabled={isScoring}
                onChange={handleFileChange}
                aria-label="Choose your resume"
              />
              <div
                onDragEnter={(event) => { event.preventDefault(); setIsDragging(true) }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragging(false)
                }}
                onDrop={handleDrop}
                className={`relative flex min-h-[170px] flex-col justify-center rounded-[20px] border border-dashed px-5 py-5 transition-colors sm:px-7 ${isDragging ? 'border-[#d85e42] bg-[#fff1e9]' : 'border-[#d8d3c9] bg-[#fbfaf7]'}`}
              >
                {file ? (
                  <div className="flex items-center gap-4">
                    <span className="grid size-12 shrink-0 place-items-center rounded-[14px] bg-[#f2e8dc] text-[#b76a4d]"><FileText size={22} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold">{file.name}</p>
                      <p className="mt-1 text-[12px] text-[#85867d]">{formatFileSize(file.size)} · Ready to score</p>
                    </div>
                    <button type="button" onClick={clearFile} disabled={isScoring} title="Remove file" aria-label="Remove file" className="grid size-9 shrink-0 place-items-center rounded-full text-[#85867d] transition-colors hover:bg-[#efebe4] hover:text-[#232620] disabled:cursor-wait disabled:opacity-40"><X size={17} /></button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center sm:flex-row sm:text-left">
                    <span className="mb-4 grid size-12 shrink-0 place-items-center rounded-[14px] bg-[#f2e8dc] text-[#b76a4d] sm:mb-0 sm:mr-5"><Upload size={21} strokeWidth={1.8} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold">Drop your resume here</p>
                      <p className="mt-1 text-[12px] text-[#85867d]">PDF · up to 4 MB</p>
                    </div>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-4 inline-flex shrink-0 items-center gap-2 rounded-full bg-[#d85e42] px-5 py-3 text-[13px] font-semibold text-white transition-colors hover:bg-[#bd4c34] sm:ml-4 sm:mt-0">
                      Choose a file <ArrowRight size={15} />
                    </button>
                  </div>
                )}
              </div>
              <label htmlFor="job-description" className="mt-5 block text-[13px] font-semibold">Job description</label>
              <textarea
                id="job-description"
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                rows={6}
                placeholder="Paste the full job posting here"
                className="mt-2 block w-full resize-y rounded-[16px] border border-[#d8d3c9] bg-[#fbfaf7] px-4 py-3 text-[13px] leading-6 placeholder:text-[#a09d93] focus:border-[#d85e42] focus:outline-none"
              />
              <button type="submit" disabled={isScoring} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#303a34] px-6 py-3 text-[13px] font-semibold text-white transition-colors hover:bg-[#232620] disabled:cursor-wait disabled:opacity-70">
                {isScoring ? <><LoaderCircle size={15} className="animate-spin" /> Scoring...</> : <>Score my resume <ArrowRight size={15} /></>}
              </button>
              {isScoring && <p role="status" className="mt-3 text-[12px] text-[#85867d]">Reading your resume against the posting. This usually takes about 30 seconds.</p>}
              {error && <p role="alert" className="mt-3 text-[13px] font-medium text-[#bd4c34]">{error}</p>}
              <p className="mt-3 flex items-center gap-1.5 text-[11px] text-[#85867d]"><ShieldCheck size={13} /> We save your resume's text, the job description and your score. Scoring runs on labd, our AI provider.</p>
            </form>

            <a href="#how-it-works" className="mt-7 inline-flex items-center gap-2 text-[12px] font-semibold text-[#55584f] transition-colors hover:text-[#d85e42]">
              A peek at your review <ArrowDown size={14} />
            </a>
          </div>

          <div ref={resultRef} className="animate-rise animation-delay-150 relative mx-auto w-full max-w-[490px] scroll-mt-8 lg:ml-auto">
            <div className="absolute -right-5 -top-6 -z-0 size-28 rounded-full bg-[#eee4d4] sm:-right-8 sm:-top-8 sm:size-36" />
            <div className="absolute -bottom-5 -left-5 -z-0 size-[74px] rounded-[24px] bg-[#dfe6dc] sm:-bottom-6 sm:-left-7 sm:size-[88px]" />
            <p role="status" className="sr-only">{result ? `Your score: ${result.score} out of 100. ${result.summary}` : ''}</p>
            {result ? <ScoreResultCard result={result} /> : <SampleScoreCard />}
            {!result && <div className="absolute -right-2 top-[27%] hidden rotate-[5deg] items-center gap-2.5 rounded-[13px] border border-[#eeeae3] bg-[#fffefa] px-3.5 py-3 shadow-[0_8px_26px_-16px_rgba(43,47,37,0.35)] sm:flex">
              <span className="grid size-8 place-items-center rounded-[10px] bg-[#f8e8df] text-[#cb654b]"><Sparkles size={15} /></span>
              <div><p className="text-[10px] font-bold">One clear next step</p><p className="mt-0.5 text-[9px] text-[#898a80]">Make your impact easy to spot</p></div>
            </div>}
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-8 border-t border-[#e5e0d7] py-12 sm:py-16">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#b46d53]">No guesswork, just a starting point</p>
              <h2 className="font-display mt-2.5 text-[26px] font-bold tracking-[-0.8px] sm:text-[32px]">A clearer next step, in three parts.</h2>
            </div>
            <p className="max-w-[340px] text-[13px] leading-6 text-[#777970]">A friendly look at the details that help a resume tell your story.</p>
          </div>
          <div className="mt-9 grid gap-7 sm:grid-cols-3 sm:gap-8">
            {[
              { number: '01', title: 'Add your resume', copy: "Choose a PDF and paste the job description you're aiming for.", icon: Upload },
              { number: '02', title: 'See what stands out', copy: "An AI reviewer checks your resume against what the role asks for.", icon: Sparkles },
              { number: '03', title: 'Find your next move', copy: 'Focus on a few thoughtful edits instead of rewriting everything.', icon: ArrowUpRight },
            ].map((step) => (
              <article key={step.number} className="border-t border-[#dcd6cc] pt-4">
                <div className="flex items-center justify-between">
                  <span className="font-display text-[12px] font-bold text-[#b46d53]">{step.number}</span>
                  <step.icon size={16} strokeWidth={1.7} className="text-[#87877d]" />
                </div>
                <h3 className="font-display mt-5 text-[16px] font-bold">{step.title}</h3>
                <p className="mt-2 max-w-[310px] text-[12px] leading-[1.8] text-[#777970]">{step.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="your-privacy" className="flex flex-col justify-between gap-4 rounded-[18px] bg-[#303a34] px-5 py-5 text-white sm:flex-row sm:items-center sm:px-7">
          <div className="flex items-start gap-3.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-[12px] bg-white/10 text-[#f5c966]"><ShieldCheck size={18} /></span>
            <div><h2 className="font-display text-[13px] font-bold">Your resume stays yours.</h2><p className="mt-1 text-[11px] leading-[1.7] text-white/65">We save your resume's text, the job description and your score. The text is sent to labd, our AI provider, for scoring. We never keep the PDF file itself.</p></div>
          </div>
          <a href="#upload" className="inline-flex shrink-0 items-center gap-2 text-[12px] font-semibold text-[#f5c966] transition-colors hover:text-white">Score your resume <ArrowUpRight size={15} /></a>
        </section>
      </main>

      <footer className="mx-auto flex max-w-[1240px] flex-col justify-between gap-2 px-5 pb-7 text-[10px] text-[#929187] sm:flex-row sm:items-center sm:px-8 lg:px-12">
        <span>noted. A friendlier first look at your next move.</span>
        <span>Scores are AI guidance, not a hiring decision</span>
      </footer>
    </div>
  )
}

export default App