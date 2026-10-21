import { useEffect, useState } from 'react'
import Camera from './Camera'
import { supabase } from './supabaseClient'

export default function Home({ profile, notice, refreshKey }) {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copiedId, setCopiedId] = useState(null)

  async function loadGroups() {
    const { data, error } = await supabase
      .from('groups')
      .select('id, name, invite_code, memberships(count)')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setGroups(data)
    setLoading(false)
  }

  useEffect(() => {
    loadGroups()
  }, [refreshKey])

  async function createGroup() {
    setBusy(true)
    setError('')
    const { error } = await supabase.rpc('create_group', { group_name: name.trim() })
    setBusy(false)
    if (error) {
      setError(error.message)
    } else {
      setName('')
      loadGroups()
    }
  }

  function inviteLink(code) {
    return `${window.location.origin}/?join=${code}`
  }

  async function shareInvite(group) {
    const url = inviteLink(group.invite_code)
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Join ${group.name} on frnds`,
          text: `Join ${group.name} on frnds`,
          url,
        })
      } else {
        await navigator.clipboard.writeText(url)
        setCopiedId(group.id)
        setTimeout(() => setCopiedId(null), 2000)
      }
    } catch (e) {
      // person closed the share sheet; nothing to do
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 360, margin: '0 auto' }}>
      <h2>Hi {profile.display_name} 👋</h2>

      {notice && (
        <p style={{ background: '#eef', padding: 12, borderRadius: 8 }}>{notice}</p>
      )}

    <Camera userId={profile.id} groups={groups} />

      <h3>Your groups</h3>
      {loading ? (
        <p>Loading…</p>
      ) : groups.length === 0 ? (
        <p>No groups yet. Create one below, then invite your friends.</p>
      ) : (
        groups.map((g) => (
          <div
            key={g.id}
            style={{
              border: '1px solid #ddd',
              borderRadius: 8,
              padding: 12,
              marginBottom: 12,
            }}
          >
            <strong>{g.name}</strong>
            <div style={{ marginTop: 8 }}>
              <button onClick={() => shareInvite(g)} style={{ padding: 8 }}>
                {copiedId === g.id ? 'Link copied!' : 'Invite friends'}
              </button>
            </div>
          </div>
        ))
      )}

      <h3>Create a group</h3>
      <input
        placeholder="Group name (e.g. Chennai crew)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ width: '100%', padding: 12, fontSize: 16 }}
      />
      <button
        onClick={createGroup}
        disabled={busy || !name.trim()}
        style={{ marginTop: 12, padding: 12 }}
      >
        {busy ? 'Creating…' : 'Create group'}
      </button>

      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      <p style={{ marginTop: 32 }}>
        <button onClick={() => supabase.auth.signOut()} style={{ padding: 12 }}>
          Sign out
        </button>
      </p>
    </div>
  )
}