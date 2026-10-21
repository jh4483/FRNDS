import { useRef, useState } from 'react'
import { supabase } from './supabaseClient'
import { compressImage } from './compressImage'

export default function Camera({ userId }) {
  const cameraRef = useRef(null)
  const libraryRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(null)
  const [info, setInfo] = useState('')

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // lets you pick the same photo again later
    if (!file) return

    setBusy(true)
    setError('')
    setInfo('')
    try {
      const blob = await compressImage(file)
      const path = `${userId}/${crypto.randomUUID()}.jpg`

      const { error: uploadError } = await supabase.storage
        .from('stories')
        .upload(path, blob, { contentType: 'image/jpeg' })
      if (uploadError) throw uploadError

      const { error: rowError } = await supabase
        .from('stories')
        .insert({ media_path: path })
      if (rowError) {
        await supabase.storage.from('stories').remove([path]) // don't leave an orphan file
        throw rowError
      }

      const { data, error: urlError } = await supabase.storage
        .from('stories')
        .createSignedUrl(path, 60 * 60)
      if (urlError) throw urlError

      setPreview(data.signedUrl)
      setInfo(
        `Uploaded: ${(file.size / 1024).toFixed(0)} KB → ${(blob.size / 1024).toFixed(0)} KB`
      )
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

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

      {busy && <p>Uploading…</p>}
      {info && <p style={{ color: 'green' }}>{info}</p>}
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {preview && (
        <img
          src={preview}
          alt="Your upload"
          style={{ width: '100%', borderRadius: 8, marginTop: 12 }}
        />
      )}
    </div>
  )
}