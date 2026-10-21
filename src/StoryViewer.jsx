import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

function timeAgo(iso) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  return `${Math.floor(mins / 60)}h ago`
}

export default function StoryViewer({ group, userId, onClose }) {
  const [stories, setStories] = useState([])
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data, error } = await supabase
        .from('story_recipients')
        .select('stories(id, author_id, media_path, created_at, author:profiles(display_name))')
        .eq('group_id', group.id)
      if (cancelled) return
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      const list = (data || [])
        .map((row) => row.stories)
        .filter(Boolean)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

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

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

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

  async function deleteStory() {
    const story = stories[index]
    if (!story) return
    if (!window.confirm('Delete this story for everyone in your groups?')) return

    setDeleting(true)
    // delete the row first so it disappears for everyone straight away
    const { data, error } = await supabase
      .from('stories')
      .delete()
      .eq('id', story.id)
      .select('id')
    if (error || !data || data.length === 0) {
      window.alert(error ? error.message : 'Could not delete that story.')
      setDeleting(false)
      return
    }
    // then remove the photo file
    await supabase.storage.from('stories').remove([story.media_path])

    const remaining = stories.filter((s) => s.id !== story.id)
    setStories(remaining)
    setIndex(Math.max(0, Math.min(index, remaining.length - 1)))
    setDeleting(false)
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

  const iconButton = {
    background: 'none',
    border: 'none',
    color: '#fff',
    fontSize: 24,
    width: 44,
    height: 44,
    cursor: 'pointer',
  }

  const closeButton = (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClose()
      }}
      aria-label="Close"
      style={{ ...iconButton, fontSize: 28 }}
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
  const isMine = story.author_id === userId

  return (
    <div style={overlay} role="dialog" aria-label={`${group.name} stories`}>
      <div onClick={handleTap} style={{ position: 'relative', flex: 1, cursor: 'pointer' }}>
        <img
          src={story.url}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
        />

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
            <div style={{ display: 'flex' }}>
              {isMine && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteStory()
                  }}
                  disabled={deleting}
                  aria-label="Delete this story"
                  style={iconButton}
                >
                  🗑
                </button>
              )}
              {closeButton}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}