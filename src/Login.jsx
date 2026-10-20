import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState('email')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function sendCode() {
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim() })
    setBusy(false)
    if (error) setError(error.message)
    else setStep('code')
  }

  async function verify() {
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'email',
    })
    setBusy(false)
    if (error) setError(error.message)
  }

  return (
    <div style={{ padding: 24, maxWidth: 360, margin: '0 auto' }}>
      <h1>frnds</h1>
      {step === 'email' ? (
        <>
          <p>Enter your email and we'll send you a code.</p>
          <input
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: 12, fontSize: 16 }}
          />
          <button onClick={sendCode} disabled={busy || !email} style={{ marginTop: 12, padding: 12 }}>
            {busy ? 'Sending…' : 'Send code'}
          </button>
        </>
      ) : (
        <>
          <p>Enter the code we emailed to {email}.</p>
          <input
            inputMode="numeric"
            placeholder="Code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            style={{ width: '100%', padding: 12, fontSize: 16 }}
          />
          <button onClick={verify} disabled={busy || !code} style={{ marginTop: 12, padding: 12 }}>
            {busy ? 'Checking…' : 'Log in'}
          </button>
          <button onClick={() => setStep('email')} style={{ marginTop: 12, marginLeft: 8, padding: 12 }}>
            Back
          </button>
        </>
      )}
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
    </div>
  )
}