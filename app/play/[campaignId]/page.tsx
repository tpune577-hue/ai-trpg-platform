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

    // State
    const [character, setCharacter] = useState<any>(null)
    const [customAction, setCustomAction] = useState('')
    const [logs, setLogs] = useState<any[]>([])
    const [gameState, setGameState] = useState<any>(null)
    const [rollRequest, setRollRequest] = useState<any>(null)

    // New State for Private View & Whisper
    const [privateSceneId, setPrivateSceneId] = useState<string | null>(null)
    const [lastWhisper, setLastWhisper] = useState<{ sender: string, message: string } | null>(null)
    const [gmNarration, setGmNarration] = useState<string>('')

    const logContainerRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null) // Reference for Input

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

    // ✅ Helper Function: Scroll Log to Bottom safely
    const scrollToBottom = (smooth = true) => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTo({
                top: logContainerRef.current.scrollHeight,
                behavior: smooth ? 'smooth' : 'auto'
            })
        }
    }

    // ✅ Effect: Handle Virtual Keyboard (Like LINE)
    useEffect(() => {
        if (!window.visualViewport) return

        const handleResize = () => {
            // เมื่อ Keyboard เด้ง Viewport จะเปลี่ยนขนาด -> สั่ง Scroll ลงล่างสุดทันที
            // เพื่อให้ข้อความล่าสุด และ Input ไม่โดนบัง
            setTimeout(() => scrollToBottom(false), 100)

            // ถ้า Input กำลัง Focus อยู่ ให้ Scroll Window เพื่อดัน Input ขึ้นมา
            if (document.activeElement === inputRef.current) {
                setTimeout(() => {
                    inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }, 300)
            }
        }

        window.visualViewport.addEventListener('resize', handleResize)
        return () => window.visualViewport?.removeEventListener('resize', handleResize)
    }, [])

    useEffect(() => {
        const myChar = generateCharacter(playerId)
        setCharacter(myChar)

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

    useEffect(() => {
        if (onRollRequested) onRollRequested((req) => setRollRequest(req))
        if (onGameStateUpdate) onGameStateUpdate((s) => setGameState(s))

        const handleLog = (msg: any) => {
            setLogs((prev) => prev.some(l => l.id === msg.id) ? prev : [...prev, msg])
            // Auto scroll when new message arrives
            setTimeout(() => scrollToBottom(), 100)
        }

        if (onChatMessage) onChatMessage(handleLog)

        if (onPrivateSceneUpdate) {
            onPrivateSceneUpdate((data) => setPrivateSceneId(data.sceneId))
        }

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
                handleLog({
                    id: Date.now().toString(),
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

    }, [onRollRequested, onGameStateUpdate, onChatMessage, onPrivateSceneUpdate, onWhisperReceived, onPlayerAction, onDiceResult])

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
        // Keep focus but ensure visibility
        setTimeout(() => scrollToBottom(), 100)
    }

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

            {/* 2. SCENE AREA (Fixed Height - Shrink on small screens) */}
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
                {/* ref={logContainerRef} here handles the scrolling */}
                <div ref={logContainerRef} className="flex-1 p-3 pt-8 overflow-y-auto custom-scrollbar scroll-smooth">
                    <GameLog logs={logs} />
                </div>
            </div>

            {/* 4. ACTIONS & CONTROLS (Bottom) */}
            <div className="bg-slate-900 border-t border-slate-800 p-3 md:p-4 shrink-0 z-20 shadow-[0_-4px_15px_rgba(0,0,0,0.5)] pb-safe">
                <div className="grid grid-cols-2 gap-3 mb-3">
                    <ActionButton icon="⚔️" label="Attack" color="red" onClick={() => handleAction('attack')} />
                    <ActionButton icon="🦶" label="Move" color="yellow" onClick={() => handleAction('move')} />
                    <ActionButton icon="🔍" label="Inspect" color="gray" onClick={() => handleAction('inspect')} />
                    <ActionButton icon="💬" label="Talk" color="purple" onClick={() => handleAction('talk')} />
                </div>

                {/* Custom Input */}
                <div className="bg-slate-800/50 p-2 rounded-xl border border-slate-700 shadow-inner">
                    <div className="flex gap-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={customAction}
                            onChange={(e) => setCustomAction(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') sendCustomAction() }}
                            // ✅ Auto-scroll when focused
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
            </div>

            {/* Overlays */}
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