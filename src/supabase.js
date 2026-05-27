import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://xcdvwkkneettlfweyfjj.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjZHZ3a2tuZWV0dGxmd2V5ZmpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MzExMTIsImV4cCI6MjA5NTQwNzExMn0.KOQ4P94aO6-1UzGOXNMalCHu0xP-oFt7ull8bwvFYrc'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)