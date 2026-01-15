'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getLobbyInfo, joinLobby, setPlayerReady, startGame } from '@/app/actions/game'

export default function LobbyPage() {
    const { code } = useParams()
    const router = useRouter()

    // --- State ---
    const [step, setStep] = useState<'LOGIN' | 'WAITING'>('LOGIN')
    const [session, setSession] = useState<any>(null)
    const [myPlayerId, setMyPlayerId] = useState<string | null>(null)
    const [myRole, setMyRole] = useState<'GM' | 'PLAYER'>('PLAYER')

    // Inputs
    const [playerName, setPlayerName] = useState('')
    const [selectedCharId, setSelectedCharId] = useState<string | null>(null)

    // Status
    const [loading, setLoading] = useState(true)
    const [isActionLoading, setIsActionLoading] = useState(false)

    // --- 1. Polling System (โหลดข้อมูลทุก 3 วิ) ---
    // เพื่อให้เห็นเพื่อนเข้าห้อง หรือเห็นว่า GM กดเริ่มหรือยัง
    useEffect(() => {
        const fetchLobby = async () => {
            try {
                const data = await getLobbyInfo(code as string)
                setSession(data)

                // ถ้าเกมเริ่มแล้ว (ACTIVE) ให้ Redirect ทันที
                if (data?.status === 'ACTIVE' && myPlayerId) {
                    if (myRole === 'GM') router.push(`/play/${code}/board`)
                    else router.push(`/play/${code}/controller`)
                }
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }

        fetchLobby() // ครั้งแรก
        const interval = setInterval(fetchLobby, 3000) // วนลูปทุก 3 วิ
        return () => clearInterval(interval)
    }, [code, myPlayerId, myRole, router])


    // --- Handlers ---

    // 1. เข้าห้อง (Login)
    const handleLogin = async () => {
        if (!playerName.trim()) return alert("Enter Name")
        setIsActionLoading(true)
        try {
            const res = await joinLobby(code as string, playerName, myRole)
            setMyPlayerId(res.playerId)
            setMyRole(res.role as any) // Update role จาก Server เพื่อความชัวร์
            setStep('WAITING') // ไปหน้าถัดไป
        } catch (e) {
            alert("Error joining lobby")
        } finally {
            setIsActionLoading(false)
        }
    }

    // 2. Player กด Ready
    const handleReady = async () => {
        if (!selectedCharId || !myPlayerId) return alert("Select a character first")
        setIsActionLoading(true)
        try {
            await setPlayerReady(myPlayerId, selectedCharId)
            // (State session จะอัปเดตเองรอบถัดไปจาก Polling)
        } catch (e) {
            alert("Error setting ready")
        } finally {
            setIsActionLoading(false)
        }
    }

    // 3. GM กด Start
    const handleStartGame = async () => {
        const allReady = session.players.every((p: any) => p.isReady)
        if (!allReady) return alert("Wait for all players to be READY!")

        setIsActionLoading(true)
        try {
            await startGame(code as string)
            // Redirect handled in useEffect
        } catch (e) {
            alert("Failed to start game")
            setIsActionLoading(false)
        }
    }

    if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading...</div>
    if (!session) return <div className="text-white p-10">Room not found</div>

    // === VIEW 1: LOGIN FORM ===
    if (step === 'LOGIN') {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-md bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-2xl">
                    <h1 className="text-3xl font-bold text-white mb-2 text-center">Join Session</h1>
                    <p className="text-slate-500 text-center mb-8 font-mono">{session.joinCode}</p>

                    <div className="space-y-6">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Your Name</label>
                            <input
                                value={playerName}
                                onChange={e => setPlayerName(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white mt-2 focus:border-amber-500 outline-none"
                                placeholder="Enter name..."
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Select Role</label>
                            <div className="flex gap-2 mt-2">
                                <button onClick={() => setMyRole('PLAYER')} className={`flex-1 py-3 rounded-lg font-bold border ${myRole === 'PLAYER' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
                                    Adventurer
                                </button>
                                <button onClick={() => setMyRole('GM')} className={`flex-1 py-3 rounded-lg font-bold border ${myRole === 'GM' ? 'bg-amber-600 border-amber-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
                                    Game Master
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={handleLogin}
                            disabled={!playerName.trim() || isActionLoading}
                            className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50"
                        >
                            {isActionLoading ? 'Joining...' : 'ENTER LOBBY'}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // === VIEW 2: WAITING ROOM ===
    const myPlayer = session.players.find((p: any) => p.id === myPlayerId)
    const isMeReady = myPlayer?.isReady

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-4 lg:p-10">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-4xl font-bold text-white tracking-tight">{session.campaign?.title}</h1>
                    <div className="flex items-center gap-2 text-slate-400 mt-1">
                        <span className="bg-slate-800 px-2 py-1 rounded text-xs font-mono">CODE: {session.joinCode}</span>
                        <span>•</span>
                        <span className="text-xs uppercase tracking-wider">{session.players.length} Users Connected</span>
                    </div>
                </div>
                {myRole === 'GM' && (
                    <button
                        onClick={handleStartGame}
                        disabled={!session.players.every((p: any) => p.isReady) || isActionLoading}
                        className="bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-black font-black px-8 py-4 rounded-xl shadow-lg transition-all"
                    >
                        {isActionLoading ? 'STARTING...' : 'START CAMPAIGN 🚀'}
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* LEFT: Party List */}
                <div className="lg:col-span-1 bg-slate-900/50 border border-slate-800 rounded-2xl p-6 h-fit">
                    <h2 className="text-lg font-bold text-white mb-4">Party Members</h2>
                    <div className="space-y-3">
                        {session.players.map((p: any) => (
                            <div key={p.id} className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${p.role === 'GM' ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                                    <div>
                                        <div className="font-bold text-white leading-none">{p.name} {p.id === myPlayerId && '(You)'}</div>
                                        <div className="text-[10px] text-slate-500 uppercase mt-1">{p.role}</div>
                                    </div>
                                </div>

                                {/* Status Badge */}
                                {p.role === 'GM' ? (
                                    <span className="text-[10px] bg-amber-900/30 text-amber-500 border border-amber-900 px-2 py-1 rounded">HOST</span>
                                ) : (
                                    p.isReady ? (
                                        <span className="text-[10px] bg-emerald-900/30 text-emerald-500 border border-emerald-900 px-2 py-1 rounded flex items-center gap-1">
                                            ✅ READY
                                        </span>
                                    ) : (
                                        <span className="text-[10px] bg-slate-800 text-slate-500 px-2 py-1 rounded animate-pulse">
                                            ...waiting
                                        </span>
                                    )
                                )}
                            </div>
                        ))}
                    </div>

                    {myRole === 'GM' && (
                        <div className="mt-6 p-4 bg-amber-900/10 border border-amber-900/30 rounded-xl text-xs text-amber-500 text-center">
                            Waiting for all adventurers to be <b>READY</b> before you can start.
                        </div>
                    )}
                </div>

                {/* RIGHT: Main Area */}
                <div className="lg:col-span-2">

                    {/* GM View */}
                    {myRole === 'GM' && (
                        <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-2xl min-h-[400px] text-slate-500">
                            <div className="text-6xl mb-4">👑</div>
                            <h2 className="text-xl font-bold text-white">You are the Game Master</h2>
                            <p className="max-w-md text-center mt-2">Review the party list on the left. Once everyone has chosen their character and is ready, the "Start Campaign" button will light up.</p>
                        </div>
                    )}

                    {/* Player View */}
                    {myRole === 'PLAYER' && (
                        <div>
                            {isMeReady ? (
                                <div className="h-full flex flex-col items-center justify-center border-2 border-emerald-900/30 bg-emerald-900/10 rounded-2xl min-h-[400px] p-8 text-center">
                                    <div className="text-6xl mb-4">✅</div>
                                    <h2 className="text-2xl font-bold text-white">You are Ready!</h2>
                                    <p className="text-emerald-400 mt-2">Waiting for the Game Master to start the journey...</p>
                                    <p className="text-xs text-slate-500 mt-8">Selected Character ID: {myPlayer?.preGenId}</p>
                                </div>
                            ) : (
                                <>
                                    <h2 className="text-xl font-bold text-white mb-4">Select Your Character</h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                                        {session.campaign?.preGens.map((char: any) => {
                                            const stats = JSON.parse(char.stats || '{}')
                                            const isSelected = selectedCharId === char.id
                                            return (
                                                <div
                                                    key={char.id}
                                                    onClick={() => setSelectedCharId(char.id)}
                                                    className={`relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all group ${isSelected ? 'border-emerald-500 bg-slate-900' : 'border-slate-800 bg-slate-950 hover:border-slate-700'}`}
                                                >
                                                    <div className="flex h-32">
                                                        <div className="w-1/3 bg-black">
                                                            <img src={char.avatarUrl} className="w-full h-full object-cover" />
                                                        </div>
                                                        <div className="w-2/3 p-4 flex flex-col justify-center">
                                                            <h3 className={`font-bold text-lg ${isSelected ? 'text-emerald-400' : 'text-white'}`}>{char.name}</h3>
                                                            <div className="flex gap-2 mt-2">
                                                                <div className="bg-slate-900 px-2 py-1 rounded text-xs border border-slate-800">HP <span className="text-red-400">{stats.hp}</span></div>
                                                                <div className="bg-slate-900 px-2 py-1 rounded text-xs border border-slate-800">STR <span className="text-orange-400">{stats.str}</span></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {isSelected && <div className="absolute top-2 right-2 text-emerald-500 bg-emerald-900/20 rounded-full p-1">✔</div>}
                                                </div>
                                            )
                                        })}
                                    </div>

                                    <button
                                        onClick={handleReady}
                                        disabled={!selectedCharId || isActionLoading}
                                        className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold py-4 rounded-xl text-xl shadow-lg shadow-emerald-900/20 transition-all"
                                    >
                                        {isActionLoading ? 'LOCKING IN...' : 'CONFIRM & READY 🛡️'}
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>

            </div>
        </div>
    )
}