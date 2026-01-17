'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useGameSocket } from '@/hooks/useGameSocket'
import { getLobbyInfo, submitReview, updateCharacterStats } from '@/app/actions/game'
import { SceneDisplay } from '@/components/board/SceneDisplay'
import { GameLog } from '@/components/board/GameLog'

export default function PlayerControllerPage() {
    const params = useParams()
    const router = useRouter()
    const joinCode = params.code as string

    // --- PLAYER STATE ---
    const [playerId] = useState(() => {
        if (typeof window !== 'undefined') {
            const savedSession = localStorage.getItem(`trpg_session_${joinCode}`)
            if (savedSession) {
                try {
                    const data = JSON.parse(savedSession)
                    if (data.playerId) return data.playerId
                } catch (e) { }
            }
            return localStorage.getItem('trpg_player_id') || `player-${Math.floor(Math.random() * 10000)}`
        }
        return `player-${Math.floor(Math.random() * 10000)}`
    })

    const [character, setCharacter] = useState<any>(null)
    const [playerName, setPlayerName] = useState<string>('')
    const hasJoined = useRef(false)

    // --- GAME STATE ---
    const [gameState, setGameState] = useState<any>({
        currentScene: null,
        sceneImageUrl: '',
        activeNpcs: []
    })
    const [campaignScenes, setCampaignScenes] = useState<any[]>([])

    // --- UI STATE ---
    const [logs, setLogs] = useState<any[]>([])
    const [customAction, setCustomAction] = useState('')
    const [activeTab, setActiveTab] = useState<'ACTIONS' | 'INVENTORY'>('ACTIONS')
    const [gmNarration, setGmNarration] = useState<string>('')
    const [inventory, setInventory] = useState<any[]>([])

    // --- OVERLAYS ---
    const [selectedItemDetail, setSelectedItemDetail] = useState<any>(null)
    const [rollRequest, setRollRequest] = useState<any>(null)
    const [willBoost, setWillBoost] = useState(0)
    const [lastWhisper, setLastWhisper] = useState<{ sender: string, message: string } | null>(null)
    const [privateSceneId, setPrivateSceneId] = useState<string | null>(null)

    // --- REVIEW MODAL ---
    const [showReviewModal, setShowReviewModal] = useState(false)
    const [rating, setRating] = useState(5)
    const [reviewComment, setReviewComment] = useState('')
    const [isSubmittingReview, setIsSubmittingReview] = useState(false)

    // --- DEBUG STATE ---
    const [debugLogs, setDebugLogs] = useState<string[]>([])
    const [showDebug, setShowDebug] = useState(false)
    const addDebugLog = (msg: string) => setDebugLogs(prev => [msg, ...prev].slice(0, 20))

    // Refs
    const logContainerRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // --- SOCKET CONNECTION ---
    const {
        sendPlayerAction,
        onGameStateUpdate,
        onRollRequested,
        onChatMessage,
        onPlayerAction,
        onDiceResult,
        onPrivateSceneUpdate,
        onWhisperReceived
    } = useGameSocket(joinCode, {
        sessionToken: 'DEMO_PLAYER_TOKEN',
        userId: playerId,
        autoConnect: true
    })

    // Load player name from localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedSession = localStorage.getItem(`trpg_session_${joinCode}`)
            if (savedSession) {
                try {
                    const data = JSON.parse(savedSession)
                    if (data.name) setPlayerName(data.name)
                } catch (e) { }
            }
        }
    }, [joinCode])

    // --- 1. INITIAL SYNC & JOIN ---
    useEffect(() => {
        const initGame = async () => {
            // A. Fetch Initial State
            try {
                const session = await getLobbyInfo(joinCode)
                if (!session) return

                if (session.status === 'ENDED') {
                    setShowReviewModal(true)
                    return
                }

                // Sync Scene & NPCs
                let targetSceneId = session.currentSceneId
                let targetSceneUrl = ''
                let targetNpcs = []

                // ✅ Parse NPCs safely
                try {
                    if (typeof session.activeNpcs === 'string') {
                        targetNpcs = JSON.parse(session.activeNpcs)
                    } else if (Array.isArray(session.activeNpcs)) {
                        targetNpcs = session.activeNpcs
                    }
                } catch (e) { console.error("NPC Parse Error", e) }

                if (targetSceneId) {
                    const s = session.campaign?.scenes.find((s: any) => s.id === targetSceneId)
                    targetSceneUrl = s?.imageUrl || ''
                } else if (session.campaign?.scenes?.length > 0) {
                    targetSceneId = session.campaign.scenes[0].id
                    targetSceneUrl = session.campaign.scenes[0].imageUrl
                }

                setGameState({
                    currentScene: targetSceneId,
                    sceneImageUrl: targetSceneUrl,
                    activeNpcs: targetNpcs
                })

                // Store campaign scenes for private scene lookup
                setCampaignScenes(session.campaign?.scenes || [])

                // Load character data from session
                const myPlayer = session.players?.find((p: any) => p.id === playerId)
                if (myPlayer) {
                    let charData: any = {}
                    try {
                        charData = myPlayer.characterData ? JSON.parse(myPlayer.characterData) : {}
                    } catch (e) {
                        console.error("Character data parse error:", e)
                    }

                    setCharacter({
                        name: charData.name || myPlayer.name || 'Adventurer',
                        hp: charData.hp || 20,
                        maxHp: charData.maxHp || 20,
                        mp: charData.mp || 10,
                        maxMp: charData.maxMp || 10,
                        avatarUrl: charData.avatarUrl || charData.imageUrl || 'https://placehold.co/100x100/333/FFF?text=Hero',
                        stats: charData.stats || charData // If stats is nested, use it; otherwise use entire charData
                    })
                }

            } catch (error) { console.error("Sync Error:", error) }

            // B. Join as Character (only if not already joined)
            if (!hasJoined.current && character) {
                hasJoined.current = true

                setTimeout(() => {
                    sendPlayerAction({
                        actionType: 'JOIN_GAME',
                        actorId: playerId,
                        actorName: character.name,
                        characterData: { ...character, id: playerId },
                        description: 'has joined the party.'
                    } as any)
                }, 1000)
            }
        }
        initGame()
    }, [joinCode, playerId, sendPlayerAction])

    // --- 2. SOCKET LISTENERS ---
    useEffect(() => {
        if (onRollRequested) onRollRequested((req) => setRollRequest(req))

        // ✅ FIX: Handle Game State Update safely
        if (onGameStateUpdate) {
            onGameStateUpdate((newState: any) => {
                const logMsg = `🔄 Update: ${JSON.stringify(newState).slice(0, 100)}...`
                console.log(logMsg)
                addDebugLog(logMsg)

                setGameState((prev: any) => {
                    // Safe Parse NPCs
                    let updatedNpcs = newState.activeNpcs
                    if (typeof updatedNpcs === 'string') {
                        try { updatedNpcs = JSON.parse(updatedNpcs) } catch (e) {
                            console.error("NPC Parse Error", e)
                            addDebugLog(`❌ NPC Parse Error: ${e}`)
                        }
                    }

                    // Construct new state ensuring we don't lose existing data if not sent
                    const nextState = {
                        ...prev,
                        ...newState, // Overwrite with new data
                        currentScene: newState.currentScene || prev.currentScene,
                        sceneImageUrl: newState.sceneImageUrl || prev.sceneImageUrl,
                        activeNpcs: updatedNpcs !== undefined ? updatedNpcs : (prev.activeNpcs || [])
                    }

                    addDebugLog(`✅ State Applied: Scene=${nextState.currentScene}`)
                    console.log("✅ New Game State Applied:", nextState)
                    return nextState
                })
            })
        }

        if (onPrivateSceneUpdate) onPrivateSceneUpdate((data) => {
            console.log("🔒 Private Scene Update:", data)
            addDebugLog(`🔒 Private: ${data.sceneId || 'CLEARED'}`)
            setPrivateSceneId(data.sceneId)
        })

        const handleLog = (msg: any) => {
            setLogs((prev) => {
                if (prev.some(l => l.id === msg.id)) return prev
                return [...prev, msg]
            })
            setTimeout(() => scrollToBottom(), 100)
        }

        if (onChatMessage) onChatMessage(handleLog)

        if (onWhisperReceived) {
            onWhisperReceived((data) => {
                setLastWhisper(data)
                setTimeout(() => setLastWhisper(null), 8000)
                handleLog({ id: Date.now().toString(), content: `🤫 Whisper from ${data.sender}: "${data.message}"`, type: 'WHISPER', senderName: data.sender, timestamp: new Date() })
            })
        }

        if (onPlayerAction) {
            onPlayerAction((action) => {
                console.log("📥 Action Received:", action.actionType, action)



                if (action.actionType === 'SESSION_ENDED') {
                    setShowReviewModal(true)
                    return
                }

                if (action.actionType === 'PLAYER_KICKED' && action.targetPlayerId === playerId) {
                    alert("You have been kicked by the GM.")
                    router.push('/')
                    return
                }

                // Inventory Management
                if (action.actionType === 'GM_MANAGE_INVENTORY' && action.targetPlayerId === playerId) {
                    const { itemData, action: mode } = action.payload || {};
                    if (mode === 'GIVE_CUSTOM' || mode === 'ADD') {
                        setInventory(prev => { if (prev.some(i => i.id === itemData.id)) return prev; return [...prev, itemData] })
                        handleLog({ id: `item-${Date.now()}`, content: `🎁 Received: ${itemData.name}`, type: 'NARRATION', senderName: 'System', timestamp: new Date() })
                    } else if (mode === 'REMOVE') {
                        setInventory(prev => prev.filter(i => i.id !== itemData.id))
                        handleLog({ id: `rm-${Date.now()}`, content: `❌ Removed: ${itemData.name}`, type: 'SYSTEM', senderName: 'System', timestamp: new Date() })
                    }
                    return
                }

                // General Logs
                if (!['GM_MANAGE_INVENTORY', 'GM_UPDATE_SCENE'].includes(action.actionType)) {
                    handleLog({
                        id: `${Date.now()}-${action.actionType}`,
                        content: action.description || `${action.actorName} used ${action.actionType}`,
                        type: 'ACTION',
                        senderName: action.actorName,
                        timestamp: new Date()
                    })
                }

                if (action.actorName === 'Game Master' && action.actionType === 'custom') {
                    setGmNarration(action.description)
                }
            })
        }

        if (onDiceResult) {
            onDiceResult((result) => {
                handleLog({ id: Date.now().toString(), content: `🎲 ${result.actorName} rolled ${result.total} (${result.roll}+${result.mod})`, type: 'DICE', senderName: 'System', timestamp: new Date() })
            })
        }

    }, [onRollRequested, onGameStateUpdate, onChatMessage, onPrivateSceneUpdate, onWhisperReceived, onPlayerAction, onDiceResult, playerId, router])

    // --- UTILS ---
    const scrollToBottom = (smooth = true) => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTo({ top: logContainerRef.current.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
        }
    }


    const handleAction = async (actionType: string) => { await sendPlayerAction({ actionType, actorId: playerId, actorName: character?.name, description: `performed ${actionType}` } as any) }

    // Helper: Get stat modifier based on check type
    const getStatModifier = (checkType: string): number => {
        console.log('🎲 Getting stat modifier for:', checkType)
        console.log('📊 Character stats:', character?.stats)

        if (!character?.stats) {
            console.log('❌ No character stats found')
            return 0
        }

        // Extract stat name from check type (e.g., "STR Check" → "STR")
        const statName = checkType.split(' ')[0].toUpperCase()
        console.log('🔍 Looking for stat:', statName)

        // Try to find the stat (case-insensitive)
        const stat = character.stats[statName] ||
            character.stats[statName.toLowerCase()] ||
            character.stats[checkType] ||
            0

        console.log('✅ Found stat value:', stat)
        return Number(stat) || 0
    }

    const handleRollResponse = async () => {
        if (!rollRequest) return
        const roll = Math.floor(Math.random() * 20) + 1
        const mod = getStatModifier(rollRequest.checkType)
        const total = roll + mod + willBoost

        await sendPlayerAction({
            actionType: 'dice_roll',
            checkType: rollRequest.checkType,
            dc: rollRequest.dc,
            roll,
            mod,
            willBoost,
            total,
            actorName: character?.name
        } as any)

        // Deduct WILL Power if used
        if (willBoost > 0 && character?.stats) {
            const newWillPower = (character.stats.willPower || 0) - willBoost

            setCharacter(prev => ({
                ...prev,
                stats: {
                    ...prev.stats,
                    willPower: newWillPower
                }
            }))

            // Save WILL Power to database
            try {
                await updateCharacterStats(playerId, { willPower: newWillPower })
            } catch (error) {
                console.error('Failed to update WILL Power:', error)
            }
        }

        setRollRequest(null)
        setWillBoost(0)
    }


    const sendCustomAction = async () => {
        if (!customAction.trim()) return
        await sendPlayerAction({ actionType: 'custom', actorId: playerId, actorName: character?.name, description: customAction } as any)
        setCustomAction('')
        setTimeout(() => { scrollToBottom(); inputRef.current?.focus() }, 100)
    }

    const handleSubmitReview = async () => {
        setIsSubmittingReview(true)
        try {
            await submitReview(joinCode, rating, reviewComment, character?.name || 'Player')
            alert("Thank you for your feedback!")
            router.push('/')
        } catch (error) {
            console.error(error)
            alert("Failed to submit review")
            setIsSubmittingReview(false)
        }
    }

    // Virtual Keyboard
    useEffect(() => {
        if (!window.visualViewport) return
        const handleResize = () => {
            setTimeout(() => scrollToBottom(false), 100)
            if (document.activeElement === inputRef.current) setTimeout(() => inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)
        }
        window.visualViewport.addEventListener('resize', handleResize)
        return () => window.visualViewport?.removeEventListener('resize', handleResize)
    }, [])

    const activeImageUrl = (() => {
        // Priority 1: Private Scene (if GM sent this player to a specific location)
        if (privateSceneId) {
            const privateScene = campaignScenes.find(s => s.id === privateSceneId)
            if (privateScene) return privateScene.imageUrl
        }
        // Priority 2: Global Scene
        return gameState?.sceneImageUrl || "https://img.freepik.com/premium-photo/majestic-misty-redwood-forest-with-lush-green-ferns-sunlight-filtering-through-fog_996993-7424.jpg"
    })()
    const activeDescription = gmNarration || gameState?.currentScene || "Connecting..."

    return (
        <div className="h-[100dvh] bg-slate-950 text-white flex flex-col font-sans overflow-hidden">

            {/* 1. HEADER */}
            <div className="bg-slate-900 border-b border-amber-500/30 flex flex-col gap-2 p-2 shrink-0 z-30 shadow-lg relative">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full border-2 border-amber-500 bg-slate-800 overflow-hidden">
                            {character && <img src={character.avatarUrl} className="w-full h-full object-cover" />}
                        </div>
                        <div>
                            <div className="font-bold text-amber-500 text-sm">{character?.name || 'Loading...'}</div>
                            <div className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded inline-block">{playerName || 'Player'}</div>
                        </div>
                    </div>
                    {/* HP/MP Bars */}
                    <div className="w-24 flex flex-col gap-1">
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden"><div className="bg-green-500 h-full w-full" /></div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden"><div className="bg-blue-500 h-full w-3/4" /></div>
                    </div>
                </div>
            </div>

            {/* 2. SCENE */}
            <div className="h-[30vh] relative bg-black shrink-0 shadow-md z-10 transition-all duration-300">
                <SceneDisplay sceneDescription={activeDescription} imageUrl={activeImageUrl} npcs={gameState?.activeNpcs || []} />
            </div>

            {/* 3. LOG */}
            <div className="flex-1 bg-slate-950 flex flex-col min-h-0 relative">
                <div ref={logContainerRef} className="flex-1 p-3 overflow-y-auto custom-scrollbar scroll-smooth">
                    <GameLog logs={logs} />
                </div>
            </div>

            {/* 4. CONTROLS */}
            <div className="bg-slate-900 border-t border-slate-800 shrink-0 z-20 pb-safe">
                <div className="flex border-b border-slate-800">
                    <button onClick={() => setActiveTab('ACTIONS')} className={`flex-1 py-2 text-xs font-bold uppercase ${activeTab === 'ACTIONS' ? 'bg-slate-800 text-amber-500 border-b-2 border-amber-500' : 'text-slate-500'}`}>Actions</button>
                    <button onClick={() => setActiveTab('INVENTORY')} className={`flex-1 py-2 text-xs font-bold uppercase ${activeTab === 'INVENTORY' ? 'bg-slate-800 text-amber-500 border-b-2 border-amber-500' : 'text-slate-500'}`}>Inventory ({inventory.length})</button>
                </div>

                <div className="p-3">
                    {activeTab === 'ACTIONS' ? (
                        <>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <ActionButton icon="⚔️" label="Attack" color="red" onClick={() => handleAction('attack')} />
                                <ActionButton icon="🦶" label="Move" color="yellow" onClick={() => handleAction('move')} />
                                <ActionButton icon="🔍" label="Inspect" color="gray" onClick={() => handleAction('inspect')} />
                                <ActionButton icon="💬" label="Talk" color="purple" onClick={() => handleAction('talk')} />
                            </div>
                            <div className="flex gap-2">
                                <input ref={inputRef} value={customAction} onChange={e => setCustomAction(e.target.value)} placeholder="Type action..." className="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white" />
                                <button onClick={sendCustomAction} className="bg-amber-600 px-4 rounded text-black font-bold">GO</button>
                            </div>
                        </>
                    ) : (
                        <div className="grid grid-cols-4 gap-2">
                            {inventory.map((item, idx) => (
                                <button key={idx} onClick={() => setSelectedItemDetail(item)} className="aspect-square bg-slate-800 border border-slate-700 rounded flex items-center justify-center text-2xl">{item.icon || '📦'}</button>
                            ))}
                            {inventory.length === 0 && <div className="col-span-4 text-center text-slate-600 text-xs py-4">Empty Inventory</div>}
                        </div>
                    )}
                </div>
            </div>

            {/* MODALS */}
            {showReviewModal && (
                <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300 backdrop-blur-md">
                    <div className="bg-slate-900 w-full max-w-sm p-8 rounded-2xl border-2 border-amber-500 shadow-[0_0_50px_rgba(245,158,11,0.3)] text-center relative">
                        <div className="text-5xl mb-4">🏆</div>
                        <h2 className="text-2xl font-bold text-white mb-2">Session Ended</h2>
                        <p className="text-slate-400 mb-6">How was your adventure?</p>
                        <div className="flex justify-center gap-2 mb-6">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button key={star} onClick={() => setRating(star)} className={`text-4xl transition-transform hover:scale-125 ${rating >= star ? 'text-amber-400' : 'text-slate-700'}`}>★</button>
                            ))}
                        </div>
                        <textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white mb-6 h-24 focus:border-amber-500 outline-none resize-none" placeholder="Leave a comment (Optional)" />
                        <button onClick={handleSubmitReview} disabled={isSubmittingReview} className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50">
                            {isSubmittingReview ? 'Sending...' : 'SUBMIT REVIEW'}
                        </button>
                    </div>
                </div>
            )}

            {selectedItemDetail && (
                <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-6" onClick={() => setSelectedItemDetail(null)}>
                    <div className="bg-slate-900 p-6 rounded-xl border border-slate-600 w-full max-w-xs text-center">
                        <div className="text-4xl mb-2">{selectedItemDetail.icon || '📦'}</div>
                        <h3 className="font-bold text-amber-500">{selectedItemDetail.name}</h3>
                        <p className="text-sm text-slate-400 my-2">{selectedItemDetail.description}</p>
                        <button className="bg-blue-600 px-4 py-2 rounded text-white text-sm" onClick={() => { sendPlayerAction({ actionType: 'use_item', actorId: playerId, payload: { itemId: selectedItemDetail.id, itemName: selectedItemDetail.name }, actorName: character.name, description: `used ${selectedItemDetail.name}` } as any); setSelectedItemDetail(null); }}>USE ITEM</button>
                    </div>
                </div>
            )}

            {rollRequest && (
                <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6">
                    <div className="bg-slate-900 p-6 rounded-2xl border-2 border-amber-500 w-full max-w-xs text-center">
                        <h2 className="text-xl font-bold text-white">GM Orders Roll!</h2>
                        <div className="text-amber-500 text-2xl font-black my-4">{rollRequest.checkType}</div>

                        {/* WILL Power Boost */}
                        <div className="bg-slate-800 rounded-xl p-4 mb-4 border border-slate-700">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-slate-400 font-bold">⚡ WILL BOOST</span>
                                <span className="text-xs text-amber-400">Available: {character?.stats?.willPower || 0}</span>
                            </div>
                            <input
                                type="number"
                                min="0"
                                max={character?.stats?.willPower || 0}
                                value={willBoost}
                                onChange={(e) => setWillBoost(Math.min(Number(e.target.value), character?.stats?.willPower || 0))}
                                className="w-full bg-slate-950 border border-slate-600 rounded-lg p-2 text-center text-white font-bold focus:border-amber-500 outline-none"
                                placeholder="0"
                            />
                            <div className="text-[10px] text-slate-500 mt-2">1 WILL = +1 to roll</div>
                        </div>

                        {/* Preview */}
                        <div className="bg-slate-950 rounded-lg p-3 mb-4 text-xs text-slate-300">
                            <div>Total = Roll + {getStatModifier(rollRequest.checkType)} (stat) + {willBoost} (WILL)</div>
                        </div>

                        <button onClick={handleRollResponse} className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl">ROLL D20</button>
                    </div>
                </div>
            )}
            {/* DEBUG TOGGLE */}
            <button onClick={() => setShowDebug(!showDebug)} className="fixed top-14 right-2 text-[10px] bg-red-900/50 text-red-300 px-2 py-1 rounded z-50 border border-red-800 opacity-50 hover:opacity-100">
                debug
            </button>

            {/* DEBUG PANEL */}
            {showDebug && (
                <div className="fixed top-20 right-2 w-64 bg-black/90 text-[10px] font-mono p-2 border border-red-500 z-50 rounded h-64 overflow-y-auto pointer-events-auto">
                    <div className="text-red-400 font-bold border-b border-red-900 mb-1">DEBUG LOG</div>
                    <div className="mb-2 text-slate-400">
                        Code: {joinCode}<br />
                        Socket: {playerId ? 'Ready' : '...'}<br />
                        Scene: {gameState.currentScene}
                    </div>
                    {debugLogs.map((log, i) => (
                        <div key={i} className="mb-1 border-b border-white/10 pb-1">{log}</div>
                    ))}
                </div>
            )}
        </div>
    )
}

const ActionButton = ({ icon, label, color, onClick }: any) => {
    const colors: any = { red: "bg-red-900/30 text-red-400", yellow: "bg-amber-900/30 text-amber-400", purple: "bg-purple-900/30 text-purple-400", gray: "bg-slate-800 text-slate-400" }
    return (
        <button onClick={onClick} className={`${colors[color]} border border-white/10 p-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all`}>
            <span className="text-xl">{icon}</span>
            <span className="font-bold text-xs uppercase">{label}</span>
        </button>
    )
}