import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function ChangePassword() {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function save() {
    setBusy(true)
    setError('')
    setMessage('')
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) {
      setError(error.message)
    } else {
      setMessage('Password updated ✅')
      setPassword('')
      setOpen(false)
    }
  }

  if (!open) {
    return (
      <div>
        <button onClick={() => setOpen(true)} style={{ padding: 12 }}>
          Change password
        </button>
        {message && <p style={{ color: 'green' }}>{message}</p>}
      </div>
    )
  }

  return (
    <div>
      <input
        type="password"
        placeholder="New password (6+ characters)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: '100%', padding: 12, fontSize: 16 }}
      />
      <button
        onClick={save}
        disabled={busy || password.length < 6}
        style={{ marginTop: 12, padding: 12 }}
      >
        {busy ? 'Saving…' : 'Save password'}
      </button>
      <button onClick={() => setOpen(false)} style={{ marginTop: 12, marginLeft: 8, padding: 12 }}>
        Cancel
      </button>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
    </div>
  )
}