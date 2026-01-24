// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'

// ดึงค่าจาก .env.local ที่เราเตรียมไว้
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase URL or Anon Key')
}

// Client-side: ใช้ Anon Key (มี RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side: ใช้ Service Role Key (bypass RLS) - ใช้สำหรับ Storage Upload
export const supabaseAdmin = supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
    : supabase // fallback to regular client if no service key