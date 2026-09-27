export type ScoreResult = {
  filename: string
  pages: number
  score: number
  summary: string
  matchedSkills: string[]
  missingSkills: string[]
  suggestions: string[]
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
  if (!body.success) throw new Error(body.error || fallbackMessage(res.status))

  const { success: _success, ...result } = body
  return result
}

export type AuthUser = {
  id: string
  email: string
  createdAt: string
}

type AuthResponse = { success: true; token: string; user: AuthUser } | { success: false; error: string }
type MeResponse = { success: true; user: AuthUser } | { success: false; error: string }

const tokenKey = 'noted.token'

export function getToken() {
  return localStorage.getItem(tokenKey)
}

export function clearToken() {
  localStorage.removeItem(tokenKey)
}

function isAuthResponse(body: unknown): body is AuthResponse {
  return typeof body === 'object' && body !== null && 'success' in body
}

function isMeResponse(body: unknown): body is MeResponse {
  return typeof body === 'object' && body !== null && 'success' in body
}

export async function authenticate(mode: 'login' | 'signup', email: string, password: string): Promise<AuthUser> {
  let res: Response
  try {
    res = await fetch(`/api/auth/${mode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.')
  }

  const body: unknown = await res.json().catch(() => null)
  if (!isAuthResponse(body)) throw new Error(fallbackMessage(res.status))
  if (!body.success) throw new Error(body.error || fallbackMessage(res.status))

  localStorage.setItem(tokenKey, body.token)
  return body.user
}

// Returns null when there is no token or the server no longer accepts it.
export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const token = getToken()
  if (!token) return null

  const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
  if (res.status === 401) {
    clearToken()
    return null
  }
  const body: unknown = await res.json().catch(() => null)
  if (!isMeResponse(body) || !body.success) throw new Error(fallbackMessage(res.status))
  return body.user
}
