import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  // Only Vercel's cron (or you, with the secret) may run this.
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: old, error } = await supabase
    .from('stories')
    .select('id, media_path')
    .lt('created_at', cutoff)
    .limit(500)
  if (error) return res.status(500).json({ error: error.message })
  if (!old || old.length === 0) return res.status(200).json({ deleted: 0 })

  // delete the photo files first, then the rows
  const { error: removeError } = await supabase.storage
    .from('stories')
    .remove(old.map((s) => s.media_path))
  if (removeError) return res.status(500).json({ error: removeError.message })

  const { error: deleteError } = await supabase
    .from('stories')
    .delete()
    .in('id', old.map((s) => s.id))
  if (deleteError) return res.status(500).json({ error: deleteError.message })

  return res.status(200).json({ deleted: old.length })
}