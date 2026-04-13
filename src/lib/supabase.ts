import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hmsbiavnhmwihvwdruzz.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhtc2JpYXZuaG13aWh2d2RydXp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwOTQxMjgsImV4cCI6MjA5MTY3MDEyOH0.N8M2WhyQviplS8hinhFgaG5ETJdcqOz1nDmMzneD_4c'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Ticket = {
  number: number
  buyer_name: string
  phone: string | null
  status: 'sold' | 'reserved'
  created_at: string
  updated_at: string
}
