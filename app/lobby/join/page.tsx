'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function JoinRoomPage() {
    const [code, setCode] = useState('')
    const router = useRouter()

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault()
        if (!code.trim()) return

        // Redirect ไปยังหน้า Lobby หลัก (ที่เป็น Dynamic Route [code])
        // เช่น /lobby/A1B2C3
        router.push(`/lobby/${code.toUpperCase()}`)
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl animate-fade-in">

                {/* Back Button */}
                <Link href="/" className="text-xs text-slate-500 hover:text-white mb-6 block transition-colors">
                    ← Back to Home
                </Link>

                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500">
                        Join Adventure
                    </h1>
                    <p className="text-slate-400 text-sm">Enter the 6-character code shared by your GM</p>
                </div>

                <form onSubmit={handleJoin} className="flex flex-col gap-4">
                    <div className="relative">
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="ROOM CODE"
                            className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl text-center text-3xl tracking-[0.5em] uppercase font-mono text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none placeholder:tracking-normal placeholder:normal-case placeholder:text-base placeholder:text-slate-600 transition-all"
                            maxLength={6}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={code.length < 1}
                        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white p-4 rounded-xl font-bold text-lg shadow-lg shadow-emerald-900/20 transition-all transform active:scale-95"
                    >
                        ENTER ROOM 🚀
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-xs text-slate-600">Don't have a code? Ask your Game Master.</p>
                </div>
            </div>
        </div>
    )
}