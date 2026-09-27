export type ScoreResult = {
  filename: string
  pages: number
  score: number
  keywordCount: number
  matchedKeywords: string[]
  missingKeywords: string[]
}

type ScoreResponse = ({ success: true } & ScoreResult) | { success: false; error: string }

function isScoreResponse(body: unknown): body is ScoreResponse {
  return typeof body === 'object' && body !== null && 'success' in body
}

function fallbackMessage(status: number) {
  if (status === 413) return 'This file is too large. Try a resume under 4 MB.'
  if (status >= 500) return 'The scoring service is unavailable right now. Try again in a moment.'
  return `The request failed (HTTP ${status}).`
}

export async function scoreResume(resume: File, jobDescription: string): Promise<ScoreResult> {
  const form = new FormData()
  form.append('resume', resume)
  form.append('jobDescription', jobDescription)

  let res: Response
  try {
    res = await fetch('/api/score', { method: 'POST', body: form })
  } catch {
    throw new Error('Could not reach the scoring service. Check your connection and try again.')
  }

  // Platform errors (e.g. Vercel's body-size limit) come back as HTML, not our JSON.
  const body: unknown = await res.json().catch(() => null)
  if (!isScoreResponse(body)) throw new Error(fallbackMessage(res.status))
  if (!body.success) throw new Error(body.error)

  const { success: _success, ...result } = body
  return result
}
