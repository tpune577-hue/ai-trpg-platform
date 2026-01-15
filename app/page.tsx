'use client'
import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-8 p-4">
      <h1 className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-600 mb-8">
        TRPG PLATFORM
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
        {/* 1.1 Create Room */}
        <Link href="/lobby/create" className="group relative bg-slate-900 border border-slate-700 hover:border-amber-500 p-8 rounded-2xl transition-all hover:-translate-y-1">
          <div className="text-4xl mb-4">🏰</div>
          <h2 className="text-2xl font-bold text-white group-hover:text-amber-500">Create Room</h2>
          <p className="text-slate-400 mt-2">Open a session using your owned campaigns or a blank canvas.</p>
        </Link>

        {/* 1.2 Join Room */}
        <Link href="/lobby/join" className="group relative bg-slate-900 border border-slate-700 hover:border-emerald-500 p-8 rounded-2xl transition-all hover:-translate-y-1">
          <div className="text-4xl mb-4">⚔️</div>
          <h2 className="text-2xl font-bold text-white group-hover:text-emerald-500">Join Room</h2>
          <p className="text-slate-400 mt-2">Enter a room code to join your party and choose your hero.</p>
        </Link>

        {/* 1.3 Create Campaign */}
        {/* ✅ แก้ตรงนี้จาก /new เป็น /create ครับ */}
        <Link href="/campaign/create" className="group relative bg-slate-900 border border-slate-700 hover:border-purple-500 p-8 rounded-2xl transition-all hover:-translate-y-1">
          <div className="text-4xl mb-4">✍️</div>
          <h2 className="text-2xl font-bold text-white group-hover:text-purple-500">Create Campaign</h2>
          <p className="text-slate-400 mt-2">Build your world, stories, NPCs, and characters.</p>
        </Link>
      </div>
    </div>
  )
}