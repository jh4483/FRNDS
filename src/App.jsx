import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Login from './Login'
import ProfileSetup from './ProfileSetup'
import Home from './Home'

// If the page was opened with ?join=CODE, remember the code and clean the address bar.
// We keep it in storage so it survives logging in or signing up first.
function capturePendingJoin() {
  try {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('join')
    if (code) {
      localStorage.setItem('frnds_pending_join', code)
      window.history.replaceState({}, '', window.location.pathname)
    }
  } catch (e) {
    // storage can be unavailable; the invite just won't be remembered
  }
}
capturePendingJoin()

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const userId = session?.user?.id

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (!data.session) setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (!newSession) {
        setProfile(null)
        setLoading(false)
      }
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        setProfile(data)
        setLoading(false)
      })
  }, [userId])

  // Once the person is logged in with a profile, use any saved invite code.
  useEffect(() => {
    if (!profile) return
    let code = null
    try {
      code = localStorage.getItem('frnds_pending_join')
      if (code) localStorage.removeItem('frnds_pending_join')
    } catch (e) {}
    if (!code) return
    supabase.rpc('join_group', { code }).then(({ error }) => {
      setNotice(
        error
          ? `That invite link didn't work: ${error.message}`
          : 'You joined the group! 🎉'
      )
      setRefreshKey((k) => k + 1)
    })
  }, [profile])

  if (loading) return <p style={{ padding: 24 }}>Loading…</p>
  if (!session) return <Login />
  if (!profile) return <ProfileSetup user={session.user} onDone={setProfile} />
  return <Home profile={profile} notice={notice} refreshKey={refreshKey} />
}