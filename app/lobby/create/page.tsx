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

    // ✅ แก้ไขฟังก์ชันนี้ครับ
    const handleCreate = async (campaignId: string) => {
        setCreating(true)
        try {
            const result = await createGameSession(campaignId)

            // ตรวจสอบว่ามี joinCode ส่งกลับมาไหม
            if (result && result.joinCode) {
                router.push(`/lobby/${result.joinCode}`)
            } else {
                throw new Error("No join code returned")
            }
        } catch (e) {
            console.error(e)
            alert("Failed to create room")
            setCreating(false)
        }
    }

    const handleResume = (code: string) => {
        router.push(`/lobby/${code}`)
    }

    if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading...</div>

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-8">
            <h1 className="text-3xl font-bold text-white mb-8">Game Management</h1>

            {/* Section 1: Resume Active Sessions */}
            {activeSessions.length > 0 && (
                <div className="mb-12 animate-fade-in">
                    <h2 className="text-xl font-bold text-emerald-500 mb-4 flex items-center gap-2">
                        <span>▶️</span> Resume Session
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {activeSessions.map(session => (
                            <div key={session.id} className="bg-slate-900/50 border border-emerald-900/50 hover:border-emerald-500 p-4 rounded-xl transition-all cursor-pointer group" onClick={() => handleResume(session.joinCode)}>
                                <div className="flex justify-between items-start mb-2">
                                    <span className="bg-emerald-900/30 text-emerald-400 px-2 py-1 rounded text-xs font-mono border border-emerald-900">CODE: {session.joinCode}</span>
                                    <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${session.status === 'ACTIVE' ? 'bg-green-900 text-green-400' : 'bg-yellow-900 text-yellow-400'}`}>{session.status}</span>
                                </div>
                                <h3 className="font-bold text-white group-hover:text-emerald-400 truncate">{session.campaign?.title || "Untitled Adventure"}</h3>
                                <p className="text-xs text-slate-500 mt-1">Last played: {new Date(session.updatedAt).toLocaleDateString()}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Section 2: Create New Room */}
            <div>
                <h2 className="text-xl font-bold text-amber-500 mb-4 flex items-center gap-2">
                    <span>🆕</span> Start New Campaign
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Custom Sandbox */}
                    <div onClick={() => handleCreate('CUSTOM')} className="bg-slate-900 border-2 border-dashed border-slate-700 hover:border-white p-6 rounded-xl flex flex-col items-center justify-center cursor-pointer min-h-[200px] transition-all">
                        <span className="text-4xl mb-2">🎲</span>
                        <h3 className="font-bold text-white">Custom / Sandbox</h3>
                        <p className="text-xs text-slate-500 text-center mt-2">Start empty and build as you go.</p>
                    </div>

                    {/* Templates */}
                    {campaigns.map(camp => (
                        <div key={camp.id} className="bg-slate-900 border border-slate-800 hover:border-amber-500 rounded-xl overflow-hidden cursor-pointer transition-all flex flex-col group" onClick={() => handleCreate(camp.id)}>
                            <div className="h-32 bg-black relative">
                                {camp.coverImage ? (
                                    <img src={camp.coverImage} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                ) : (
                                    <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-600">No Image</div>
                                )}
                            </div>
                            <div className="p-4 flex-1">
                                <h3 className="font-bold text-lg text-white group-hover:text-amber-500 line-clamp-1">{camp.title}</h3>
                                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{camp.description || "No description provided."}</p>
                            </div>
                            <div className="px-4 pb-4">
                                <span className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-500">By {camp.creator?.name || 'Unknown'}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {creating && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                    <div className="text-amber-500 text-xl font-bold animate-pulse">Creating Room...</div>
                </div>
            )}
        </div>
    )
}