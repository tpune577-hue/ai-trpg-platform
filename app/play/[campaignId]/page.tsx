'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { useGameSocket } from '@/hooks/useGameSocket'
import { generateCharacter } from '@/lib/character-utils'

import { SceneDisplay } from '@/components/board/SceneDisplay'
import { GameLog } from '@/components/board/GameLog'
import { SCENES } from '@/lib/game-data'

export default function PlayerControllerPage() {
    const params = useParams()
    const campaignId = params.campaignId as string

    // Generate stable player ID
    const [playerId] = useState(() => `player-${Math.floor(Math.random() * 10000)}`)

    // Game State
    const [character, setCharacter] = useState<any>(null)
    const [gameState, setGameState] = useState<any>(null)

    // UI & Logs
    const [logs, setLogs] = useState<any[]>([])
    const [customAction, setCustomAction] = useState('')
    const [activeTab, setActiveTab] = useState<'ACTIONS' | 'INVENTORY'>('ACTIONS')
    const [gmNarration, setGmNarration] = useState<string>('')

    // Inventory State
    const [inventory, setInventory] = useState<any[]>([])
    const [selectedItemDetail, setSelectedItemDetail] = useState<any>(null)

    // Overlays / Popups
    const [rollRequest, setRollRequest] = useState<any>(null)
    const [lastWhisper, setLastWhisper] = useState<{ sender: string, message: string } | null>(null)
    const [privateSceneId, setPrivateSceneId] = useState<string | null>(null)

    // Refs
    const logContainerRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    const {
        sendPlayerAction,
        onGameStateUpdate,
        onRollRequested,
        onChatMessage,
        onPlayerAction,
        onDiceResult,
        onPrivateSceneUpdate,
        onWhisperReceived
    } = useGameSocket(campaignId, {
        sessionToken: 'DEMO_PLAYER_TOKEN',
        userId: playerId,
        autoConnect: true
    })

    // ✅ Helper: Scroll Log to Bottom
    const scrollToBottom = (smooth = true) => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTo({
                top: logContainerRef.current.scrollHeight,
                behavior: smooth ? 'smooth' : 'auto'
            })
        }
    }

    // ✅ Effect: Handle Virtual Keyboard (Like LINE/Messenger)
    useEffect(() => {
        if (!window.visualViewport) return

        const handleResize = () => {
            setTimeout(() => scrollToBottom(false), 100)
            if (document.activeElement === inputRef.current) {
                setTimeout(() => {
                    inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }, 300)
            }
        }

        window.visualViewport.addEventListener('resize', handleResize)
        return () => window.visualViewport?.removeEventListener('resize', handleResize)
    }, [])

    // ✅ Effect: Initialize Character & Join
    const hasJoined = useRef(false)
    useEffect(() => {
        if (hasJoined.current) return

        const myChar = generateCharacter(playerId)
        setCharacter(myChar)
        hasJoined.current = true

        const timer = setTimeout(() => {
            sendPlayerAction({
                actionType: 'JOIN_GAME',
                actorId: playerId,
                actorName: myChar.name,
                characterData: { ...myChar, id: playerId },
                description: 'has joined the party.'
            } as any)
        }, 1500)

        return () => clearTimeout(timer)
    }, [sendPlayerAction, playerId])

    // ✅ Effect: Handle Socket Events
    useEffect(() => {
        if (onRollRequested) onRollRequested((req) => setRollRequest(req))
        if (onGameStateUpdate) onGameStateUpdate((s) => setGameState(s))
        if (onPrivateSceneUpdate) onPrivateSceneUpdate((data) => setPrivateSceneId(data.sceneId))

        const handleLog = (msg: any) => {
            setLogs((prev) => {
                // Check if log with same ID already exists
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
                handleLog({
                    id: Date.now().toString(),
                    content: `🤫 Whisper from ${data.sender}: "${data.message}"`,
                    type: 'WHISPER',
                    senderName: data.sender,
                    timestamp: new Date()
                })
            })
        }

        if (onPlayerAction) {
            onPlayerAction((action) => {
                // 🎁 INVENTORY LOGIC - Only process if this item is for ME
                if (action.actionType === 'GM_MANAGE_INVENTORY' && action.targetPlayerId === playerId) {
                    const { itemData, action: mode } = action.payload || {};

                    if (mode === 'GIVE_CUSTOM' || mode === 'ADD') {
                        // Check for duplicates before adding
                        setInventory(prev => {
                            const exists = prev.some(item => item.id === itemData.id)
                            if (exists) {
                                console.log('⚠️ Duplicate item prevented:', itemData.id)
                                return prev
                            }
                            return [...prev, itemData]
                        })

                        handleLog({
                            id: `item-received-${itemData.id}`,
                            content: `🎁 You received: ${itemData.name}`,
                            type: 'NARRATION',
                            senderName: 'System',
                            timestamp: new Date()
                        })
                        return; // Stop processing to avoid double logs
                    }

                    if (mode === 'REMOVE') {
                        // Remove item from inventory
                        setInventory(prev => prev.filter(item => item.id !== itemData.id))

                        handleLog({
                            id: Date.now().toString(),
                            content: `❌ GM removed: ${itemData.name}`,
                            type: 'SYSTEM',
                            senderName: 'System',
                            timestamp: new Date()
                        })
                        return;
                    }
                    return; // Don't show regular action log for inventory events
                }

                // Normal Action Log
                // Skip special actions that have their own logging logic
                const skipGenericLog = ['GM_MANAGE_INVENTORY', 'dice_roll', 'use_item', 'JOIN_GAME', 'join', 'PLAYER_INVENTORY_UPDATE']
                if (skipGenericLog.includes(action.actionType)) {

                    // Handle JOIN log specifically to prevent duplicates
                    if (action.actionType === 'JOIN_GAME' || action.actionType === 'join') {
                        const joinId = `join-${action.actorId || action.actorName}`
                        console.log('🔗 Processing Join Log:', {
                            actionType: action.actionType,
                            actorId: action.actorId,
                            actorName: action.actorName,
                            generatedId: joinId
                        })

                        handleLog({
                            id: joinId,
                            content: `${action.actorName} joined the party!`,
                            type: 'SYSTEM',
                            senderName: 'System',
                            timestamp: new Date()
                        })
                    }

                    return
                }

                handleLog({
                    id: `${Date.now()}-${action.actionType}`,
                    content: `${action.actorName} used ${action.actionType}: ${action.description}`,
                    type: 'ACTION',
                    senderName: action.actorName,
                    timestamp: new Date()
                })

                if (action.actorName === 'Game Master' && action.actionType === 'custom') {
                    setGmNarration(action.description)
                }
            })
        }

        if (onDiceResult) {
            onDiceResult((result) => {
                handleLog({
                    id: Date.now().toString(),
                    content: `🎲 ${result.actorName || 'Player'} rolled ${result.roll} + ${result.mod} = ${result.total} ${result.total >= result.dc ? '✅ Success!' : '❌ Failed'}`,
                    type: 'DICE',
                    senderName: 'System',
                    timestamp: new Date()
                })
            })
        }

    }, [onRollRequested, onGameStateUpdate, onChatMessage, onPrivateSceneUpdate, onWhisperReceived, onPlayerAction, onDiceResult, playerId])

    // Handlers
    const handleAction = async (actionType: string) => {
        await sendPlayerAction({
            actionType,
            actorId: character?.id,
            actorName: character?.name,
            description: `performed ${actionType}`
        } as any)
    }

    const handleRollResponse = async () => {
        if (!rollRequest) return
        const roll = Math.floor(Math.random() * 20) + 1
        const statKey = rollRequest.checkType.split(' ')[0]
        const statVal = character?.stats?.[statKey] || 10
        const mod = Math.floor((statVal - 10) / 2)

        await sendPlayerAction({
            actionType: 'dice_roll',
            checkType: rollRequest.checkType,
            dc: rollRequest.dc,
            roll: roll,
            mod: mod,
            total: roll + mod,
            actorName: character?.name
        } as any)
        setRollRequest(null)
    }

    const sendCustomAction = async () => {
        if (!customAction.trim()) return
        await sendPlayerAction({
            actionType: 'custom',
            actorId: character?.id,
            actorName: character?.name,
            description: customAction
        } as any)
        setCustomAction('')
        setTimeout(() => {
            scrollToBottom()
            inputRef.current?.focus()
        }, 100)
    }

    // Scene Logic
    const activeSceneId = privateSceneId || gameState?.currentScene
    const activeSceneData = SCENES.find(s => s.id === activeSceneId) || null
    const activeImageUrl = activeSceneData?.url || gameState?.sceneImageUrl || "https://img.freepik.com/premium-photo/majestic-misty-redwood-forest-with-lush-green-ferns-sunlight-filtering-through-fog_996993-7424.jpg"
    const activeDescription = gmNarration || activeSceneData?.name || gameState?.currentScene || "Connecting..."

    return (
        <div className="h-[100dvh] bg-slate-950 text-white flex flex-col font-sans overflow-hidden">

            {/* 1. HEADER: Status Bar */}
            <div className="bg-slate-900 border-b border-amber-500/30 flex flex-col gap-2 p-2 shrink-0 z-30 shadow-lg relative">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-amber-500 bg-slate-800 overflow-hidden shadow-inner shrink-0">
                            {character ? <img src={character.avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : <div className="w-full h-full animate-pulse bg-slate-700" />}
                        </div>
                        <div className="min-w-0">
                            <div className="font-bold text-amber-500 text-sm truncate max-w-[120px]">{character?.name || 'Loading...'}</div>
                            <div className="text-[10px] text-slate-400 uppercase tracking-wide bg-slate-800 px-1.5 py-0.5 rounded inline-block">{character?.role || '...'}</div>
                        </div>
                    </div>
                    <div className="w-24 md:w-32 flex flex-col gap-1 shrink-0">
                        <div className="flex justify-between text-[10px] font-bold text-green-400"><span>HP</span><span>{character?.hp || 0}/{character?.maxHp || 0}</span></div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden"><div className="bg-green-500 h-full transition-all duration-300" style={{ width: character ? `${(character.hp / character.maxHp) * 100}%` : '0%' }} /></div>
                        <div className="flex justify-between text-[10px] font-bold text-blue-400 mt-0.5"><span>MP</span><span>{character?.mp || 0}/{character?.maxMp || 0}</span></div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden"><div className="bg-blue-500 h-full transition-all duration-300" style={{ width: character ? `${(character.mp / character.maxMp) * 100}%` : '0%' }} /></div>
                    </div>
                </div>
            </div>

            {/* 2. SCENE AREA */}
            <div className="h-[25vh] md:h-[35vh] relative bg-black shrink-0 shadow-md z-10 transition-all duration-300">
                <SceneDisplay
                    sceneDescription={activeDescription}
                    imageUrl={activeImageUrl}
                    npcs={gameState?.activeNpcs || []}
                />
                {privateSceneId && (
                    <div className="absolute top-2 right-2 bg-indigo-900/80 text-indigo-100 text-[10px] font-bold px-2 py-1 rounded-full border border-indigo-500/50 flex items-center gap-1 shadow-lg backdrop-blur-sm animate-pulse-slow">
                        <span>🔒</span> Private Vision
                    </div>
                )}
            </div>

            {/* 3. LOG (Middle Flexible) */}
            <div className="flex-1 bg-slate-950 flex flex-col min-h-0 relative">
                <div className="px-3 py-1 bg-slate-900/80 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase flex justify-between shrink-0 backdrop-blur-sm absolute top-0 left-0 right-0 z-10">
                    <span>📜 Adventure Log</span><span className="text-amber-500">{logs.length}</span>
                </div>
                <div ref={logContainerRef} className="flex-1 p-3 pt-8 overflow-y-auto custom-scrollbar scroll-smooth">
                    <GameLog logs={logs} />
                </div>
            </div>

            {/* 4. TABS & CONTROLS (Bottom) */}
            <div className="bg-slate-900 border-t border-slate-800 shrink-0 z-20 shadow-[0_-4px_15px_rgba(0,0,0,0.5)] pb-safe flex flex-col">

                {/* Tabs */}
                <div className="flex border-b border-slate-800">
                    <button
                        onClick={() => setActiveTab('ACTIONS')}
                        className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider ${activeTab === 'ACTIONS' ? 'bg-slate-800 text-amber-500 border-b-2 border-amber-500' : 'text-slate-500 hover:text-slate-400'}`}
                    >
                        Actions
                    </button>
                    <button
                        onClick={() => setActiveTab('INVENTORY')}
                        className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider ${activeTab === 'INVENTORY' ? 'bg-slate-800 text-amber-500 border-b-2 border-amber-500' : 'text-slate-500 hover:text-slate-400'}`}
                    >
                        Inventory ({inventory.length})
                    </button>
                </div>

                {/* Content Area */}
                <div className="p-3 md:p-4 min-h-[160px]">

                    {activeTab === 'ACTIONS' ? (
                        <>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <ActionButton icon="⚔️" label="Attack" color="red" onClick={() => handleAction('attack')} />
                                <ActionButton icon="🦶" label="Move" color="yellow" onClick={() => handleAction('move')} />
                                <ActionButton icon="🔍" label="Inspect" color="gray" onClick={() => handleAction('inspect')} />
                                <ActionButton icon="💬" label="Talk" color="purple" onClick={() => handleAction('talk')} />
                            </div>

                            <div className="bg-slate-800/50 p-2 rounded-xl border border-slate-700 shadow-inner">
                                <div className="flex gap-2">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={customAction}
                                        onChange={(e) => setCustomAction(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') sendCustomAction() }}
                                        onFocus={() => {
                                            setTimeout(() => {
                                                scrollToBottom()
                                                inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                                            }, 300)
                                        }}
                                        placeholder="Type custom action..."
                                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 outline-none placeholder-slate-600 transition-colors"
                                    />
                                    <button onClick={sendCustomAction} className="bg-amber-600 px-4 rounded-lg font-bold text-sm hover:bg-amber-500 text-black transition-colors whitespace-nowrap">GO</button>
                                </div>
                            </div>
                        </>
                    ) : (
                        /* INVENTORY GRID */
                        <div className="grid grid-cols-4 gap-2 max-h-[150px] overflow-y-auto pr-1 custom-scrollbar">
                            {inventory.map((item, idx) => (
                                <button
                                    key={`${item.id || idx}-${idx}`}
                                    onClick={() => setSelectedItemDetail(item)}
                                    className="aspect-square bg-slate-800/80 rounded-lg border border-slate-700 flex flex-col items-center justify-center hover:bg-slate-700 hover:border-amber-500/50 active:scale-95 transition-all"
                                >
                                    <span className="text-2xl filter drop-shadow-md">{item.icon || '📦'}</span>
                                </button>
                            ))}
                            {inventory.length === 0 && (
                                <div className="col-span-4 flex flex-col items-center justify-center text-slate-600 py-4 gap-2">
                                    <span className="text-3xl opacity-50">📦</span>
                                    <span className="text-xs italic">No items yet</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* --- MODALS --- */}

            {/* 1. Item Detail Modal */}
            {selectedItemDetail && (
                <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-6 backdrop-blur-sm animate-in fade-in" onClick={() => setSelectedItemDetail(null)}>
                    <div className="bg-slate-900 p-6 rounded-xl border border-slate-600 max-w-xs w-full text-center relative shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="text-6xl mb-4 filter drop-shadow-lg">{selectedItemDetail.icon || '📦'}</div>
                        <h3 className="text-xl font-bold text-amber-500 mb-2">{selectedItemDetail.name}</h3>
                        <div className="text-[10px] uppercase tracking-wider bg-slate-800 text-slate-400 px-2 py-1 rounded inline-block mb-4 border border-slate-700">
                            {selectedItemDetail.type || 'ITEM'}
                        </div>
                        <p className="text-sm text-slate-300 mb-6 font-light leading-relaxed">"{selectedItemDetail.description}"</p>
                        <button
                            onClick={() => {
                                // Send item usage action
                                sendPlayerAction({
                                    actorName: character?.name || 'Player',
                                    actionType: 'use_item',
                                    description: `used ${selectedItemDetail.name}`,
                                    payload: { itemId: selectedItemDetail.id, itemName: selectedItemDetail.name }
                                } as any)

                                // Show local feedback
                                setLogs((prev) => [...prev, {
                                    id: Date.now().toString(),
                                    content: `You used ${selectedItemDetail.name}`,
                                    type: 'ACTION',
                                    senderName: character?.name || 'You',
                                    timestamp: new Date()
                                }])

                                setSelectedItemDetail(null)
                            }}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg font-bold transition-colors shadow-lg"
                        >
                            USE ITEM
                        </button>
                    </div>
                </div>
            )}

            {/* 2. Whisper Toast */}
            {lastWhisper && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-50 animate-in slide-in-from-top-5 fade-in duration-300 pointer-events-none">
                    <div className="bg-indigo-950/90 border-l-4 border-indigo-500 text-indigo-100 p-4 rounded shadow-2xl backdrop-blur-md flex items-start gap-3 pointer-events-auto">
                        <div className="text-2xl">🤫</div>
                        <div className="flex-1">
                            <div className="font-bold text-xs uppercase text-indigo-400 mb-1">Whisper from {lastWhisper.sender}</div>
                            <p className="text-sm font-medium italic">"{lastWhisper.message}"</p>
                        </div>
                        <button onClick={() => setLastWhisper(null)} className="text-indigo-400 hover:text-white">✕</button>
                    </div>
                </div>
            )}

            {/* 3. Dice Roll Request */}
            {rollRequest && (
                <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6 animate-in fade-in zoom-in duration-200 backdrop-blur-sm">
                    <div className="bg-slate-900 p-6 rounded-2xl border-2 border-amber-500 shadow-[0_0_50px_rgba(245,158,11,0.3)] w-full max-w-xs text-center transform scale-110">
                        <div className="text-5xl mb-4 animate-bounce">🎲</div>
                        <h2 className="text-xl font-bold text-white mb-1">GM Orders Roll!</h2>
                        <div className="text-amber-500 text-2xl font-black mb-6 uppercase tracking-wider">{rollRequest.checkType}</div>
                        <p className="text-slate-400 text-xs mb-6 italic">"Destiny is in your hands..."</p>
                        <button onClick={handleRollResponse} className="w-full py-3 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-bold text-lg rounded-xl shadow-lg transform active:scale-95 transition-all">ROLL D20</button>
                    </div>
                </div>
            )}
        </div>
    )
}

const ActionButton = ({ icon, label, color, onClick }: any) => {
    const colorStyles: any = {
        red: "bg-red-950/30 border-red-500/30 active:bg-red-500/20 text-red-400",
        yellow: "bg-amber-950/30 border-amber-500/30 active:bg-amber-500/20 text-amber-400",
        purple: "bg-fuchsia-950/30 border-fuchsia-500/30 active:bg-fuchsia-500/20 text-fuchsia-400",
        gray: "bg-slate-800/30 border-slate-500/30 active:bg-slate-500/20 text-slate-400",
    }

    return (
        <button
            onClick={onClick}
            className={`${colorStyles[color]} border p-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 active:border-white/50 min-h-[50px] md:min-h-[60px]`}
        >
            <span className="text-xl filter drop-shadow-lg">{icon}</span>
            <span className="font-bold text-xs uppercase tracking-wide">{label}</span>
        </button>
    )
}