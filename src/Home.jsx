import { supabase } from './supabaseClient'

export default function Home({ profile }) {
  return (
    <div style={{ padding: 24, maxWidth: 360, margin: '0 auto' }}>
      <h2>Hi {profile.display_name} 👋</h2>
      <p>Your groups will show up here soon.</p>
      <button onClick={() => supabase.auth.signOut()} style={{ padding: 12 }}>
        Sign out
      </button>
    </div>
  )
}