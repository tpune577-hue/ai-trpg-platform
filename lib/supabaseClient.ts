// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'

// ดึงค่าจาก .env.local ที่เราเตรียมไว้
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase URL or Key')
}

// สร้างตัวเชื่อมต่อ (Client)
export const supabase = createClient(supabaseUrl, supabaseKey)