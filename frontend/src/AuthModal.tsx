import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowRight, LoaderCircle, X } from 'lucide-react'
import { authenticate, type AuthUser } from './api'

export type AuthMode = 'login' | 'signup'

type AuthModalProps = {
  mode: AuthMode | null
  onModeChange: (mode: AuthMode) => void
  onClose: () => void
  onAuthenticated: (user: AuthUser) => void
}

const minPasswordLength = 8

const copy = {
  login: { title: 'Welcome back', subtitle: 'Log in to pick up where you left off.', submit: 'Log in', switchPrompt: 'New here?', switchLabel: 'Create an account' },
  signup: { title: 'Create your account', subtitle: 'Sign up with your email and a password.', submit: 'Sign up', switchPrompt: 'Already have an account?', switchLabel: 'Log in' },
} as const

export function AuthModal({ mode, onModeChange, onClose, onAuthenticated }: AuthModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (mode && !dialog.open) dialog.showModal()
    if (!mode && dialog.open) dialog.close()
  }, [mode])

  function close() {
    if (isSubmitting) return
    setPassword('')
    setError('')
    onClose()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!mode) return
    if (!email.trim()) {
      setError('Enter your email address.')
      return
    }
    if (mode === 'signup' && password.length < minPasswordLength) {
      setError(`Use a password of at least ${minPasswordLength} characters.`)
      return
    }
    if (!password) {
      setError('Enter your password.')
      return
    }
    setError('')
    setIsSubmitting(true)
    try {
      const user = await authenticate(mode, email.trim(), password)
      setPassword('')
      onAuthenticated(user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const text = copy[mode ?? 'login']

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="auth-title"
      onCancel={(event) => { event.preventDefault(); close() }}
      onClick={(event) => { if (event.target === event.currentTarget) close() }}
      className="m-auto w-[calc(100%-32px)] max-w-[400px] rounded-[22px] border border-[#eeeae3] bg-[#fffefa] p-0 text-[#232620] shadow-[0_24px_60px_-24px_rgba(43,47,37,0.45)] backdrop:bg-[#232620]/40 backdrop:backdrop-blur-[2px]"
    >
      <form onSubmit={handleSubmit} noValidate className="px-6 pb-6 pt-5 sm:px-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="auth-title" className="font-display text-[22px] font-bold tracking-[-0.6px]">{text.title}</h2>
            <p className="mt-1 text-[13px] text-[#777970]">{text.subtitle}</p>
          </div>
          <button type="button" onClick={close} aria-label="Close" className="-mr-2 grid size-9 shrink-0 place-items-center rounded-full text-[#85867d] transition-colors hover:bg-[#efebe4] hover:text-[#232620]"><X size={17} /></button>
        </div>

        <label htmlFor="auth-email" className="mt-6 block text-[13px] font-semibold">Email</label>
        <input
          id="auth-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={isSubmitting}
          className="mt-2 block w-full rounded-[14px] border border-[#d8d3c9] bg-[#fbfaf7] px-4 py-3 text-[13px] focus:border-[#d85e42] focus:outline-none"
        />

        <label htmlFor="auth-password" className="mt-4 block text-[13px] font-semibold">Password</label>
        <input
          id="auth-password"
          type="password"
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={isSubmitting}
          aria-describedby={mode === 'signup' ? 'auth-password-hint' : undefined}
          className="mt-2 block w-full rounded-[14px] border border-[#d8d3c9] bg-[#fbfaf7] px-4 py-3 text-[13px] focus:border-[#d85e42] focus:outline-none"
        />
        {mode === 'signup' && <p id="auth-password-hint" className="mt-1.5 text-[11px] text-[#85867d]">At least {minPasswordLength} characters.</p>}

        {error && <p role="alert" className="mt-4 text-[13px] font-medium text-[#bd4c34]">{error}</p>}

        <button type="submit" disabled={isSubmitting} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#303a34] px-6 py-3 text-[13px] font-semibold text-white transition-colors hover:bg-[#232620] disabled:cursor-wait disabled:opacity-70">
          {isSubmitting ? <><LoaderCircle size={15} className="animate-spin" /> Please wait...</> : <>{text.submit} <ArrowRight size={15} /></>}
        </button>

        <p className="mt-4 text-center text-[12px] text-[#777970]">
          {text.switchPrompt}{' '}
          <button type="button" disabled={isSubmitting} onClick={() => { setError(''); onModeChange(mode === 'signup' ? 'login' : 'signup') }} className="font-semibold text-[#d85e42] transition-colors hover:text-[#bd4c34]">
            {text.switchLabel}
          </button>
        </p>
      </form>
    </dialog>
  )
}
