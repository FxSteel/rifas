import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Ticket = {
  number: number
  buyer_name: string
  phone: string | null
  status: 'sold' | 'reserved'
  created_at: string
  updated_at: string
}
