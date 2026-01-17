'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function HomePage() {
  const router = useRouter()
  const [joinCode, setJoinCode] = useState('')

  // 1. Create Room -> ไปที่หน้าเลือก Campaign ของคุณที่มีอยู่แล้ว
  const handleCreateRoom = () => {
    router.push('/lobby/create')
  }

  // 2. Join Room Handler
  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault()
    if (joinCode.trim()) {
      router.push(`/lobby/${joinCode.toUpperCase()}`)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 lg:p-10">

      <div className="mb-10 text-center">
        <h1 className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tight">
          AI-TRPG <span className="text-amber-500">PLATFORM</span>
        </h1>
        <p className="text-slate-400 text-lg">Choose your path to begin</p>
      </div>

      {/* ✅ GRID 3 BLOCKS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl">

        {/* --- BLOCK 1: CREATE ROOM --- */}
        <button
          onClick={handleCreateRoom}
          className="group relative bg-slate-900 border border-slate-800 hover:border-amber-500 rounded-3xl p-8 text-left transition-all hover:shadow-2xl hover:shadow-amber-900/20 flex flex-col h-80"
        >
          <div className="bg-amber-500/10 w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform text-amber-500">
            👑
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Create Room</h2>
          <p className="text-slate-400 mb-8">Host a new game session. Select a campaign or start fresh.</p>

          <div className="mt-auto flex items-center text-amber-500 font-bold">
            Select Campaign →
          </div>
        </button>

        {/* --- BLOCK 2: JOIN ROOM --- */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 flex flex-col h-80 relative overflow-hidden">
          <div className="bg-blue-500/10 w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-6 text-blue-400">
            👋
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Join Game</h2>
          <p className="text-slate-400 mb-4">Enter a code to join an existing lobby.</p>

          <form onSubmit={handleJoinRoom} className="mt-auto">
            <div className="flex gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="CODE"
                className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-3 text-white outline-none font-mono uppercase text-center tracking-widest"
                maxLength={6}
              />
              <button
                type="submit"
                disabled={!joinCode}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold px-4 rounded-xl transition-colors"
              >
                GO
              </button>
            </div>
          </form>
        </div>

        {/* --- BLOCK 3: CREATOR STUDIO (CAMPAIGN) --- */}
        <Link
          href="/campaign/my"
          className="group bg-slate-900 border border-slate-800 hover:border-emerald-500 rounded-3xl p-8 text-left transition-all hover:shadow-2xl hover:shadow-emerald-900/20 flex flex-col h-80"
        >
          <div className="bg-emerald-500/10 w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform text-emerald-500">
            🛠️
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Creator Studio</h2>
          <p className="text-slate-400 mb-8">Design your own Campaigns, Maps, NPCs, and Characters.</p>

          <div className="mt-auto flex items-center text-emerald-500 font-bold">
            Manage Campaigns →
          </div>
        </Link>

      </div>

      <div className="mt-12 text-slate-600 text-sm">
        v1.0.0 Alpha • AI-TRPG Platform
      </div>
    </div>
  )
}