// components/SupabaseTest.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export function SupabaseTest() {
    const [status, setStatus] = useState('Checking DB...')

    useEffect(() => {
        const test = async () => {
            // เช็คว่า supabase client ถูกสร้างขึ้นมาหรือยัง
            if (!supabase) {
                setStatus('❌ Supabase Client not initialized')
                return
            }

            const { data, error } = await supabase.from('User').select('*').limit(1)

            if (error) {
                console.error("Supabase Error:", error)
                setStatus('❌ DB Error: ' + error.message)
            } else {
                setStatus('✅ DB Connected Successfully!')
            }
        }
        test()
    }, [])

    return (
        <div className="p-2 bg-black/20 rounded text-xs text-slate-400 font-mono border border-slate-800">
            Database Status: <span className={status.includes('✅') ? 'text-green-400' : 'text-red-400'}>{status}</span>
        </div>
    )
}