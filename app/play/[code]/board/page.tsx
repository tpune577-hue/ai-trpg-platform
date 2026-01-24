'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react' // ✅ 1. เพิ่มการใช้ Session จริง
import { useGameSocket } from '@/hooks/useGameSocket'
import { getLobbyInfo, updateGameSessionState, kickPlayer, pauseGameSession, endGameSession, updateCharacterStats } from '@/app/actions/game'
import { addCustomAsset } from '@/app/actions/quick-add'

// ✅ Voice & Shared Components
import VoicePanel from '@/components/game/VoicePanel'
import ImageUploader from '@/components/shared/ImageUploader'

// ✅ Board Components
import { GameLog } from '@/components/board/GameLog'
import { SceneDisplay } from '@/components/board/SceneDisplay'
import { EnhancedPartyStatus } from '@/components/board/EnhancedPartyStatus'
import { DiceResultOverlay } from '@/components/board/DiceResultOverlay'
import { rollD4RnR } from '@/lib/rnr-dice'

export default function CampaignBoardPage() {
    const params = useParams()
    const router = useRouter()
    const joinCode = params.code as string

    // ✅ 2. ดึงข้อมูล User จาก NextAuth
    const { data: authSession } = useSession()

    // --- DATA STATE ---
    const [session, setSession] = useState<any>(null)
    const [campaignScenes, setCampaignScenes] = useState<any[]>([])
    const [campaignNpcs, setCampaignNpcs] = useState<any[]>([])
    const [customScenes, setCustomScenes] = useState<any[]>([])
    const [customNpcs, setCustomNpcs] = useState<any[]>([])
    const [dbPlayers, setDbPlayers] = useState<any[]>([])
    const [isLoadingData, setIsLoadingData] = useState(true)
    const [myIdentity, setMyIdentity] = useState<string>('')

    // --- GAME STATE ---
    const [gameState, setGameState] = useState<any>({
        currentScene: null,
        sceneImageUrl: '',
        activeNpcs: []
    })
    const [logs, setLogs] = useState<any[]>([])
    const [gmNarration, setGmNarration] = useState<string>('')
    const [playerInventories, setPlayerInventories] = useState<Record<string, any[]>>({})

    // --- UI STATE ---
    const [isSidebarOpen, setIsSidebarOpen] = useState(true)
    const [activeTab, setActiveTab] = useState<'SCENE' | 'NPC' | 'PARTY' | 'NOTE' | 'STORY'>('PARTY')
    const [gmInput, setGmInput] = useState('')
    const [targetDC, setTargetDC] = useState(15)

    // RESIZE STATE
    const [sceneHeightPercent, setSceneHeightPercent] = useState(60)
    const [isResizing, setIsResizing] = useState(false)
    const boardRef = useRef<HTMLDivElement>(null)

    // Quick Add Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [addModalType, setAddModalType] = useState<'SCENE' | 'NPC'>('SCENE')
    const [newItemName, setNewItemName] = useState('')
    const [newItemUrl, setNewItemUrl] = useState('')
    const [isAddingItem, setIsAddingItem] = useState(false)

    // AI & Animation State
    const [isAiLoading, setIsAiLoading] = useState(false)
    const [showingDiceResult, setShowingDiceResult] = useState<any>(null)
    const [diceResult, setDiceResult] = useState<any>(null)
    const overlayTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // Note & Task State
    const [gmNotes, setGmNotes] = useState('')
    const [tasks, setTasks] = useState<{ id: number, text: string, done: boolean }[]>([])
    const [newTask, setNewTask] = useState('')

    // --- HELPER FUNCTIONS ---
    const addTask = () => {
        if (!newTask.trim()) return
        setTasks(prev => [...prev, { id: Date.now(), text: newTask, done: false }])
        setNewTask('')
    }
    const toggleTask = (id: number) => {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
    }
    const removeTask = (id: number) => {
        setTasks(prev => prev.filter(t => t.id !== id))
    }

    // Load LocalStorage & Identity Fallback
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedNotes = localStorage.getItem(`gm_notes_${joinCode}`)
            const savedTasks = localStorage.getItem(`gm_tasks_${joinCode}`)
            if (savedNotes) setGmNotes(savedNotes)
            if (savedTasks) setTasks(JSON.parse(savedTasks))

            // ✅ 3. จัดการเรื่องชื่อ Identity (ถ้า Login ให้ใช้ชื่อจริง ถ้าไม่ให้ใช้ Temp)
            if (authSession?.user?.name) {
                setMyIdentity(authSession.user.name)
            } else {
                const storedId = localStorage.getItem('rnr_temp_id') || `User-${Math.floor(Math.random() * 1000)}`
                if (!localStorage.getItem('rnr_temp_id')) localStorage.setItem('rnr_temp_id', storedId)
                setMyIdentity(storedId)
            }
        }
    }, [joinCode, authSession])

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(`gm_notes_${joinCode}`, gmNotes)
            localStorage.setItem(`gm_tasks_${joinCode}`, JSON.stringify(tasks))
        }
    }, [gmNotes, tasks, joinCode])

    // --- SOCKET HOOK ---
    const {
        onGameStateUpdate, onChatMessage, onPlayerAction, onDiceResult,
        requestRoll, sendPlayerAction,
        setPrivateScene, sendWhisper, onWhisperReceived, giveItem
    } = useGameSocket(joinCode, {
        userId: authSession?.user?.id || 'DEMO_GM_TOKEN',
        userName: myIdentity || 'Game Master',
        autoConnect: true
    })

    const handleAnnounce = (log: any) => {
        sendPlayerAction({
            actionType: 'ANNOUNCE',
            actorId: 'GM',
            actorName: 'Game Master',
            message: log.content,
            payload: { message: log.content }
        } as any)
    }

    // Fetch Data
    const fetchCampaignData = async () => {
        try {
            // ดึงข้อมูล Lobby จาก Server Actions
            const data = await getLobbyInfo(joinCode)
            if (data) {
                setSession(data)

                // ✅ 4. ลบ data.currentUser?.name ออก เพราะแก้ผ่าน authSession แล้ว
                // และทำการโหลดข้อมูล Assets
                setCampaignScenes(data.campaign?.scenes || [])
                setCampaignNpcs(data.campaign?.npcs || [])

                if (data.customScenes) {
                    try { setCustomScenes(JSON.parse(data.customScenes)) } catch (e) { console.error("Parse Error customScenes", e) }
                }
                if (data.customNpcs) {
                    try { setCustomNpcs(JSON.parse(data.customNpcs)) } catch (e) { console.error("Parse Error customNpcs", e) }
                }

                if (data.players) {
                    setDbPlayers(data.players.map((p: any) => {
                        const charData = p.characterData ? JSON.parse(p.characterData) : {}
                        return {
                            id: p.id,
                            name: p.name,
                            role: p.role,
                            character: charData,
                            stats: charData.stats || charData || {}
                        }
                    }))
                }

                const savedActiveNpcs = data.activeNpcs ? JSON.parse(data.activeNpcs) : []
                let initialSceneId = data.currentSceneId
                let initialSceneUrl = ''

                if (initialSceneId) {
                    const allScenesList = [...(data.campaign?.scenes || []), ...(data.customScenes ? JSON.parse(data.customScenes) : [])]
                    const foundScene = allScenesList.find((s: any) => s.id === initialSceneId)
                    initialSceneUrl = foundScene?.imageUrl || ''
                } else if (data.campaign?.scenes?.length > 0) {
                    initialSceneId = data.campaign.scenes[0].id
                    initialSceneUrl = data.campaign.scenes[0].imageUrl
                }

                setGameState((prev: any) => ({
                    ...prev,
                    currentScene: initialSceneId,
                    sceneImageUrl: initialSceneUrl,
                    activeNpcs: savedActiveNpcs
                }))
            }
        } catch (err) {
            console.error(err)
        } finally {
            setIsLoadingData(false)
        }
    }

    useEffect(() => {
        fetchCampaignData()
    }, [joinCode])

    // Socket Listeners
    useEffect(() => {
        onGameStateUpdate((newState) => setGameState((prev: any) => ({ ...prev, ...newState })))
        onChatMessage((message) => setLogs((prev) => prev.some(log => log.id === message.id) ? prev : [...prev, message]))
        onWhisperReceived((data) => {
            setLogs((prev) => [...prev, {
                id: Date.now().toString(), content: `(Whisper ${data.sender}): ${data.message}`,
                type: 'NARRATION', senderName: 'System', timestamp: new Date()
            }])
        })

        onPlayerAction((action) => {
            if (action.actionType === 'PLAYER_KICKED') {
                setDbPlayers(prev => prev.filter(p => p.id !== action.targetPlayerId))
                return
            }
            if (action.actionType === 'RNR_LIVE_UPDATE') {
                setShowingDiceResult(action)
            }
            if (action.actionType === 'rnr_roll' || action.actionType === 'dice_roll') {
                if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current)
                setShowingDiceResult(action)
                overlayTimeoutRef.current = setTimeout(() => {
                    setShowingDiceResult(null)
                    overlayTimeoutRef.current = null
                }, 5000)
            }

            if (action.actionType !== 'GM_UPDATE_SCENE') {
                let content = ''
                if (action.actorName === 'Game Master' && action.actionType === 'custom') {
                    content = action.description
                } else if (action.actorName === 'Game Master') {
                    content = `Game Master : ${action.description || action.actionType}`
                } else {
                    const player = dbPlayers.find(p => p.id === action.actorId)
                    if (player) {
                        const charName = player.character?.name || action.actorName
                        const isPrivate = action.isPrivate || action.payload?.isPrivate
                        const prefix = isPrivate ? '🔒 (Private) ' : ''
                        content = `${prefix}${player.name} (${charName}) ${action.actionType} : ${action.description || ''}`
                    } else {
                        const isPrivate = action.isPrivate || action.payload?.isPrivate
                        const prefix = isPrivate ? '🔒 (Private) ' : ''
                        content = `${prefix}${action.actorName} ${action.actionType} : ${action.description || ''}`
                    }
                }

                if (action.actionType !== 'RNR_LIVE_UPDATE' &&
                    action.actionType !== 'rnr_roll' &&
                    action.actionType !== 'dice_roll' &&
                    action.actionType !== 'WHISPER') {
                    setLogs((prev) => [...prev, {
                        id: Date.now().toString(), content,
                        type: action.actionType === 'custom' ? 'NARRATION' : 'ACTION',
                        senderName: action.actorName, timestamp: new Date()
                    }])
                }
            }

            if (action.actorName === 'Game Master' && action.actionType === 'custom') setGmNarration(action.description)

            if (action.actionType === 'PLAYER_INVENTORY_UPDATE') {
                const items = action.payload?.inventory || []
                if (Array.isArray(items)) {
                    setPlayerInventories(prev => ({ ...prev, [action.targetPlayerId || '']: items }))
                }
            }
        })

    }, [onGameStateUpdate, onChatMessage, onPlayerAction, onWhisperReceived, dbPlayers, joinCode])

    useEffect(() => {
        onDiceResult(async (result) => {
            const playerName = result.playerName || result.actorName || 'Unknown'
            if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current)
            setShowingDiceResult(result)
            overlayTimeoutRef.current = setTimeout(() => {
                setShowingDiceResult(null)
                overlayTimeoutRef.current = null
            }, 3000)

            let logMessage = ''
            if (result.details && Array.isArray(result.details)) {
                logMessage = `🎲 ${playerName} rolled Role & Roll: ${result.total}`
            } else {
                const successText = result.total >= (result.dc || 0) ? '✅ Success' : '❌ Failed'
                logMessage = `🎲 ${playerName} rolled ${result.checkType}: ${result.total} (DC ${result.dc}) ${successText}`
            }

            setLogs((prev) => [...prev, {
                id: `${Date.now()}-dice`, content: logMessage, type: 'DICE',
                senderName: playerName, timestamp: new Date()
            }])
        })
    }, [joinCode])

    // --- GM Actions ---
    const handleGmNarrate = () => {
        if (!gmInput.trim()) return
        sendPlayerAction({ actionType: 'custom', description: gmInput, actorName: 'Game Master' } as any)
        setGmInput('')
    }

    const handleAskAI = async () => {
        if (isAiLoading) return
        setIsAiLoading(true)
        try {
            const chatHistory = logs.slice(-10).map(log => ({
                role: log.senderName === 'Game Master' || log.senderName === 'GM' ? 'assistant' : 'user',
                content: `${log.senderName}: ${log.content}`
            }))
            const response = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    campaignId: session?.campaign?.id,
                    history: chatHistory,
                    gameState: {
                        currentScene: campaignScenes.find(s => s.id === gameState.currentScene)?.name || 'Unknown',
                        activeNpcs: gameState.activeNpcs.map((n: any) => n.name)
                    }
                })
            })
            const data = await response.json()
            if (data.result) setGmInput(data.result)
        } catch (error) {
            console.error("AI Error:", error)
        } finally {
            setIsAiLoading(false)
        }
    }

    const handleGmRoll = () => {
        const system = session?.campaign?.system || 'STANDARD'
        if (system === 'ROLE_AND_ROLL') {
            const rows: any[][] = []
            let currentWaveCount = 5
            let totalScore = 0
            while (currentWaveCount > 0) {
                const waveResults = []
                let nextWaveCount = 0
                for (let i = 0; i < currentWaveCount; i++) {
                    const res = rollD4RnR()
                    waveResults.push(res); totalScore += res.score
                    if (res.triggersReroll) nextWaveCount++
                }
                rows.push(waveResults); currentWaveCount = nextWaveCount
                if (rows.length > 10) break
            }
            sendPlayerAction({ actionType: 'rnr_roll', actorName: 'Game Master', total: totalScore, details: rows, checkType: 'GM Roll' } as any)
        } else {
            const roll = Math.floor(Math.random() * 20) + 1
            sendPlayerAction({ actionType: 'dice_roll', actorName: 'Game Master', checkType: 'D20 Check', roll, mod: 0, total: roll, dc: 0 } as any)
        }
    }

    const changeScene = async (sceneId: string, imageUrl: string) => {
        const newState = { ...gameState, currentScene: sceneId, sceneImageUrl: imageUrl }
        setGameState(newState)
        await sendPlayerAction({ actionType: 'GM_UPDATE_SCENE', payload: newState, actorName: 'Game Master' } as any)
        updateGameSessionState(joinCode, { currentScene: sceneId, activeNpcs: gameState.activeNpcs }).catch(console.error)
    }

    const toggleNpc = async (npc: any) => {
        const currentNpcs = gameState?.activeNpcs || []
        const isActive = currentNpcs.some((n: any) => n.id === npc.id)
        let newNpcs = isActive ? currentNpcs.filter((n: any) => n.id !== npc.id) : [...currentNpcs, { ...npc, imageUrl: npc.avatarUrl || npc.imageUrl }]
        const newState = { ...gameState, activeNpcs: newNpcs }
        setGameState(newState)
        await sendPlayerAction({ actionType: 'GM_UPDATE_SCENE', payload: newState, actorName: 'Game Master' } as any)
        updateGameSessionState(joinCode, { currentScene: gameState.currentScene, activeNpcs: newNpcs }).catch(console.error)
    }

    const handleKickPlayer = async (playerId: string, playerName: string) => {
        if (!confirm(`Kick ${playerName}?`)) return
        await kickPlayer(playerId)
        await sendPlayerAction({ actionType: 'PLAYER_KICKED', targetPlayerId: playerId } as any)
        setDbPlayers(prev => prev.filter(p => p.id !== playerId))
    }

    const handlePauseGame = async () => {
        if (!confirm("Pause Session?")) return
        await pauseGameSession(joinCode)
        router.push('/')
    }

    const handleEndSession = async () => {
        if (!confirm("⚠️ END SESSION PERMANENTLY?")) return
        await endGameSession(joinCode)
        router.push('/')
    }

    const handleGiveItem = (targetPlayerId: string, itemData: any, action: string) => {
        giveItem(targetPlayerId, itemData, action as any)
    }

    const handleUpdateVitals = async (playerId: string, type: 'hp' | 'mp', delta: number) => {
        const player = dbPlayers.find(p => p.id === playerId)
        if (!player || !player.stats) return
        const isRnR = player.character?.sheetType === 'ROLE_AND_ROLL'
        let statsUpdate: any = {}

        if (isRnR) {
            const vitals = player.stats.vitals || {}
            if (type === 'hp') statsUpdate = { vitals: { ...vitals, health: Math.max(0, (vitals.health || 0) + delta) } }
            else statsUpdate = { vitals: { ...vitals, mental: Math.max(0, (vitals.mental || 0) + delta) } }
        } else {
            if (type === 'hp') statsUpdate = { hp: Math.max(0, (player.stats.hp || 0) + delta) }
            else statsUpdate = { mp: Math.max(0, (player.stats.mp || 0) + delta) }
        }

        setDbPlayers(prev => prev.map(p => p.id === playerId ? { ...p, stats: { ...p.stats, ...statsUpdate } } : p))
        await updateCharacterStats(playerId, statsUpdate)
        await sendPlayerAction({ actionType: 'STATS_UPDATE', targetPlayerId: playerId, actorName: 'GM', description: JSON.stringify(statsUpdate) } as any)
    }

    const handleQuickAdd = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newItemName || !newItemUrl) return
        setIsAddingItem(true)
        try {
            const tempItem = { id: `temp_${Date.now()}`, name: newItemName, imageUrl: newItemUrl, avatarUrl: newItemUrl, isCustom: true }
            if (addModalType === 'SCENE') setCustomScenes(prev => [...prev, tempItem])
            else setCustomNpcs(prev => [...prev, tempItem])
            await addCustomAsset(session.id, addModalType, newItemName, newItemUrl)
            setIsAddModalOpen(false); setNewItemName(''); setNewItemUrl('')
        } catch (error) {
            console.error(error)
        } finally {
            setIsAddingItem(false)
        }
    }

    const partyPlayers = dbPlayers.filter(p => p.role !== 'GM')
    const campaignSystem = session?.campaign?.system || 'STANDARD'
    const SHORTCUT_STATS = campaignSystem === 'ROLE_AND_ROLL' ? ['Strength', 'Dexterity', 'Intellect', 'Charm'] : ['STR', 'DEX', 'INT', 'WIS', 'CHA']
    const allScenes = [...campaignScenes, ...customScenes]
    const allNpcs = [...campaignNpcs, ...customNpcs]

    if (isLoadingData) return <div className="h-screen bg-slate-950 flex items-center justify-center text-amber-500 animate-pulse">Loading Board...</div>

    return (
        <div className="flex h-screen bg-[#0f172a] text-slate-200 overflow-hidden font-sans relative">
            {/* HEADER */}
            <div className="absolute top-0 w-full h-14 bg-slate-900/90 border-b border-slate-700 flex justify-between items-center px-4 z-50 backdrop-blur-md">
                <h1 className="text-amber-500 font-bold tracking-widest uppercase">GM Dashboard ({campaignSystem})</h1>
                <div className="flex items-center gap-2">
                    <button onClick={handlePauseGame} className="bg-slate-800 px-3 py-1 rounded text-xs border border-slate-600">⏸ Pause</button>
                    <button onClick={handleEndSession} className="bg-red-900/50 px-3 py-1 rounded text-xs border border-red-800">🛑 END</button>
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden p-2 text-slate-300 bg-slate-800 ml-2">☰</button>
                </div>
            </div>

            {/* CONTENT */}
            <div className="flex flex-1 pt-14 pb-24 md:pb-32 h-full w-full relative">
                {/* LEFT: Board & Log */}
                <div className="flex-1 flex flex-col w-full h-full min-w-0 relative" ref={boardRef}>
                    <div style={{ height: `${sceneHeightPercent}%` }} className="w-full relative bg-black shrink-0">
                        <SceneDisplay sceneDescription={gmNarration} imageUrl={gameState?.sceneImageUrl || '/placeholder.jpg'} npcs={gameState?.activeNpcs || []} />
                        {showingDiceResult && <DiceResultOverlay result={showingDiceResult} onClose={() => setShowingDiceResult(null)} />}
                    </div>

                    <div onMouseDown={() => setIsResizing(true)} className="h-2 w-full bg-slate-800 hover:bg-amber-500 cursor-row-resize flex items-center justify-center shrink-0 transition-colors z-20" />

                    <div className="flex-1 bg-slate-950 border-t border-slate-800 flex flex-col min-h-0">
                        <div className="bg-slate-900 px-3 py-1 text-xs font-bold text-slate-500 uppercase">Adventure Log</div>
                        <div className="flex-1 p-2 overflow-y-auto custom-scrollbar"><GameLog logs={logs} onAnnounce={handleAnnounce} /></div>
                    </div>
                </div>

                {/* RIGHT: Sidebar */}
                <div className={`fixed inset-y-0 right-0 z-40 w-96 bg-slate-900 border-l border-slate-700 pt-14 transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} lg:relative lg:translate-x-0 lg:flex lg:pt-0 lg:w-96 flex flex-col h-full overflow-hidden`}>
                    <div className="flex border-b border-slate-800">
                        {['PARTY', 'SCENE', 'NPC', 'NOTE', 'STORY'].map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`flex-1 py-3 text-xs font-bold uppercase ${activeTab === tab ? 'bg-slate-800 text-amber-500 border-b-2 border-amber-500' : 'text-slate-500'}`}>{tab}</button>
                        ))}
                    </div>

                    <div className="flex-1 min-h-0 p-3 overflow-y-auto custom-scrollbar">
                        {activeTab === 'PARTY' && (
                            <EnhancedPartyStatus
                                players={partyPlayers}
                                scenes={allScenes.map(s => ({ id: s.id, name: s.name, url: s.imageUrl }))}
                                system={campaignSystem as any}
                                onSetPrivateScene={setPrivateScene}
                                onWhisper={sendWhisper}
                                onGiveItem={handleGiveItem}
                                onRequestRoll={(pid, type, dc) => requestRoll(type, dc, pid)}
                                onKickPlayer={handleKickPlayer}
                                onUpdateVitals={handleUpdateVitals}
                                playerInventories={playerInventories}
                            />
                        )}
                        {activeTab === 'SCENE' && (
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => { setAddModalType('SCENE'); setIsAddModalOpen(true) }} className="aspect-video bg-slate-800 border-2 border-dashed border-slate-600 rounded flex flex-col items-center justify-center hover:bg-slate-700 hover:border-amber-500">
                                    <span className="text-xl">+</span><span className="text-[10px] uppercase font-bold text-slate-500">Add Scene</span>
                                </button>
                                {allScenes.map(s => (
                                    <div key={s.id} onClick={() => changeScene(s.id, s.imageUrl)} className={`aspect-video bg-black rounded border-2 cursor-pointer overflow-hidden ${gameState.currentScene === s.id ? 'border-amber-500' : 'border-slate-700'}`}>
                                        <img src={s.imageUrl} className="w-full h-full object-cover opacity-70 hover:opacity-100 transition-opacity" alt={s.name} />
                                    </div>
                                ))}
                            </div>
                        )}
                        {activeTab === 'NPC' && (
                            <div className="space-y-1">
                                <button onClick={() => { setAddModalType('NPC'); setIsAddModalOpen(true) }} className="w-full p-3 rounded border-2 border-dashed border-slate-700 text-slate-500 hover:text-green-400 mb-3 text-xs uppercase font-bold">+ Add Temp NPC</button>
                                {allNpcs.map(npc => (
                                    <div key={npc.id} onClick={() => toggleNpc(npc)} className={`flex items-center gap-2 p-2 rounded cursor-pointer border ${gameState.activeNpcs.some((n: any) => n.id === npc.id) ? 'bg-amber-900/20 border-amber-500' : 'border-transparent hover:bg-slate-800'}`}>
                                        <img src={npc.avatarUrl || npc.imageUrl} className="w-8 h-8 rounded bg-black object-cover" alt={npc.name} />
                                        <span className="text-xs text-white font-bold">{npc.name}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {activeTab === 'NOTE' && <textarea value={gmNotes} onChange={e => setGmNotes(e.target.value)} className="w-full h-40 bg-slate-950 border-slate-700 rounded p-2 text-xs text-slate-300" placeholder="GM Notes..." />}
                        {activeTab === 'STORY' && <div className="space-y-4 text-xs text-slate-300"><div className="bg-slate-950 p-2 rounded border border-slate-800"><h4 className="font-bold text-amber-500 mb-1">Introduction</h4><p>{session?.campaign?.storyIntro || 'No intro provided.'}</p></div></div>}
                    </div>

                    {/* ✅ 5. VoicePanel ล่างสุดของ Sidebar */}
                    <div className="shrink-0 z-20 pb-24 lg:pb-0">
                        <VoicePanel room={joinCode} username={myIdentity || 'Game Master'} />
                    </div>
                </div>
            </div>

            {/* BOTTOM CONTROLS */}
            <div className="absolute bottom-0 w-full h-auto min-h-[80px] md:h-32 bg-slate-900 border-t border-slate-700 flex flex-col md:flex-row items-center px-4 py-2 gap-3 z-50">
                <div className="flex gap-2 shrink-0">
                    <button onClick={handleGmRoll} className="bg-amber-600 hover:bg-amber-500 text-black px-4 py-2 rounded-lg font-black flex items-center gap-2">🎲 <span className="hidden md:inline">GM Roll</span></button>
                </div>

                <div className="w-full md:flex-1 flex gap-2">
                    <button onClick={handleAskAI} disabled={isAiLoading} className="px-3 py-2 bg-indigo-600 rounded-lg text-white text-sm font-bold flex items-center gap-2">
                        {isAiLoading ? '⏳' : '✨ AI Assist'}
                    </button>
                    <input value={gmInput} onChange={e => setGmInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleGmNarrate()} placeholder="Type narration..." className="flex-1 bg-slate-800 border-slate-700 rounded px-3 py-2 text-sm text-slate-200 outline-none h-12" />
                    <button onClick={handleGmNarrate} className="bg-slate-700 text-slate-200 px-3 py-2 rounded text-sm font-bold h-12">Send</button>
                </div>

                <div className="w-full md:w-auto flex gap-2 overflow-x-auto">
                    <input type="number" value={targetDC} onChange={e => setTargetDC(Number(e.target.value))} className="w-12 bg-slate-800 border-slate-700 rounded text-center text-amber-500 font-bold h-10" />
                    {SHORTCUT_STATS.map(stat => (
                        <button key={stat} onClick={() => requestRoll(`${stat} Check`, targetDC)} className="w-10 h-10 bg-slate-800 border-slate-600 rounded flex flex-col items-center justify-center active:scale-95">
                            <span className="text-[8px] text-slate-400 uppercase">{stat.substring(0, 3)}</span>
                            <span className="text-xs">🎲</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ADD ASSET MODAL */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-white mb-4">Add Temporary {addModalType}</h3>
                        <form onSubmit={handleQuickAdd} className="space-y-4">
                            <input required value={newItemName} onChange={e => setNewItemName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm" placeholder="Name..." />
                            <ImageUploader value={newItemUrl} onChange={setNewItemUrl} label="Upload Image" aspectRatio={addModalType === 'SCENE' ? 'aspect-video' : 'aspect-square'} required />
                            <div className="flex gap-2 pt-2">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-2 bg-slate-800 text-slate-300 rounded font-bold">Cancel</button>
                                <button type="submit" disabled={isAddingItem || !newItemUrl} className="flex-1 py-2 bg-green-600 text-white rounded font-bold">{isAddingItem ? 'Adding...' : 'Add Asset'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}