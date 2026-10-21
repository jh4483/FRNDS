import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabaseClient'
import { compressImage } from './compressImage'

export default function Camera({ userId, groups = [] }) {
  const cameraRef = useRef(null)
  const libraryRef = useRef(null)
  const [blob, setBlob] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [selected, setSelected] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setError('')
    setSuccess('')
    setBusy(true)
    try {
      const compressed = await compressImage(file)
      setBlob(compressed)
      setPreviewUrl(URL.createObjectURL(compressed))
      setSelected([])
    } catch (err) {
      setError(err.message || 'Could not read that photo')
    } finally {
      setBusy(false)
    }
  }

  function toggle(id) {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
  }

  function cancel() {
    setBlob(null)
    setPreviewUrl(null)
    setSelected([])
  }

  async function send() {
    if (!blob || selected.length === 0) return
    setBusy(true)
    setError('')

    const path = `${userId}/${crypto.randomUUID()}.jpg`
    try {
      const { error: uploadError } = await supabase.storage
        .from('stories')
        .upload(path, blob, { contentType: 'image/jpeg' })
      if (uploadError) throw uploadError

      const { data: story, error: storyError } = await supabase
        .from('stories')
        .insert({ media_path: path })
        .select('id')
        .single()
      if (storyError) {
        await supabase.storage.from('stories').remove([path])
        throw storyError
      }

      const rows = selected.map((group_id) => ({ story_id: story.id, group_id }))
      const { error: recipientError } = await supabase.from('story_recipients').insert(rows)
      if (recipientError) {
        await supabase.from('stories').delete().eq('id', story.id)
        await supabase.storage.from('stories').remove([path])
        throw recipientError
      }

      const names = groups
        .filter((g) => selected.includes(g.id))
        .map((g) => g.name)
        .join(', ')
      cancel()
      setSuccess(`Sent to ${names} ✅`)
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  const chosen = groups.filter((g) => selected.includes(g.id))

  return (
    <div style={{ marginBottom: 24 }}>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        style={{ display: 'none' }}
      />
      <input
        ref={libraryRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        style={{ display: 'none' }}
      />

      {!blob ? (
        <>
          <button onClick={() => cameraRef.current.click()} disabled={busy} style={{ padding: 12 }}>
            📷 Take photo
          </button>
          <button
            onClick={() => libraryRef.current.click()}
            disabled={busy}
            style={{ padding: 12, marginLeft: 8 }}
          >
            🖼️ Choose photo
          </button>
          {busy && <p>Preparing photo…</p>}
        </>
      ) : (
        <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
          <img
            src={previewUrl}
            alt="Your photo"
            style={{ width: '100%', maxHeight: 320, objectFit: 'contain', borderRadius: 8 }}
          />

          <h3 style={{ marginBottom: 8 }}>Send to</h3>
          {groups.length === 0 ? (
            <p>You need a group first. Create one below, then come back and send.</p>
          ) : (
            groups.map((g) => {
              const count = g.memberships?.[0]?.count
              return (
                <label
                  key={g.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' }}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(g.id)}
                    onChange={() => toggle(g.id)}
                    style={{ width: 22, height: 22 }}
                  />
                  <span>
                    {g.name}
                    {count ? ` (${count} ${count === 1 ? 'person' : 'people'})` : ''}
                  </span>
                </label>
              )
            })
          )}

          <p style={{ fontSize: 14, color: '#555' }}>
            {chosen.length === 0
              ? 'Choose at least one group.'
              : `Will be seen by: ${chosen.map((g) => g.name).join(', ')}`}
          </p>

          <button onClick={send} disabled={busy || chosen.length === 0} style={{ padding: 12 }}>
            {busy ? 'Sending…' : 'Send'}
          </button>
          <button onClick={cancel} disabled={busy} style={{ padding: 12, marginLeft: 8 }}>
            Cancel
          </button>
        </div>
      )}

      {success && <p style={{ color: 'green' }}>{success}</p>}
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
    </div>
  )
}