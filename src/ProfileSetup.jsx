import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function ProfileSetup({ user, onDone }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    setError('')
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, display_name: name.trim() })
      .select()
      .single()
    setBusy(false)
    if (error) setError(error.message)
    else onDone(data)
  }

  return (
    <div style={{ padding: 24, maxWidth: 360, margin: '0 auto' }}>
      <h2>What should your friends call you?</h2>
      <input
        placeholder="Display name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ width: '100%', padding: 12, fontSize: 16 }}
      />
      <button onClick={save} disabled={busy || !name.trim()} style={{ marginTop: 12, padding: 12 }}>
        {busy ? 'Saving…' : 'Continue'}
      </button>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
    </div>
  )
}