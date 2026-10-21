import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

function timeAgo(iso) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  return `${Math.floor(mins / 60)}h ago`
}

export default function StoryViewer({ group, onClose }) {
  const [stories, setStories] = useState([])
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      // Stories sent to this group. The database only returns the ones you may see.
      const { data, error } = await supabase
        .from('story_recipients')
        .select('stories(id, media_path, created_at, author:profiles(display_name))')
        .eq('group_id', group.id)
      if (cancelled) return
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      // oldest first, like a real story
      const list = (data || [])
        .map((row) => row.stories)
        .filter(Boolean)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

      // private photos need a temporary signed link (valid for 1 hour)
      if (list.length > 0) {
        const { data: signed, error: signError } = await supabase.storage
          .from('stories')
          .createSignedUrls(
            list.map((s) => s.media_path),
            3600
          )
        if (cancelled) return
        if (signError) {
          setError(signError.message)
          setLoading(false)
          return
        }
        const byPath = Object.fromEntries(signed.map((item) => [item.path, item.signedUrl]))
        list.forEach((s) => {
          s.url = byPath[s.media_path]
        })
      }

      setStories(list)
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [group.id])

  function next() {
    if (index >= stories.length - 1) onClose()
    else setIndex(index + 1)
  }

  function prev() {
    if (index > 0) setIndex(index - 1)
  }

  // keyboard support on a computer: arrows and Escape
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // load the next photo in the background so advancing feels instant
  useEffect(() => {
    const upcoming = stories[index + 1]
    if (upcoming?.url) new Image().src = upcoming.url
  }, [index, stories])

  function handleTap(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    if (x < rect.width * 0.33) prev()
    else next()
  }

  const overlay = {
    position: 'fixed',
    inset: 0,
    background: '#000',
    zIndex: 1000,
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
  }

  const closeButton = (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClose()
      }}
      aria-label="Close"
      style={{
        background: 'none',
        border: 'none',
        color: '#fff',
        fontSize: 28,
        width: 44,
        height: 44,
        cursor: 'pointer',
      }}
    >
      ✕
    </button>
  )

  if (loading || error || stories.length === 0) {
    return (
      <div style={overlay} role="dialog">
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: 12 }}>{closeButton}</div>
        <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
          {loading && <p>Loading…</p>}
          {error && <p style={{ color: '#ff8a8a' }}>{error}</p>}
          {!loading && !error && (
            <p>No stories in {group.name} in the last 24 hours.</p>
          )}
        </div>
      </div>
    )
  }

  const story = stories[index]

  return (
    <div style={overlay} role="dialog" aria-label={`${group.name} stories`}>
      <div onClick={handleTap} style={{ position: 'relative', flex: 1, cursor: 'pointer' }}>
        <img
          src={story.url}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
        />

        {/* top bar: progress, who posted, close */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            padding: 'max(12px, env(safe-area-inset-top)) 12px 24px',
            background: 'linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0))',
          }}
        >
          <div style={{ display: 'flex', gap: 4 }}>
            {stories.map((s, i) => (
              <div
                key={s.id}
                style={{
                  flex: 1,
                  height: 3,
                  borderRadius: 2,
                  background: i <= index ? '#fff' : 'rgba(255,255,255,0.35)',
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <div>
              <strong>{story.author?.display_name || 'Someone'}</strong>
              <span style={{ opacity: 0.8 }}> · {timeAgo(story.created_at)}</span>
              <div style={{ fontSize: 13, opacity: 0.8 }}>{group.name}</div>
            </div>
            {closeButton}
          </div>
        </div>
      </div>
    </div>
  )
}