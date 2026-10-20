import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Login from './Login'
import ProfileSetup from './ProfileSetup'
import Home from './Home'

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
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

  if (loading) return <p style={{ padding: 24 }}>Loading…</p>
  if (!session) return <Login />
  if (!profile) return <ProfileSetup user={session.user} onDone={setProfile} />
  return <Home profile={profile} />
}