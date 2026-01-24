'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getPublishedCampaigns, createGameSession, getResumableSessions } from '@/app/actions/game'

export default function CreateRoomPage() {
    const router = useRouter()
    const [campaigns, setCampaigns] = useState<any[]>([])
    const [activeSessions, setActiveSessions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [creating, setCreating] = useState(false)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [campaignData, sessionData] = await Promise.all([
                    getPublishedCampaigns(),
                    getResumableSessions()
                ])
                setCampaigns(campaignData)
                setActiveSessions(sessionData)
            } catch (err) {
                console.error("Failed to load data", err)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    // ✅ ฟังก์ชันสร้างห้อง (เพิ่มการถามชื่อห้อง)
    const handleCreate = async (campaignId: string) => {
        // 1. ถามชื่อห้องก่อน (ถ้าไม่ตั้งจะใช้ชื่อ Default ใน Server Action)
        const defaultName = campaignId === 'CUSTOM' ? "My Sandbox Game" : "New Adventure";
        const roomName = prompt("Enter room name:", defaultName);

        // ถ้ากด Cancel prompt จะคืนค่า null -> เราจะหยุดการสร้าง
        if (roomName === null) return;

        setCreating(true)
        try {
            // 2. ส่งทั้ง campaignId และ roomName ไปที่ Server Action
            const result = await createGameSession(campaignId, roomName)

            // 3. ตรวจสอบว่ามี joinCode ส่งกลับมาไหม
            if (result && result.joinCode) {
                router.push(`/lobby/${result.joinCode}`)
            } else {
                throw new Error("No join code returned")
            }
        } catch (e: any) {
            console.error('❌ Create room error:', e)
            alert(`Failed to create room: ${e.message || 'Unknown error'}`)
            setCreating(false)
        }
    }

    const handleResume = (code: string) => {
        router.push(`/lobby/${code}`)
    }

    if (loading) return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-4">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            Loading Campaigns...
        </div>
    )

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-8">
            <h1 className="text-3xl font-bold text-white mb-8 border-b border-slate-800 pb-4">
                Game Management
            </h1>

            {/* Section 1: Resume Active Sessions */}
            {activeSessions.length > 0 && (
                <div className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h2 className="text-xl font-bold text-emerald-500 mb-4 flex items-center gap-2">
                        <span>▶️</span> Resume Session
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {activeSessions.map(session => (
                            <div
                                key={session.id}
                                className="bg-slate-900/50 border border-emerald-900/50 hover:border-emerald-500 p-4 rounded-xl transition-all cursor-pointer group hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                                onClick={() => handleResume(session.joinCode)}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="bg-emerald-900/30 text-emerald-400 px-2 py-1 rounded text-xs font-mono border border-emerald-900">
                                        CODE: {session.joinCode}
                                    </span>
                                    <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${session.status === 'ACTIVE' ? 'bg-green-900 text-green-400' : 'bg-yellow-900 text-yellow-400'}`}>
                                        {session.status}
                                    </span>
                                </div>
                                <h3 className="font-bold text-white group-hover:text-emerald-400 truncate text-lg">
                                    {session.name || session.campaign?.title || "Untitled Adventure"}
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">
                                    Last played: {new Date(session.updatedAt).toLocaleDateString()}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Section 2: Create New Room */}
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                <h2 className="text-xl font-bold text-amber-500 mb-4 flex items-center gap-2">
                    <span>🆕</span> Start New Campaign
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                    {/* Custom Sandbox Card */}
                    <div
                        onClick={() => handleCreate('CUSTOM')}
                        className="bg-slate-900 border-2 border-dashed border-slate-700 hover:border-white hover:bg-slate-800 p-6 rounded-xl flex flex-col items-center justify-center cursor-pointer min-h-[200px] transition-all group"
                    >
                        <span className="text-4xl mb-4 group-hover:scale-110 transition-transform">🎲</span>
                        <h3 className="font-bold text-white text-lg">Custom / Sandbox</h3>
                        <p className="text-xs text-slate-500 text-center mt-2 max-w-[200px]">
                            Start with an empty world and build your adventure on the fly.
                        </p>
                    </div>

                    {/* Template Cards */}
                    {campaigns.map(camp => (
                        <div
                            key={camp.id}
                            className="bg-slate-900 border border-slate-800 hover:border-amber-500 rounded-xl overflow-hidden cursor-pointer transition-all flex flex-col group hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                            onClick={() => handleCreate(camp.id)}
                        >
                            <div className="h-32 bg-black relative overflow-hidden">
                                {camp.coverImage ? (
                                    <img
                                        src={camp.coverImage}
                                        className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                                        alt={camp.title}
                                    />
                                ) : (
                                    <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-600">
                                        No Image
                                    </div>
                                )}
                                <div className="absolute bottom-0 w-full bg-gradient-to-t from-slate-900 to-transparent h-12"></div>
                            </div>
                            <div className="p-4 flex-1">
                                <h3 className="font-bold text-lg text-white group-hover:text-amber-500 line-clamp-1 transition-colors">
                                    {camp.title}
                                </h3>
                                <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                                    {camp.description || "No description provided."}
                                </p>
                            </div>
                            <div className="px-4 pb-4 flex justify-between items-center">
                                <span className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-500 border border-slate-700">
                                    By {camp.creator?.name || 'Unknown'}
                                </span>
                                <span className="text-[10px] text-amber-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                    CLICK TO CREATE →
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Loading Overlay */}
            {creating && (
                <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50 backdrop-blur-sm">
                    <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <div className="text-amber-500 text-xl font-bold animate-pulse">Creating Your World...</div>
                    <p className="text-slate-500 text-sm mt-2">Generating session and preparing assets</p>
                </div>
            )}
        </div>
    )
}