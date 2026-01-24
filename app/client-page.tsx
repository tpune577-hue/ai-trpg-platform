'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { SignIn } from '@/components/auth/AuthButton'

interface ClientHomeProps {
    isLoggedIn: boolean
}

export function ClientHome({ isLoggedIn }: ClientHomeProps) {
    const router = useRouter()
    const [roomCode, setRoomCode] = useState('')
    const [isJoinLoading, setIsJoinLoading] = useState(false)

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault()
        if (!roomCode.trim()) return
        setIsJoinLoading(true)
        router.push(`/lobby/${roomCode}`)
    }

    return (
        <main className="flex-1 flex flex-col items-center justify-center p-6 min-h-[80vh]">

            {/* Title */}
            <div className="text-center mb-12">
                <h1 className="text-5xl md:text-7xl font-black bg-gradient-to-r from-amber-400 via-orange-500 to-purple-600 bg-clip-text text-transparent drop-shadow-sm tracking-tight">
                    SANDORY BOX
                </h1>
                <p className="text-slate-400 mt-4 text-lg">Choose your path, adventurer.</p>
            </div>

            {/* ✅ 3 BOXES GRID LAYOUT */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl">

                {/* =========================================
            BOX 1: CREATE ROOM (Need Login)
           ========================================= */}
                <div className="relative group h-80 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-purple-500/50 transition-all shadow-2xl">
                    <div className={`h-full p-8 flex flex-col items-center justify-center text-center gap-4 transition-all duration-300 ${!isLoggedIn ? 'blur-sm opacity-20' : ''}`}>
                        <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center text-3xl">
                            ✨
                        </div>
                        <h2 className="text-2xl font-bold text-white">Create Room</h2>
                        <p className="text-slate-400 text-sm">Start a new campaign as a Game Master.</p>

                        <button
                            // ❌ ของเดิม: router.push('/play/create') 
                            // ✅ แก้เป็น Path ที่ถูกต้องของคุณ (เช่น /lobby/create)
                            onClick={() => router.push('/lobby/create')}
                            className="mt-auto w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold transition-colors"
                        >
                            Start Adventure
                        </button>
                    </div>

                    {/* 🔒 Lock Overlay */}
                    {!isLoggedIn && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px] p-6 text-center">
                            <div className="mb-3 text-purple-500"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg></div>
                            <p className="text-slate-300 font-bold mb-4">Sign in to create a room</p>
                            <SignIn />
                        </div>
                    )}
                </div>

                {/* =========================================
            BOX 2: JOIN ROOM (Need Login)
           ========================================= */}
                <div className="relative group h-80 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-amber-500/50 transition-all shadow-2xl">
                    {/* Content (จะโดนเบลอถ้าไม่ Login) */}
                    <div className={`h-full p-8 flex flex-col items-center justify-center text-center gap-4 transition-all duration-300 ${!isLoggedIn ? 'blur-sm opacity-20' : ''}`}>
                        <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center text-3xl">
                            ⚔️
                        </div>
                        <h2 className="text-2xl font-bold text-white">Join Room</h2>
                        <p className="text-slate-400 text-sm">Enter code to join existing party.</p>

                        <form onSubmit={handleJoin} className="mt-auto w-full flex flex-col gap-3">
                            <input
                                type="text"
                                value={roomCode}
                                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                                placeholder="ROOM CODE"
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-4 text-center text-white font-mono focus:border-amber-500 outline-none"
                            />
                            <button
                                disabled={isJoinLoading || !roomCode}
                                className="w-full py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-lg font-bold transition-colors"
                            >
                                {isJoinLoading ? 'Joining...' : 'Join Party'}
                            </button>
                        </form>
                    </div>

                    {/* 🔒 Lock Overlay */}
                    {!isLoggedIn && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px] p-6 text-center">
                            <div className="mb-3 text-amber-500"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg></div>
                            <p className="text-slate-300 font-bold mb-4">Sign in to join a room</p>
                            <SignIn />
                        </div>
                    )}
                </div>

                {/* =========================================
            BOX 3: MARKETPLACE (Open for Everyone)
           ========================================= */}
                <div className="relative group h-80 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-emerald-500/50 transition-all shadow-2xl">
                    {/* Content (ชัดเจนตลอดเวลา ไม่เบลอ) */}
                    <div className="h-full p-8 flex flex-col items-center justify-center text-center gap-4">
                        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center text-3xl">
                            🛒
                        </div>
                        <h2 className="text-2xl font-bold text-white">Marketplace</h2>
                        <p className="text-slate-400 text-sm">Browse assets, maps, and character arts.</p>

                        <Link
                            href="/marketplace"
                            className="mt-auto w-full py-3 bg-slate-800 hover:bg-emerald-600/20 border border-slate-700 hover:border-emerald-500 text-emerald-400 hover:text-emerald-300 rounded-lg font-bold transition-all flex items-center justify-center gap-2"
                        >
                            Browse Shop
                        </Link>
                    </div>

                    {/* 🏷️ Badge (Optional) */}
                    <div className="absolute top-4 right-4 bg-emerald-500/20 text-emerald-400 text-xs font-bold px-2 py-1 rounded border border-emerald-500/30">
                        OPEN
                    </div>
                </div>

            </div>

        </main>
    )
}