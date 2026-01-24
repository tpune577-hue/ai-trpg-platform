'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function PayoutFilters() {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    // อ่านค่าจาก URL มาเป็น Default State
    const [mode, setMode] = useState(searchParams.get('mode') || 'ALL') // ALL, DAILY, MONTHLY, YEARLY
    const [dateValue, setDateValue] = useState(searchParams.get('date') || new Date().toISOString().split('T')[0])

    // ฟังก์ชันอัปเดต URL
    const applyFilter = (newMode: string, newDate: string) => {
        const params = new URLSearchParams(searchParams)
        params.set('mode', newMode)

        if (newMode !== 'ALL') {
            params.set('date', newDate)
        } else {
            params.delete('date')
        }

        router.replace(`${pathname}?${params.toString()}`)
    }

    return (
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row gap-4 items-end md:items-center mb-6">

            {/* 1. เลือกโหมด */}
            <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-slate-400 mb-1">View Mode</label>
                <select
                    value={mode}
                    onChange={(e) => {
                        setMode(e.target.value)
                        applyFilter(e.target.value, dateValue)
                    }}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-2.5 outline-none focus:border-emerald-500"
                >
                    <option value="ALL">📅 All Time (History)</option>
                    <option value="DAILY">📆 Daily (Specific Day)</option>
                    <option value="MONTHLY">🗓️ Monthly (Specific Month)</option>
                    <option value="YEARLY">📅 Yearly (Specific Year)</option>
                </select>
            </div>

            {/* 2. เลือกวันที่ (ซ่อนถ้าเลือก All Time) */}
            {mode !== 'ALL' && (
                <div className="flex-1 w-full animate-in fade-in slide-in-from-left-4">
                    <label className="block text-xs font-bold text-slate-400 mb-1">Select Date/Period</label>
                    <input
                        type={mode === 'DAILY' ? 'date' : mode === 'MONTHLY' ? 'month' : 'number'}
                        value={dateValue}
                        min={mode === 'YEARLY' ? '2023' : undefined}
                        max={mode === 'YEARLY' ? '2030' : undefined}
                        placeholder={mode === 'YEARLY' ? 'YYYY' : undefined}
                        onChange={(e) => {
                            setDateValue(e.target.value)
                            applyFilter(mode, e.target.value)
                        }}
                        className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-2.5 outline-none focus:border-emerald-500 font-mono"
                    />
                </div>
            )}

            {/* สรุปข้อความ */}
            <div className="text-right text-xs text-slate-500 min-w-[150px]">
                {mode === 'ALL' && "Showing all records"}
                {mode === 'DAILY' && "Transactions on this day"}
                {mode === 'MONTHLY' && "Transactions in this month"}
                {mode === 'YEARLY' && "Transactions in this year"}
            </div>

        </div>
    )
}