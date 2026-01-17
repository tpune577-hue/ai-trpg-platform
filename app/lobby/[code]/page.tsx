'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getLobbyInfo, joinLobby, setPlayerReady, startGame, resumeGame, saveCharacterSheet } from '@/app/actions/game'
import CharacterCreator from '@/components/game/CharacterCreator'

export default function LobbyPage() {
    const { code } = useParams()
    const router = useRouter()

    const [step, setStep] = useState<'LOGIN' | 'WAITING'>('LOGIN')
    const [session, setSession] = useState<any>(null)
    const [myPlayerId, setMyPlayerId] = useState<string | null>(null)
    const [myRole, setMyRole] = useState<'GM' | 'PLAYER'>('PLAYER')

    const [playerName, setPlayerName] = useState('')
    const [selectedCharId, setSelectedCharId] = useState<string | null>(null)

    const [loading, setLoading] = useState(true)
    const [isActionLoading, setIsActionLoading] = useState(false)
    const [isCreatingChar, setIsCreatingChar] = useState(false)

    // 1. Check LocalStorage
    useEffect(() => {
        if (typeof window !== 'undefined' && code) {
            const savedSession = localStorage.getItem(`trpg_session_${code}`)
            if (savedSession) {
                try {
                    const { playerId, role, name } = JSON.parse(savedSession)
                    if (playerId && role) {
                        setMyPlayerId(playerId)
                        setMyRole(role)
                        setPlayerName(name || '')
                        setStep('WAITING')
                    }
                } catch (e) {
                    localStorage.removeItem(`trpg_session_${code}`)
                }
            }
        }
    }, [code])

    // 2. Polling
    useEffect(() => {
        const fetchLobby = async () => {
            try {
                const data = await getLobbyInfo(code as string)
                setSession(data)
                if (data?.status === 'ACTIVE' && myPlayerId) {
                    if (myRole === 'GM') router.push(`/play/${code}/board`)
                    else router.push(`/play/${code}/controller`)
                }
            } catch (err) { console.error(err) } finally { setLoading(false) }
        }
        fetchLobby()
        const interval = setInterval(fetchLobby, 3000)
        return () => clearInterval(interval)
    }, [code, myPlayerId, myRole, router])

    // --- Handlers ---
    const handleLogin = async () => {
        if (!playerName.trim()) return alert("Enter Name")
        setIsActionLoading(true)
        try {
            const res = await joinLobby(code as string, playerName)
            localStorage.setItem(`trpg_session_${code}`, JSON.stringify({ playerId: res.playerId, role: res.role, name: playerName }))
            setMyPlayerId(res.playerId)
            setMyRole(res.role as any)
            setStep('WAITING')
        } catch (e) { alert("Error joining lobby") } finally { setIsActionLoading(false) }
    }

    const handleReady = async () => {
        if (!selectedCharId || !myPlayerId) return alert("Select a character first")
        setIsActionLoading(true)
        try { await setPlayerReady(myPlayerId, selectedCharId) } catch (e) { alert("Error setting ready") } finally { setIsActionLoading(false) }
    }

    const handleStartGame = async () => {
        setIsActionLoading(true)
        try {
            if (session.status === 'PAUSED') await resumeGame(code as string)
            else await startGame(code as string)
        } catch (e) { alert("Failed to start") } finally { setIsActionLoading(false) }
    }

    const handleLogout = () => {
        if (confirm("Logout and join as a new player?")) {
            localStorage.removeItem(`trpg_session_${code}`)
            setMyPlayerId(null)
            setMyRole('PLAYER')
            setPlayerName('')
            setStep('LOGIN')
            window.location.reload()
        }
    }

    const handleSaveCharacter = async (data: any) => {
        setIsActionLoading(true)
        try {
            await saveCharacterSheet(myPlayerId as string, data)
            setIsCreatingChar(false)
        } catch (e) {
            console.error(e)
            alert("Failed to save character")
        } finally {
            setIsActionLoading(false)
        }
    }

    // --- Helper: Get Player Image ---
    const getPlayerImage = (player: any) => {
        try {
            // 1. ลองแกะจาก characterData JSON string
            if (player.characterData && player.characterData !== '{}') {
                const data = JSON.parse(player.characterData)
                if (data.imageUrl) return data.imageUrl
                if (data.avatarUrl) return data.avatarUrl
            }
            // 2. ถ้าไม่มี ลองดูจาก PreGen (ถ้าเรา map ไว้ใน session แต่ปกติ session.players จะไม่มี preGen object ติดมาตรงๆ ต้องดู logic backend)
            // ในที่นี้สมมติว่า backend ส่ง characterData ที่มี url มาแล้ว หรือใช้ placeholder
            return '/placeholder.jpg'
        } catch (e) {
            return '/placeholder.jpg'
        }
    }

    if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading...</div>
    if (!session) return <div className="text-white p-10">Room not found</div>

    // VIEW 1: LOGIN
    if (step === 'LOGIN') {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-md bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-2xl">
                    <h1 className="text-3xl font-bold text-white mb-2 text-center">{session.status === 'PAUSED' ? 'Resume Session' : 'Join Session'}</h1>
                    <p className="text-slate-500 text-center mb-8 font-mono">{session.joinCode}</p>
                    <div className="space-y-6">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Adventurer Name</label>
                            <input value={playerName} onChange={e => setPlayerName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white mt-2 focus:border-amber-500 outline-none" placeholder="Enter your name..." onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
                        </div>
                        <button onClick={handleLogin} disabled={!playerName.trim() || isActionLoading} className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50">{isActionLoading ? 'Joining...' : 'ENTER LOBBY'}</button>
                    </div>
                </div>
            </div>
        )
    }

    // VIEW 2: WAITING
    const myPlayer = session.players.find((p: any) => p.id === myPlayerId)
    const isMeReady = myPlayer?.isReady
    const canStart = session.status === 'PAUSED' || session.players.every((p: any) => p.isReady)

    // กรองเอาเฉพาะ Player (ไม่เอา GM) มาแสดงใน Grid
    const activePlayers = session.players.filter((p: any) => p.role !== 'GM')

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-4 lg:p-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                        {session.campaign?.title || 'Campaign Lobby'}
                        {session.status === 'PAUSED' && <span className="text-amber-500 text-lg ml-3">(RESUMING)</span>}
                    </h1>
                    <div className="flex items-center gap-2 text-slate-400 mt-2">
                        <span className="bg-slate-800 px-3 py-1 rounded text-xs font-mono font-bold text-white">CODE: {session.joinCode}</span>
                        <span>•</span>
                        <span className="text-xs uppercase tracking-wider">{session.players.length} Users Connected</span>
                        <button onClick={handleLogout} className="ml-4 text-xs text-red-400 hover:text-red-300 underline cursor-pointer">(Not {playerName}?)</button>
                    </div>
                </div>
                {myRole === 'GM' && (
                    <button onClick={handleStartGame} disabled={!canStart || isActionLoading} className="w-full md:w-auto bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-black font-black px-8 py-4 rounded-xl shadow-lg transition-all">
                        {isActionLoading ? 'STARTING...' : (session.status === 'PAUSED' ? 'RESUME GAME ▶️' : 'START CAMPAIGN 🚀')}
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LEFT: Party List (Text List) */}
                <div className="lg:col-span-1 bg-slate-900/50 border border-slate-800 rounded-2xl p-6 h-fit">
                    <h2 className="text-lg font-bold text-white mb-4">Connected Users</h2>
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
                                {p.role === 'GM' ? <span className="text-[10px] bg-amber-900/30 text-amber-500 border border-amber-900 px-2 py-1 rounded">HOST</span> : p.isReady ? <span className="text-[10px] bg-emerald-900/30 text-emerald-500 border border-emerald-900 px-2 py-1 rounded">✅ READY</span> : <span className="text-[10px] bg-slate-800 text-slate-500 px-2 py-1 rounded animate-pulse">...waiting</span>}
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT: Main Area */}
                <div className="lg:col-span-2">

                    {/* 🟢 GM VIEW: แสดง Player Grid Status */}
                    {myRole === 'GM' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-bold text-white">Player Status</h2>
                                <span className="text-sm text-slate-400">{activePlayers.filter((p: any) => p.isReady).length} / {activePlayers.length} Ready</span>
                            </div>

                            {activePlayers.length === 0 ? (
                                <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-2xl text-slate-500">
                                    <div className="text-4xl mb-4 animate-pulse">📡</div>
                                    <p>Waiting for adventurers to join...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {activePlayers.map((p: any) => {
                                        // พยายามดึงรูปภาพจาก JSON String
                                        let avatar = '/placeholder.jpg'
                                        try {
                                            if (p.preGenId) {
                                                // ถ้าเลือก PreGen ลองหาจาก session.campaign.preGens
                                                const pg = session.campaign?.preGens.find((gen: any) => gen.id === p.preGenId)
                                                if (pg) avatar = pg.avatarUrl
                                            } else if (p.characterData) {
                                                const d = JSON.parse(p.characterData)
                                                if (d.imageUrl) avatar = d.imageUrl
                                            }
                                        } catch (e) { }

                                        return (
                                            <div key={p.id} className={`relative bg-slate-900 rounded-xl overflow-hidden border-2 transition-all ${p.isReady ? 'border-emerald-500 shadow-lg shadow-emerald-900/20' : 'border-slate-800 opacity-80'}`}>
                                                {/* Card Image */}
                                                <div className="aspect-[4/3] bg-black relative">
                                                    <img src={avatar} className="w-full h-full object-cover" />
                                                    {/* Badge Status */}
                                                    <div className="absolute top-2 right-2">
                                                        {p.isReady ? (
                                                            <span className="bg-emerald-500 text-black text-[10px] font-black px-2 py-1 rounded shadow-lg uppercase">Ready</span>
                                                        ) : (
                                                            <span className="bg-amber-500 text-black text-[10px] font-black px-2 py-1 rounded shadow-lg uppercase animate-pulse">Choosing...</span>
                                                        )}
                                                    </div>
                                                </div>
                                                {/* Card Info */}
                                                <div className="p-3">
                                                    <div className="font-bold text-white truncate">{p.name}</div>
                                                    <div className="text-xs text-slate-500 truncate">
                                                        {p.isReady ? 'Locked in' : 'Selecting character'}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* 🔵 PLAYER VIEW: เลือกตัวละคร / โชว์สถานะตัวเอง */}
                    {myRole === 'PLAYER' && (
                        <div>
                            {isMeReady ? (
                                // ✅ Player Ready View: โชว์การ์ดใหญ่ๆ ของตัวเอง
                                <div className="flex flex-col items-center justify-center min-h-[400px]">
                                    <div className="bg-slate-900 border-2 border-emerald-500 rounded-2xl p-1 shadow-2xl shadow-emerald-900/40 w-full max-w-sm">
                                        <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-black mb-4">
                                            <img src={getPlayerImage(myPlayer)} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-6">
                                                <h2 className="text-3xl font-black text-white">{myPlayer.name}</h2>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="bg-emerald-500 text-black text-xs font-bold px-2 py-1 rounded">STATUS: READY</span>
                                                    <span className="text-slate-300 text-xs">{myPlayer.sheetType === 'ROLE_AND_ROLL' ? 'Role & Roll' : 'Standard'} Sheet</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-4 text-center">
                                            <p className="text-slate-400 text-sm animate-pulse">Waiting for Game Master to start the adventure...</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                // 🟡 Player Selecting View: เลือกตัวละคร
                                <>
                                    <div className="flex justify-between items-center mb-4">
                                        <h2 className="text-xl font-bold text-white">Select Your Character</h2>
                                    </div>

                                    {/* Create New Button */}
                                    <button
                                        onClick={() => setIsCreatingChar(true)}
                                        className="w-full bg-slate-800/50 border border-dashed border-slate-600 text-slate-400 hover:text-amber-400 hover:border-amber-400 p-6 rounded-xl mb-8 transition-all flex flex-col items-center gap-2 group"
                                    >
                                        <span className="text-2xl group-hover:scale-110 transition-transform">✨</span>
                                        <span className="font-bold uppercase tracking-wider">Create Custom Character</span>
                                    </button>

                                    {/* Pre-Gen List */}
                                    {session.campaign?.preGens?.length > 0 && (
                                        <div className="mb-8">
                                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Or Choose Pre-Generated</h3>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                {session.campaign.preGens.map((char: any) => (
                                                    <div
                                                        key={char.id}
                                                        onClick={() => setSelectedCharId(char.id)}
                                                        className={`cursor-pointer rounded-xl overflow-hidden border-2 transition-all flex flex-col relative group ${selectedCharId === char.id ? 'border-emerald-500 bg-slate-800 shadow-emerald-900/20 shadow-lg scale-[1.02]' : 'border-slate-800 bg-slate-900 hover:border-slate-600'}`}
                                                    >
                                                        <div className="w-full aspect-[4/3] bg-black relative">
                                                            <img src={char.avatarUrl || '/placeholder.jpg'} className="w-full h-full object-cover" />
                                                            <div className="absolute top-2 right-2">
                                                                <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wider border shadow-sm backdrop-blur-md ${char.sheetType === 'ROLE_AND_ROLL' ? 'bg-amber-900/80 text-amber-500 border-amber-500/50' : 'bg-blue-900/80 text-blue-400 border-blue-500/50'}`}>
                                                                    {char.sheetType === 'ROLE_AND_ROLL' ? 'RnR' : 'STD'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="p-3 text-center">
                                                            <h3 className={`font-bold text-sm truncate ${selectedCharId === char.id ? 'text-emerald-400' : 'text-white'}`}>{char.name}</h3>
                                                        </div>
                                                        {selectedCharId === char.id && (
                                                            <div className="absolute inset-0 border-4 border-emerald-500 rounded-xl pointer-events-none"></div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {session.campaign?.preGens?.length > 0 && (
                                        <button
                                            onClick={handleReady}
                                            disabled={!selectedCharId || isActionLoading}
                                            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95"
                                        >
                                            {isActionLoading ? 'LOCKING IN...' : 'CONFIRM SELECTION ✅'}
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {isCreatingChar && myPlayerId && (
                <CharacterCreator
                    playerId={myPlayerId}
                    initialName={playerName}
                    onSave={handleSaveCharacter}
                    onCancel={() => setIsCreatingChar(false)}
                />
            )}
        </div>
    )
}