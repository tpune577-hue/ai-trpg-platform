'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useGameSocket } from '@/hooks/useGameSocket'
import { getLobbyInfo } from '@/app/actions/game'
import { GameLog } from '@/components/board/GameLog'
import { SceneDisplay } from '@/components/board/SceneDisplay'
import { EnhancedPartyStatus } from '@/components/board/EnhancedPartyStatus'

export default function CampaignBoardPage() {
    const params = useParams()
    const joinCode = params.code as string

    // --- GAME DATA FROM DB ---
    const [campaignScenes, setCampaignScenes] = useState<any[]>([])
    const [campaignNpcs, setCampaignNpcs] = useState<any[]>([])
    const [dbPlayers, setDbPlayers] = useState<any[]>([]) // ✅ เก็บ Player จาก DB
    const [isLoadingData, setIsLoadingData] = useState(true)

    // Game State
    const [gameState, setGameState] = useState<any>({
        currentScene: null,
        sceneImageUrl: '',
        activeNpcs: []
    })
    const [logs, setLogs] = useState<any[]>([])
    const [gmNarration, setGmNarration] = useState<string>('')

    // UI State
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [gmInput, setGmInput] = useState('')
    const [targetDC, setTargetDC] = useState(15)

    const [activeTab, setActiveTab] = useState<'SCENE' | 'NPC' | 'PARTY'>('SCENE')
    const [diceResult, setDiceResult] = useState<any>(null)
    const [playerInventories, setPlayerInventories] = useState<Record<string, any[]>>({})

    // Socket Hook
    const {
        roomInfo,
        onGameStateUpdate, onChatMessage, onPlayerAction, onDiceResult,
        requestRoll, sendPlayerAction,
        setPrivateScene, sendWhisper, setGlobalScene, onWhisperReceived,
        giveItem
    } = useGameSocket(joinCode, {
        sessionToken: 'DEMO_GM_TOKEN',
        autoConnect: true
    })

    // ✅ 1. Fetch Data & Setup Initial State
    useEffect(() => {
        const fetchCampaignData = async () => {
            try {
                const data = await getLobbyInfo(joinCode)
                if (data) {
                    // Set Asset Data
                    if (data.campaign) {
                        setCampaignScenes(data.campaign.scenes || [])
                        setCampaignNpcs(data.campaign.npcs || [])
                    }

                    // ✅ Set Player Data from DB (Fix Player List not showing)
                    if (data.players) {
                        // Map ข้อมูล DB ให้ตรงกับ Format ที่ UI ใช้นิดหน่อย
                        const mappedPlayers = data.players.map((p: any) => ({
                            id: p.id,
                            name: p.name,
                            role: p.role,
                            // แปลง characterData string เป็น object
                            character: p.characterData ? JSON.parse(p.characterData) : {}
                        }))
                        setDbPlayers(mappedPlayers)
                    }

                    // Set Initial Scene (ถ้ายังไม่มี state จาก Server)
                    if (!gameState.currentScene && data.campaign?.scenes?.length > 0) {
                        const firstScene = data.campaign.scenes[0]
                        setGameState((prev: any) => ({
                            ...prev,
                            currentScene: firstScene.id,
                            sceneImageUrl: firstScene.imageUrl
                        }))
                    }
                }
            } catch (err) {
                console.error("Failed to fetch campaign data:", err)
            } finally {
                setIsLoadingData(false)
            }
        }
        fetchCampaignData()
    }, [joinCode])

    // Socket Event Listeners
    useEffect(() => {
        // เมื่อ Server ส่ง State มาให้อัปเดตตาม (แต่ถ้าเรากดเอง เราจะอัปเดตนำไปก่อนแล้ว)
        onGameStateUpdate((newState) => {
            console.log("📥 GameState Update:", newState)
            setGameState((prev: any) => ({ ...prev, ...newState }))
        })

        onChatMessage((message) => setLogs((prev) => prev.some(log => log.id === message.id) ? prev : [...prev, message]))

        onWhisperReceived((data) => {
            setLogs((prev) => [...prev, {
                id: Date.now().toString(),
                content: `(Whisper ${data.sender}) ${data.message}`,
                type: 'NARRATION',
                senderName: 'System',
                timestamp: new Date()
            }])
        })

        onPlayerAction((action) => {
            // ... (Logging Logic เหมือนเดิม) ...
            if (action.actionType !== 'GM_MANAGE_INVENTORY') {
                const content = (action.actorName === 'Game Master' && action.actionType === 'custom')
                    ? action.description
                    : `${action.actorName} used ${action.actionType}: ${action.description}`

                setLogs((prev) => [...prev, {
                    id: Date.now().toString(),
                    content,
                    type: action.actionType === 'custom' ? 'NARRATION' : 'ACTION',
                    senderName: action.actorName,
                    timestamp: new Date()
                }])
            }

            if (action.actorName === 'Game Master' && action.actionType === 'custom') {
                setGmNarration(action.description)
            }

            if (action.actionType === 'PLAYER_INVENTORY_UPDATE') {
                const items = action.payload?.inventory || []
                if (Array.isArray(items)) {
                    setPlayerInventories(prev => ({ ...prev, [action.targetPlayerId || '']: items }))
                }
            }
        })

        onDiceResult((result) => {
            setDiceResult(result)
            setTimeout(() => setDiceResult(null), 4000)
            const playerName = result.playerName || result.actorName || 'Unknown'
            const successText = result.total >= (result.dc || 0) ? '✅ Success' : '❌ Failed'
            setLogs((prev) => [...prev, {
                id: `${Date.now()}-dice`,
                content: `🎲 ${playerName} rolled ${result.checkType}: ${result.roll} + ${result.modifier || 0} = ${result.total} (DC ${result.dc}) ${successText}`,
                type: 'DICE',
                senderName: playerName,
                timestamp: new Date()
            }])
        })
    }, [onGameStateUpdate, onChatMessage, onPlayerAction, onDiceResult, onWhisperReceived])

    const handleGmNarrate = () => {
        if (!gmInput.trim()) return
        sendPlayerAction({ actionType: 'custom', description: gmInput, actorName: 'Game Master' } as any)
        setGmInput('')
    }

    // ✅ Fix: Scene Changing (Optimistic Update + Correct Payload)
    const changeScene = (sceneId: string, imageUrl: string) => {
        // 1. อัปเดตหน้าจอ GM ทันที (ไม่ต้องรอ Server)
        setGameState((prev: any) => ({
            ...prev,
            currentScene: sceneId,
            sceneImageUrl: imageUrl
        }))

        // 2. ส่งคำสั่งไปบอก Player คนอื่น
        sendPlayerAction({
            actionType: 'GM_UPDATE_SCENE',
            payload: {
                currentScene: sceneId,
                sceneImageUrl: imageUrl,
                activeNpcs: gameState.activeNpcs // ส่ง NPC ชุดเดิมไปด้วย เดี๋ยวหาย
            }
        } as any)
    }

    // ✅ Fix: NPC Toggling (Optimistic Update)
    const toggleNpc = (npc: any) => {
        const currentNpcs = gameState?.activeNpcs || []
        const isActive = currentNpcs.some((n: any) => n.id === npc.id)
        let newNpcs

        if (isActive) {
            newNpcs = currentNpcs.filter((n: any) => n.id !== npc.id)
        } else {
            // ต้องแน่ใจว่า NPC มี avatarUrl (DB ใช้ avatarUrl, UI อาจจะใช้ imageUrl)
            const npcData = { ...npc, imageUrl: npc.avatarUrl || npc.imageUrl }
            newNpcs = [...currentNpcs, npcData]
        }

        // 1. อัปเดตหน้าจอ GM ทันที
        setGameState((prev: any) => ({
            ...prev,
            activeNpcs: newNpcs
        }))

        // 2. ส่งคำสั่ง
        sendPlayerAction({
            actionType: 'GM_UPDATE_SCENE',
            payload: {
                activeNpcs: newNpcs,
                currentScene: gameState?.currentScene,
                sceneImageUrl: gameState?.sceneImageUrl
            }
        } as any)
    }

    if (isLoadingData) return <div className="h-screen bg-slate-950 flex items-center justify-center text-amber-500 animate-pulse">Loading Campaign Data...</div>

    // Helper Variables
    const currentSceneUrl = gameState?.sceneImageUrl || campaignScenes[0]?.imageUrl || '/placeholder.jpg'
    const currentSceneName = gmNarration || campaignScenes.find(s => s.id === gameState?.currentScene)?.name || 'Adventure Log'

    // ✅ Merge Players: ใช้ DB Players เป็นหลัก ถ้ามี Socket Info ให้เอามาแปะ (เช่น Online Status)
    // แต่เบื้องต้นใช้ dbPlayers ไปก่อนเพื่อให้รายชื่อขึ้นแน่นอน
    const displayPlayers = dbPlayers.length > 0 ? dbPlayers : (roomInfo?.connectedPlayers || [])

    return (
        <div className="flex h-screen bg-[#0f172a] text-slate-200 overflow-hidden font-sans relative">

            {/* Header */}
            <div className="absolute top-0 w-full h-14 bg-slate-900/90 border-b border-slate-700 flex justify-between items-center px-4 z-50 backdrop-blur-md shadow-lg">
                <h1 className="text-amber-500 font-bold tracking-widest text-sm md:text-lg uppercase glow-text">
                    GM Dashboard (Code: {joinCode})
                </h1>
                <div className="flex items-center gap-4">
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden p-2 text-slate-300 border border-slate-700 rounded bg-slate-800">
                        {isSidebarOpen ? '✖' : '☰ Menu'}
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex flex-1 pt-14 pb-24 md:pb-24 h-full w-full relative">

                {/* LEFT: Scene & Log */}
                <div className="flex-1 flex flex-col w-full h-full min-w-0">
                    <div className="h-[60%] relative bg-black">
                        <SceneDisplay
                            sceneDescription={currentSceneName}
                            imageUrl={currentSceneUrl}
                            npcs={gameState?.activeNpcs || []}
                        />
                        {diceResult && (
                            <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/60 backdrop-blur-sm">
                                <div className="bg-slate-900 p-8 rounded-2xl border-2 border-amber-500 text-center animate-in zoom-in">
                                    <div className="text-7xl font-bold text-white">{diceResult.total}</div>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="h-[40%] bg-slate-950 border-t border-slate-800 relative">
                        <div className="h-full p-4"><GameLog logs={logs} /></div>
                    </div>
                </div>

                {/* RIGHT SIDEBAR */}
                <div className={`
                    fixed inset-y-0 right-0 z-40 w-96 bg-slate-900 border-l border-slate-700 shadow-2xl transform transition-transform duration-300 ease-in-out pt-14
                    ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}
                    lg:relative lg:translate-x-0 lg:block lg:pt-0 lg:w-96 lg:shadow-none flex flex-col h-full overflow-hidden
                `}>
                    {/* TABS */}
                    <div className="flex-1 flex flex-col bg-slate-950 min-h-0">
                        <div className="flex border-b border-slate-800">
                            <button onClick={() => setActiveTab('SCENE')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide transition-colors ${activeTab === 'SCENE' ? 'bg-slate-800 text-amber-500 border-b-2 border-amber-500' : 'text-slate-500 hover:text-slate-300'}`}>Scenes</button>
                            <button onClick={() => setActiveTab('NPC')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide transition-colors ${activeTab === 'NPC' ? 'bg-slate-800 text-amber-500 border-b-2 border-amber-500' : 'text-slate-500 hover:text-slate-300'}`}>NPCs</button>
                            <button onClick={() => setActiveTab('PARTY')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide transition-colors ${activeTab === 'PARTY' ? 'bg-slate-800 text-amber-500 border-b-2 border-amber-500' : 'text-slate-500 hover:text-slate-300'}`}>👥 Party ({displayPlayers.length})</button>
                        </div>

                        <div className="flex-1 p-3 overflow-y-auto custom-scrollbar">

                            {/* SCENE TAB */}
                            {activeTab === 'SCENE' && (
                                <div className="grid grid-cols-2 gap-2">
                                    {campaignScenes.length === 0 && <p className="col-span-2 text-center text-slate-500 text-xs py-4">No scenes found.</p>}
                                    {campaignScenes.map(scene => (
                                        <div
                                            key={scene.id}
                                            onClick={() => changeScene(scene.id, scene.imageUrl)}
                                            className={`
                                                relative aspect-video rounded-lg overflow-hidden cursor-pointer border-2 transition-all group
                                                ${gameState?.sceneImageUrl === scene.imageUrl ? 'border-amber-500 ring-2 ring-amber-500/30' : 'border-slate-700 hover:border-slate-500'}
                                            `}
                                        >
                                            <img src={scene.imageUrl} alt={scene.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-2">
                                                <span className="text-[10px] font-bold text-white truncate">{scene.name}</span>
                                            </div>
                                            {gameState?.sceneImageUrl === scene.imageUrl && (
                                                <div className="absolute top-1 right-1 bg-amber-500 text-black text-[8px] font-bold px-1.5 py-0.5 rounded">ACTIVE</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* NPC TAB */}
                            {activeTab === 'NPC' && (
                                <div className="space-y-3">
                                    <div className="text-[10px] text-slate-500 uppercase font-bold text-center mb-2">Click to Toggle Overlay</div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {campaignNpcs.map(npc => {
                                            const isActive = gameState?.activeNpcs?.some((n: any) => n.id === npc.id)
                                            let borderColor = 'border-slate-600'
                                            if (isActive) {
                                                if (npc.type === 'FRIENDLY') borderColor = 'border-emerald-500 ring-2 ring-emerald-500/30'
                                                else if (npc.type === 'ENEMY') borderColor = 'border-red-500 ring-2 ring-red-500/30'
                                                else borderColor = 'border-white ring-2 ring-white/30'
                                            }

                                            return (
                                                <div
                                                    key={npc.id}
                                                    onClick={() => toggleNpc(npc)}
                                                    className={`
                                                        flex flex-col items-center gap-1 cursor-pointer p-2 rounded-lg transition-all
                                                        ${isActive ? 'bg-slate-800' : 'hover:bg-slate-900'}
                                                    `}
                                                >
                                                    <div className={`w-12 h-12 rounded-full border-2 overflow-hidden bg-white/10 ${borderColor}`}>
                                                        <img src={npc.avatarUrl} alt={npc.name} className={`w-full h-full object-cover transition-all ${!isActive && 'grayscale opacity-60'}`} />
                                                    </div>
                                                    <span className={`text-[9px] font-bold truncate max-w-full ${isActive ? 'text-white' : 'text-slate-500'}`}>
                                                        {npc.name}
                                                    </span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* PARTY TAB (Fix: ใช้ displayPlayers) */}
                            {activeTab === 'PARTY' && (
                                <EnhancedPartyStatus
                                    players={displayPlayers} // ✅ ส่ง DB Players ที่มีรายชื่อครบถ้วน
                                    scenes={campaignScenes}
                                    onSetPrivateScene={setPrivateScene}
                                    onWhisper={sendWhisper}
                                    onGiveItem={(targetPlayerId: string, itemData: any, action: 'GIVE_CUSTOM' | 'REMOVE') => {
                                        giveItem(targetPlayerId, itemData, action)
                                        setPlayerInventories(prev => {
                                            const currentItems = prev[targetPlayerId] || []
                                            if (action === 'REMOVE') {
                                                return { ...prev, [targetPlayerId]: currentItems.filter((i: any) => i.id !== itemData.id) }
                                            } else {
                                                if (currentItems.some((i: any) => i.id === itemData.id)) return prev
                                                return { ...prev, [targetPlayerId]: [...currentItems, itemData] }
                                            }
                                        })
                                    }}
                                    onRequestRoll={(playerId, checkType, dc) => requestRoll(checkType, dc, playerId)}
                                    playerInventories={playerInventories}
                                />
                            )}
                        </div>
                    </div>
                </div>
                {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-0 w-full h-auto min-h-[80px] md:h-24 bg-slate-900 border-t border-slate-700 flex flex-col md:flex-row items-center px-4 py-2 gap-3 z-50">
                <div className="w-full md:flex-1 flex gap-2">
                    <input value={gmInput} onChange={(e) => setGmInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleGmNarrate()} placeholder="Narrate..." className="flex-1 bg-slate-800 border-slate-700 rounded px-3 py-2 text-sm text-slate-200 outline-none focus:border-amber-500" />
                    <button onClick={handleGmNarrate} className="bg-slate-700 text-slate-200 px-3 py-2 rounded text-sm font-bold">Send</button>
                </div>
                <div className="w-full md:w-auto flex gap-2 overflow-x-auto pb-2 md:pb-0">
                    <input type="number" value={targetDC} onChange={(e) => setTargetDC(Number(e.target.value))} className="w-12 bg-slate-800 border-slate-700 rounded text-center text-amber-500 font-bold text-sm" />
                    {['STR', 'DEX', 'INT', 'WIS', 'CHA'].map(stat => (
                        <button key={stat} onClick={() => requestRoll(`${stat} Check`, targetDC)} className="w-10 h-10 bg-slate-800 border-slate-600 rounded flex flex-col items-center justify-center active:scale-95">
                            <span className="text-[8px] text-slate-400">{stat}</span>
                            <span className="text-xs">🎲</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}