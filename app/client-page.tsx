'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export function ClientHome({ isLoggedIn }: { isLoggedIn: boolean }) {
    const router = useRouter()
    const [joinCode, setJoinCode] = useState('')

    const handleCreateRoom = () => {
        if (!isLoggedIn) {
            alert("Please Sign In first to create a room.")
            return
        }
        router.push('/lobby/create')
    }

    const handleCreatorStudio = (e: any) => {
        if (!isLoggedIn) {
            e.preventDefault()
            alert("Please Sign In first to access Creator Studio.")
        }
    }

    const handleJoinRoom = (e: React.FormEvent) => {
        e.preventDefault()
        if (joinCode.trim()) {
            router.push(`/lobby/${joinCode.toUpperCase()}`)
        }
    }

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-4 lg:p-10 animate-in fade-in zoom-in duration-500">

            <div className="mb-12 text-center space-y-4">
                {/* ✅ Title: SANDORY BOX */}
                <h1 className="text-5xl md:text-8xl font-black text-white tracking-tight drop-shadow-[0_0_40px_rgba(88,28,135,0.6)]">
                    SANDORY <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f59e0b] to-amber-300">BOX</span>
                </h1>

                {/* ✅ Description */}
                <p className="text-slate-400 text-xl max-w-2xl mx-auto font-light">
                    Create immersive tabletop adventures tools. <br />
                    <span className="text-[#f59e0b] font-medium drop-shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                        Roll dice, manage sheets, and tell stories together.
                    </span>
                </p>
            </div>

            {/* ✅ GRID 4 BLOCKS (ปรับเป็น 4 ช่อง) */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 w-full max-w-7xl">

                {/* --- BLOCK 1: CREATE ROOM --- */}
                <button
                    onClick={handleCreateRoom}
                    className="group relative bg-[#0f172a]/80 backdrop-blur-sm border border-slate-800 hover:border-[#f59e0b]/50 rounded-3xl p-8 text-left transition-all hover:shadow-[0_0_30px_rgba(88,28,135,0.25)] hover:-translate-y-1 flex flex-col h-80 overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-[#581c87]/0 to-[#581c87]/10 opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="relative bg-gradient-to-br from-[#f59e0b]/20 to-orange-600/10 w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform text-[#f59e0b] border border-[#f59e0b]/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                        👑
                    </div>
                    <h2 className="relative text-2xl font-bold text-white mb-2 group-hover:text-[#f59e0b] transition-colors">Create Room</h2>
                    <p className="relative text-slate-400 mb-8 leading-relaxed">Host a new game session. Select an existing campaign or start a quick play.</p>

                    <div className="relative mt-auto flex items-center text-[#f59e0b] font-bold text-sm tracking-wide uppercase">
                        Select Campaign <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                </button>

                {/* --- BLOCK 2: JOIN ROOM --- */}
                <div className="bg-[#0f172a]/80 backdrop-blur-sm border border-slate-800 rounded-3xl p-8 flex flex-col h-80 relative overflow-hidden group hover:border-blue-500/50 transition-colors hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]">
                    <div className="bg-gradient-to-br from-blue-500/20 to-cyan-600/20 w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-6 text-blue-400 border border-blue-500/20">
                        👋
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">Join Game</h2>
                    <p className="text-slate-400 mb-4">Enter a 6-digit code to join an existing lobby.</p>

                    <form onSubmit={handleJoinRoom} className="mt-auto relative z-10">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value)}
                                placeholder="CODE"
                                className="w-full bg-[#020617] border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-3 text-white outline-none font-mono uppercase text-center tracking-widest text-lg transition-all focus:shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                                maxLength={6}
                            />
                            <button
                                type="submit"
                                disabled={!joinCode}
                                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-6 rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-900/20"
                            >
                                GO
                            </button>
                        </div>
                    </form>
                </div>

                {/* --- BLOCK 3: MARKETPLACE (NEW) --- */}
                <Link
                    href="/marketplace"
                    className="group relative bg-[#0f172a]/80 backdrop-blur-sm border border-slate-800 hover:border-emerald-500/50 rounded-3xl p-8 text-left transition-all hover:shadow-[0_0_30px_rgba(16,185,129,0.25)] hover:-translate-y-1 flex flex-col h-80 overflow-hidden"
                >
                    {/* Secondary Glow Background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/0 to-emerald-900/10 opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="relative bg-gradient-to-br from-emerald-500/20 to-teal-600/10 w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                        🛒
                    </div>
                    <h2 className="relative text-2xl font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">Marketplace</h2>
                    <p className="relative text-slate-400 mb-8 leading-relaxed">Browse campaigns, maps, and assets created by the community.</p>

                    <div className="relative mt-auto flex items-center text-emerald-500 font-bold text-sm tracking-wide uppercase">
                        Go to Shop <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                </Link>

                {/* --- BLOCK 4: CREATOR STUDIO --- */}
                <Link
                    href="/campaign/my"
                    onClick={handleCreatorStudio}
                    className="group relative bg-[#0f172a]/80 backdrop-blur-sm border border-slate-800 hover:border-[#581c87]/50 rounded-3xl p-8 text-left transition-all hover:shadow-[0_0_30px_rgba(88,28,135,0.3)] hover:-translate-y-1 flex flex-col h-80 overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-[#581c87]/0 to-[#581c87]/20 opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="relative bg-gradient-to-br from-[#581c87]/30 to-purple-600/10 w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform text-purple-300 border border-[#581c87]/40 shadow-[0_0_15px_rgba(88,28,135,0.3)]">
                        🛠️
                    </div>
                    <h2 className="relative text-2xl font-bold text-white mb-2 group-hover:text-purple-300 transition-colors">Creator Studio</h2>
                    <p className="relative text-slate-400 mb-8 leading-relaxed">Design your own Campaigns, Maps, NPCs, and custom Character Sheets.</p>

                    <div className="relative mt-auto flex items-center text-purple-400 font-bold text-sm tracking-wide uppercase">
                        Manage Assets <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                </Link>

            </div>

            <div className="mt-16 text-slate-700 text-xs font-mono uppercase tracking-widest">
                v1.0.0 Alpha • Powered by Next.js 15 & Auth.js
            </div>
        </div>
    )
}