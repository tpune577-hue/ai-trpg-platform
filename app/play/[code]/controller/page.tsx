'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useGameSocket } from '@/hooks/useGameSocket'
import { getLobbyInfo, submitReview } from '@/app/actions/game'
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
    const hasJoined = useRef(false)

    // --- GAME STATE ---
    const [gameState, setGameState] = useState<any>({
        currentScene: null,
        sceneImageUrl: '',
        activeNpcs: []
    })

    // --- UI STATE ---
    const [logs, setLogs] = useState<any[]>([])
    const [customAction, setCustomAction] = useState('')
    const [activeTab, setActiveTab] = useState<'ACTIONS' | 'INVENTORY'>('ACTIONS')
    const [gmNarration, setGmNarration] = useState<string>('')
    const [inventory, setInventory] = useState<any[]>([])

    // --- OVERLAYS ---
    const [selectedItemDetail, setSelectedItemDetail] = useState<any>(null)
    const [rollRequest, setRollRequest] = useState<any>(null)
    const [lastWhisper, setLastWhisper] = useState<{ sender: string, message: string } | null>(null)
    const [privateSceneId, setPrivateSceneId] = useState<string | null>(null)

    // --- REVIEW MODAL ---
    const [showReviewModal, setShowReviewModal] = useState(false)
    const [rating, setRating] = useState(5)
    const [reviewComment, setReviewComment] = useState('')
    const [isSubmittingReview, setIsSubmittingReview] = useState(false)

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

            } catch (error) { console.error("Sync Error:", error) }

            // B. Join as Character
            if (!hasJoined.current) {
                const myChar = {
                    name: 'Adventurer',
                    hp: 20, maxHp: 20, mp: 10, maxMp: 10,
                    avatarUrl: 'https://placehold.co/100x100/333/FFF?text=Hero'
                }
                setCharacter(myChar)
                hasJoined.current = true

                setTimeout(() => {
                    sendPlayerAction({
                        actionType: 'JOIN_GAME',
                        actorId: playerId,
                        actorName: myChar.name,
                        characterData: { ...myChar, id: playerId },
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

        // ✅ FIX: Handle Game State Update safely (Parse JSON string if needed)
        if (onGameStateUpdate) {
            onGameStateUpdate((newState: any) => {
                console.log("🔄 Global State Update:", newState)
                setGameState((prev: any) => {
                    let updatedNpcs = newState.activeNpcs
                    // ถ้า activeNpcs ส่งมาเป็น String ให้ Parse ก่อน
                    if (typeof updatedNpcs === 'string') {
                        try { updatedNpcs = JSON.parse(updatedNpcs) } catch (e) { }
                    }
                    return {
                        ...prev,
                        ...newState,
                        activeNpcs: updatedNpcs || prev.activeNpcs || []
                    }
                })
            })
        }

        if (onPrivateSceneUpdate) onPrivateSceneUpdate((data) => setPrivateSceneId(data.sceneId))

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

                // ✅ CASE: GM Updates Scene (Direct from GM Board)
                if (action.actionType === 'GM_UPDATE_SCENE') {
                    const payload = action.payload || {}

                    // อัปเดต State ทันทีที่ได้ข้อมูลจาก GM
                    setGameState((prev: any) => ({
                        ...prev,
                        currentScene: payload.currentScene || prev.currentScene,
                        sceneImageUrl: payload.sceneImageUrl || prev.sceneImageUrl,
                        activeNpcs: payload.activeNpcs || prev.activeNpcs || []
                    }))
                }

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

    const handleAction = async (actionType: string) => { await sendPlayerAction({ actionType, actorId: character?.id, actorName: character?.name, description: `performed ${actionType}` } as any) }

    const handleRollResponse = async () => {
        if (!rollRequest) return
        const roll = Math.floor(Math.random() * 20) + 1
        const mod = 0
        await sendPlayerAction({ actionType: 'dice_roll', checkType: rollRequest.checkType, dc: rollRequest.dc, roll, mod, total: roll + mod, actorName: character?.name } as any)
        setRollRequest(null)
    }

    const sendCustomAction = async () => {
        if (!customAction.trim()) return
        await sendPlayerAction({ actionType: 'custom', actorId: character?.id, actorName: character?.name, description: customAction } as any)
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

    const activeImageUrl = gameState?.sceneImageUrl || "https://img.freepik.com/premium-photo/majestic-misty-redwood-forest-with-lush-green-ferns-sunlight-filtering-through-fog_996993-7424.jpg"
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
                            <div className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded inline-block">Adventurer</div>
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
                        <button className="bg-blue-600 px-4 py-2 rounded text-white text-sm" onClick={() => { sendPlayerAction({ actionType: 'use_item', payload: { itemId: selectedItemDetail.id, itemName: selectedItemDetail.name }, actorName: character.name } as any); setSelectedItemDetail(null); }}>USE ITEM</button>
                    </div>
                </div>
            )}

            {rollRequest && (
                <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6">
                    <div className="bg-slate-900 p-6 rounded-2xl border-2 border-amber-500 w-full max-w-xs text-center">
                        <h2 className="text-xl font-bold text-white">GM Orders Roll!</h2>
                        <div className="text-amber-500 text-2xl font-black my-4">{rollRequest.checkType}</div>
                        <button onClick={handleRollResponse} className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl">ROLL D20</button>
                    </div>
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