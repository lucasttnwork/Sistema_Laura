import { createClient } from '@supabase/supabase-js'

const fallbackUrl = 'https://jvodifqclckzqnvinmpj.supabase.co'
const fallbackAnon = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2b2RpZnFjbGNrenFudmlubXBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4NzI3NjEsImV4cCI6MjA3MzQ0ODc2MX0.OmMu3_U9WifMC5_sFwcqYWztqnpHitAySyuFrcMZGuc'

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || (window as any)?.SUPABASE_URL || fallbackUrl
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (window as any)?.SUPABASE_ANON_KEY || fallbackAnon

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
