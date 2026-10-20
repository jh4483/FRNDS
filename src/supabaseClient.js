import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xtobvrakjxzovdnyqdvn.supabase.co'
const supabaseKey = 'sb_publishable_jydZX0ZPLFTZpS2mZhFofA_A-mmFQmZ'

export const supabase = createClient(supabaseUrl, supabaseKey)