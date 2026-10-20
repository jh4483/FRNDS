import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true)
    setError('')
    const creds = { email: email.trim(), password }
    const { error } =
      mode === 'login'
        ? await supabase.auth.signInWithPassword(creds)
        : await supabase.auth.signUp(creds)
    setBusy(false)
    if (error) setError(error.message)
  }

  return (
    <div style={{ padding: 24, maxWidth: 360, margin: '0 auto' }}>
      <h1>frnds</h1>
      <input
        type="email"
        placeholder="you@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: '100%', padding: 12, fontSize: 16 }}
      />
      <input
        type="password"
        placeholder="Password (6+ characters)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: '100%', padding: 12, fontSize: 16, marginTop: 12 }}
      />
      <button onClick={submit} disabled={busy || !email || !password} style={{ marginTop: 12, padding: 12 }}>
        {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
      </button>
      <p>
        <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
          {mode === 'login' ? 'New here? Create an account' : 'Have an account? Log in'}
        </button>
      </p>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
    </div>
  )
}