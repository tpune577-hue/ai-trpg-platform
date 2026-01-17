'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useGameSocket } from '@/hooks/useGameSocket'
import { getLobbyInfo, updateGameSessionState, kickPlayer, pauseGameSession, endGameSession } from '@/app/actions/game'
import { GameLog } from '@/components/board/GameLog'
import { SceneDisplay } from '@/components/board/SceneDisplay'
import { EnhancedPartyStatus } from '@/components/board/EnhancedPartyStatus'

export default function CampaignBoardPage() {
    const params = useParams()
    const router = useRouter()
    const joinCode = params.code as string

    // --- DATA STATE ---
    const [session, setSession] = useState<any>(null)
    const [campaignScenes, setCampaignScenes] = useState<any[]>([])
    const [campaignNpcs, setCampaignNpcs] = useState<any[]>([])
    const [dbPlayers, setDbPlayers] = useState<any[]>([])
    const [isLoadingData, setIsLoadingData] = useState(true)

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
    const [diceResult, setDiceResult] = useState<any>(null)

    // --- NOTE & TASK STATE ---
    const [gmNotes, setGmNotes] = useState('')
    const [tasks, setTasks] = useState<{ id: number, text: string, done: boolean }[]>([])
    const [newTask, setNewTask] = useState('')

    // ✅ DEFINING TASK FUNCTIONS (วางไว้ตรงนี้เพื่อความชัวร์)
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

    // Load LocalStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedNotes = localStorage.getItem(`gm_notes_${joinCode}`)
            const savedTasks = localStorage.getItem(`gm_tasks_${joinCode}`)
            if (savedNotes) setGmNotes(savedNotes)
            if (savedTasks) setTasks(JSON.parse(savedTasks))
        }
    }, [joinCode])

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
        sessionToken: 'DEMO_GM_TOKEN',
        autoConnect: true
    })

    // Fetch Data
    useEffect(() => {
        const fetchCampaignData = async () => {
            try {
                const data = await getLobbyInfo(joinCode)
                if (data) {
                    setSession(data)
                    setCampaignScenes(data.campaign?.scenes || [])
                    setCampaignNpcs(data.campaign?.npcs || [])
                    if (data.players) {
                        setDbPlayers(data.players.map((p: any) => ({
                            id: p.id, name: p.name, role: p.role,
                            character: p.characterData ? JSON.parse(p.characterData) : {},
                            stats: p.characterData ? JSON.parse(p.characterData) : {}
                        })))
                    }
                    const savedActiveNpcs = data.activeNpcs ? JSON.parse(data.activeNpcs) : []
                    let initialSceneId = data.currentSceneId
                    let initialSceneUrl = ''
                    if (initialSceneId) {
                        const foundScene = data.campaign?.scenes.find((s: any) => s.id === initialSceneId)
                        initialSceneUrl = foundScene?.imageUrl || ''
                    } else if (data.campaign?.scenes?.length > 0) {
                        initialSceneId = data.campaign.scenes[0].id
                        initialSceneUrl = data.campaign.scenes[0].imageUrl
                    }
                    setGameState((prev: any) => ({
                        ...prev, currentScene: initialSceneId, sceneImageUrl: initialSceneUrl, activeNpcs: savedActiveNpcs
                    }))
                }
            } catch (err) { console.error(err) } finally { setIsLoadingData(false) }
        }
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
            if (action.actionType !== 'GM_MANAGE_INVENTORY' && action.actionType !== 'GM_UPDATE_SCENE') {
                const content = (action.actorName === 'Game Master' && action.actionType === 'custom') ? action.description : `${action.actorName} used ${action.actionType}: ${action.description}`
                setLogs((prev) => [...prev, {
                    id: Date.now().toString(), content, type: action.actionType === 'custom' ? 'NARRATION' : 'ACTION',
                    senderName: action.actorName, timestamp: new Date()
                }])
            }
            if (action.actorName === 'Game Master' && action.actionType === 'custom') setGmNarration(action.description)

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
                id: `${Date.now()}-dice`, content: `🎲 ${playerName} rolled ${result.checkType}: ${result.total} (DC ${result.dc}) ${successText}`,
                type: 'DICE', senderName: playerName, timestamp: new Date()
            }])
        })
    }, [onGameStateUpdate, onChatMessage, onPlayerAction, onDiceResult, onWhisperReceived])

    // --- GM Actions ---
    const handleGmNarrate = () => {
        if (!gmInput.trim()) return
        sendPlayerAction({ actionType: 'custom', description: gmInput, actorName: 'Game Master' } as any)
        setGmInput('')
    }
    const handleGmRoll = () => {
        const roll = Math.floor(Math.random() * 20) + 1
        setDiceResult({ roll, total: roll, checkType: 'GM Roll', actorName: 'GM' })
        setTimeout(() => setDiceResult(null), 3000)
        sendPlayerAction({ actionType: 'dice_roll', actorName: 'Game Master', checkType: 'D20 Check', roll, mod: 0, total: roll, dc: 0 } as any)
    }

    // ✅ FIX: Change Scene & Send Socket
    const changeScene = async (sceneId: string, imageUrl: string) => {
        const newState = { ...gameState, currentScene: sceneId, sceneImageUrl: imageUrl, activeNpcs: gameState.activeNpcs }
        setGameState(newState)

        await sendPlayerAction({
            actionType: 'GM_UPDATE_SCENE',
            payload: newState,
            actorName: 'Game Master',
            description: 'GM changed the scene.'
        } as any)

        updateGameSessionState(joinCode, { currentScene: sceneId, activeNpcs: gameState.activeNpcs }).catch(console.error)
    }

    // ✅ FIX: Toggle NPC & Send Socket
    const toggleNpc = async (npc: any) => {
        const currentNpcs = gameState?.activeNpcs || []
        const isActive = currentNpcs.some((n: any) => n.id === npc.id)
        let newNpcs = isActive ? currentNpcs.filter((n: any) => n.id !== npc.id) : [...currentNpcs, { ...npc, imageUrl: npc.avatarUrl || npc.imageUrl }]

        const newState = { ...gameState, activeNpcs: newNpcs }
        setGameState(newState)

        await sendPlayerAction({
            actionType: 'GM_UPDATE_SCENE',
            payload: {
                activeNpcs: newNpcs,
                currentScene: gameState.currentScene,
                sceneImageUrl: gameState.sceneImageUrl
            },
            actorName: 'Game Master',
            description: isActive ? `GM removed ${npc.name}` : `GM spawned ${npc.name}`
        } as any)

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
        await updateGameSessionState(joinCode, { currentScene: gameState.currentScene, activeNpcs: gameState.activeNpcs })
        await pauseGameSession(joinCode)
        router.push('/')
    }

    const handleEndSession = async () => {
        if (!confirm("⚠️ END SESSION PERMANENTLY?")) return
        await sendPlayerAction({ actionType: 'SESSION_ENDED', description: 'Session Ended.', actorName: 'System' } as any)
        await endGameSession(joinCode)
        router.push('/')
    }

    const handleGiveItem = (targetPlayerId: string, itemData: any, action: string) => {
        giveItem(targetPlayerId, itemData, action as 'GIVE_CUSTOM' | 'REMOVE')
        setPlayerInventories(prev => {
            const currentItems = prev[targetPlayerId] || []
            if (action === 'REMOVE') return { ...prev, [targetPlayerId]: currentItems.filter((i: any) => i.id !== itemData.id) }
            else return { ...prev, [targetPlayerId]: [...currentItems, itemData] }
        })
    }

    const partyPlayers = dbPlayers.filter(p => p.role !== 'GM')

    if (isLoadingData) return <div className="h-screen bg-slate-950 flex items-center justify-center text-amber-500 animate-pulse">Loading...</div>

    const currentSceneUrl = gameState?.sceneImageUrl || '/placeholder.jpg'

    return (
        <div className="flex h-screen bg-[#0f172a] text-slate-200 overflow-hidden font-sans relative">

            {/* HEADER */}
            <div className="absolute top-0 w-full h-14 bg-slate-900/90 border-b border-slate-700 flex justify-between items-center px-4 z-50 backdrop-blur-md shadow-lg">
                <h1 className="text-amber-500 font-bold tracking-widest text-sm md:text-lg uppercase">GM Dashboard (Code: {joinCode})</h1>
                <div className="flex items-center gap-2">
                    <button onClick={handlePauseGame} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1 rounded text-xs border border-slate-600">⏸ Pause</button>
                    <button onClick={handleEndSession} className="bg-red-900/50 hover:bg-red-600 text-red-200 px-3 py-1 rounded text-xs border border-red-800">🛑 END</button>
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden p-2 text-slate-300 border border-slate-700 rounded bg-slate-800 ml-2">{isSidebarOpen ? '✖' : '☰'}</button>
                </div>
            </div>

            {/* CONTENT */}
            <div className="flex flex-1 pt-14 pb-24 md:pb-24 h-full w-full relative">

                {/* LEFT: Board & Log */}
                <div className="flex-1 flex flex-col w-full h-full min-w-0">
                    <div className="h-[70%] relative bg-black">
                        <SceneDisplay sceneDescription={gmNarration} imageUrl={currentSceneUrl} npcs={gameState?.activeNpcs || []} />
                        {diceResult && (
                            <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/60 backdrop-blur-sm">
                                <div className="bg-slate-900 p-8 rounded-2xl border-2 border-amber-500 text-center animate-in zoom-in">
                                    <div className="text-7xl font-bold text-white">{diceResult.total}</div>
                                    <div className="text-xs text-amber-500 mt-2 uppercase tracking-widest">{diceResult.checkType}</div>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="h-[30%] bg-slate-950 border-t border-slate-800 flex flex-col">
                        <div className="bg-slate-900 px-3 py-1 text-xs font-bold text-slate-500 uppercase">Adventure Log</div>
                        <div className="flex-1 p-2 overflow-y-auto custom-scrollbar"><GameLog logs={logs} /></div>
                    </div>
                </div>

                {/* RIGHT: Sidebar with EnhancedPartyStatus */}
                <div className={`fixed inset-y-0 right-0 z-40 w-96 bg-slate-900 border-l border-slate-700 shadow-2xl transform transition-transform duration-300 pt-14 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} lg:relative lg:translate-x-0 lg:block lg:pt-0 lg:w-96 lg:shadow-none flex flex-col h-full overflow-hidden`}>

                    {/* Tabs */}
                    <div className="flex border-b border-slate-800">
                        <TabButton active={activeTab === 'PARTY'} onClick={() => setActiveTab('PARTY')} label={`Party (${partyPlayers.length})`} />
                        <TabButton active={activeTab === 'SCENE'} onClick={() => setActiveTab('SCENE')} label="Scenes" />
                        <TabButton active={activeTab === 'NPC'} onClick={() => setActiveTab('NPC')} label="NPCs" />
                        <TabButton active={activeTab === 'NOTE'} onClick={() => setActiveTab('NOTE')} label="Note" />
                        <TabButton active={activeTab === 'STORY'} onClick={() => setActiveTab('STORY')} label="Story" />
                    </div>

                    <div className="flex-1 p-3 overflow-y-auto custom-scrollbar">

                        {/* TAB: PARTY */}
                        {activeTab === 'PARTY' && (
                            <EnhancedPartyStatus
                                players={partyPlayers}
                                scenes={campaignScenes.map(s => ({ id: s.id, name: s.name, url: s.imageUrl }))}
                                onSetPrivateScene={(pid, sid) => {
                                    const targetScene = campaignScenes.find(s => s.id === sid)
                                    setPrivateScene(pid, targetScene || null)
                                }}
                                onWhisper={sendWhisper}
                                onGiveItem={handleGiveItem}
                                onRequestRoll={(pid, type, dc) => requestRoll(type, dc, pid)}
                                onKickPlayer={handleKickPlayer} // ✅ ส่ง Function Kick ไปให้ UI
                                playerInventories={playerInventories}
                            />
                        )}

                        {/* TAB: SCENE */}
                        {activeTab === 'SCENE' && (
                            <div className="grid grid-cols-2 gap-2">
                                {campaignScenes.map(s => (
                                    <div key={s.id} onClick={() => changeScene(s.id, s.imageUrl)} className={`aspect-video bg-black rounded border-2 cursor-pointer relative ${gameState.sceneImageUrl === s.imageUrl ? 'border-amber-500' : 'border-slate-700 hover:border-slate-500'}`}>
                                        <img src={s.imageUrl} className="w-full h-full object-cover opacity-70 hover:opacity-100" />
                                        <div className="absolute bottom-0 w-full bg-black/60 text-white text-[9px] p-1 truncate">{s.name}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* TAB: NPC */}
                        {activeTab === 'NPC' && (
                            <div className="space-y-1">
                                {campaignNpcs.map(npc => {
                                    const active = gameState.activeNpcs.some((n: any) => n.id === npc.id)
                                    return (
                                        <div key={npc.id} onClick={() => toggleNpc(npc)} className={`flex items-center gap-2 p-2 rounded cursor-pointer border ${active ? 'bg-amber-900/20 border-amber-500' : 'hover:bg-slate-800 border-transparent'}`}>
                                            <img src={npc.avatarUrl} className="w-8 h-8 rounded bg-black" />
                                            <span className="text-xs text-white font-bold flex-1">{npc.name}</span>
                                            {active && <span className="text-[9px] text-amber-500">ON BOARD</span>}
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {/* TAB: NOTE */}
                        {activeTab === 'NOTE' && (
                            <div className="space-y-4">
                                <textarea value={gmNotes} onChange={e => setGmNotes(e.target.value)} className="w-full h-40 bg-slate-950 border-slate-700 rounded p-2 text-xs text-slate-300" placeholder="Notes..." />
                                <div>
                                    <h4 className="text-xs font-bold text-emerald-500 uppercase mb-2">Tasks</h4>
                                    <div className="flex gap-2 mb-2">
                                        <input value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTask()} className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs" placeholder="Task..." />
                                        <button onClick={addTask} className="text-emerald-500 font-bold">+</button>
                                    </div>
                                    <div className="space-y-1">
                                        {tasks.map(t => (
                                            <div key={t.id} className="flex items-center gap-2 text-xs">
                                                <input type="checkbox" checked={t.done} onChange={() => toggleTask(t.id)} className="accent-emerald-500" />
                                                <span className={t.done ? 'line-through text-slate-600' : 'text-slate-300'}>{t.text}</span>
                                                <button onClick={() => removeTask(t.id)} className="ml-auto text-slate-600 hover:text-red-500">×</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB: STORY */}
                        {activeTab === 'STORY' && (
                            <div className="space-y-4 text-xs text-slate-300">
                                <div className="bg-slate-950 p-2 rounded border border-slate-800"><h4 className="font-bold text-amber-500 mb-1">Intro</h4><p>{session?.campaign?.storyIntro || '-'}</p></div>
                                <div className="bg-slate-950 p-2 rounded border border-slate-800"><h4 className="font-bold text-amber-500 mb-1">Mid-Game</h4><p>{session?.campaign?.storyMid || '-'}</p></div>
                                <div className="bg-slate-950 p-2 rounded border border-slate-800"><h4 className="font-bold text-amber-500 mb-1">Ending</h4><p>{session?.campaign?.storyEnd || '-'}</p></div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* BOTTOM CONTROLS */}
            <div className="absolute bottom-0 w-full h-auto min-h-[80px] md:h-24 bg-slate-900 border-t border-slate-700 flex flex-col md:flex-row items-center px-4 py-2 gap-3 z-50">
                <div className="flex gap-2 shrink-0">
                    <button onClick={handleGmRoll} className="bg-amber-600 hover:bg-amber-500 text-black px-4 py-2 rounded-lg font-black shadow-lg active:scale-95 transition-all flex items-center gap-2"><span className="text-xl">🎲</span><span className="hidden md:inline">GM Roll</span></button>
                </div>
                <div className="w-full md:flex-1 flex gap-2">
                    <input value={gmInput} onChange={e => setGmInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleGmNarrate()} placeholder="Narrate..." className="flex-1 bg-slate-800 border-slate-700 rounded px-3 py-2 text-sm text-slate-200 outline-none focus:border-amber-500" />
                    <button onClick={handleGmNarrate} className="bg-slate-700 text-slate-200 px-3 py-2 rounded text-sm font-bold">Send</button>
                </div>
                <div className="w-full md:w-auto flex gap-2 overflow-x-auto pb-2 md:pb-0">
                    <input type="number" value={targetDC} onChange={e => setTargetDC(Number(e.target.value))} className="w-12 bg-slate-800 border-slate-700 rounded text-center text-amber-500 font-bold text-sm" />
                    {['STR', 'DEX', 'INT', 'WIS', 'CHA'].map(stat => (
                        <button key={stat} onClick={() => requestRoll(`${stat} Check`, targetDC)} className="w-10 h-10 bg-slate-800 border-slate-600 rounded flex flex-col items-center justify-center active:scale-95 hover:border-slate-400"><span className="text-[8px] text-slate-400">{stat}</span><span className="text-xs">🎲</span></button>
                    ))}
                </div>
            </div>
        </div>
    )
}

function TabButton({ active, onClick, label }: any) {
    return <button onClick={onClick} className={`flex-1 min-w-[80px] py-3 text-xs font-bold uppercase tracking-wide transition-colors whitespace-nowrap px-2 ${active ? 'bg-slate-800 text-amber-500 border-b-2 border-amber-500' : 'text-slate-500 hover:text-slate-300'}`}>{label}</button>
}