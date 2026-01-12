'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { useGameSocket } from '@/hooks/useGameSocket'
import { generateCharacter } from '@/lib/character-utils'

import { SceneDisplay } from '@/components/board/SceneDisplay'
import { GameLog } from '@/components/board/GameLog'

export default function PlayerControllerPage() {
    const params = useParams()
    const campaignId = params.campaignId as string

    // State
    const [character, setCharacter] = useState<any>(null)
    const [customAction, setCustomAction] = useState('')
    const [logs, setLogs] = useState<any[]>([])
    const [gameState, setGameState] = useState<any>(null)
    const [rollRequest, setRollRequest] = useState<any>(null)

    // Ref สำหรับเลื่อน Log ลงล่างสุดเสมอ
    const logContainerRef = useRef<HTMLDivElement>(null)

    const {
        sendPlayerAction,
        onGameStateUpdate,
        onRollRequested,
        onChatMessage
    } = useGameSocket(campaignId)

    // 1. INITIALIZATION: สร้างตัวละครและเข้าเกม
    useEffect(() => {
        const myPlayerId = `player-${Math.floor(Math.random() * 10000)}`
        const myChar = generateCharacter(myPlayerId)
        setCharacter(myChar)

        const timer = setTimeout(() => {
            console.log("🚀 Joining game...", myChar.name)
            sendPlayerAction({
                actionType: 'JOIN_GAME',
                actorId: myChar.id,
                actorName: myChar.name,
                characterData: myChar,
                description: 'has joined the party.'
            })
        }, 1500)

        return () => clearTimeout(timer)
    }, [sendPlayerAction])

    // 2. LISTENERS: รับข้อมูลจาก Server (GM)
    useEffect(() => {
        onRollRequested((req) => setRollRequest(req))

        // ✅ รับ State ล่าสุด (รวมถึง Scene และ NPC)
        onGameStateUpdate((s) => setGameState(s))

        onChatMessage((msg) => {
            setLogs((prev) => prev.some(l => l.id === msg.id) ? prev : [...prev, msg])
            // Auto scroll to bottom
            setTimeout(() => {
                if (logContainerRef.current) {
                    logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
                }
            }, 100)
        })
    }, [onRollRequested, onGameStateUpdate, onChatMessage])

    // Action Handlers
    const handleAction = async (actionType: string) => {
        await sendPlayerAction({
            actionType,
            actorId: character?.id,
            actorName: character?.name,
            description: `performed ${actionType}`
        })
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
        })
        setRollRequest(null)
    }

    const sendCustomAction = async () => {
        if (!customAction.trim()) return
        await sendPlayerAction({
            actionType: 'custom',
            actorId: character?.id,
            actorName: character?.name,
            description: customAction
        })
        setCustomAction('')
    }

    return (
        // Mobile Optimized Layout (100dvh)
        <div className="h-[100dvh] bg-slate-950 text-white flex flex-col font-sans overflow-hidden">

            {/* 🟢 HEADER: Status Bar */}
            <div className="bg-slate-900 border-b border-amber-500/30 flex flex-col gap-2 p-2 shrink-0 z-30 shadow-lg relative">
                <div className="flex items-center justify-between">
                    {/* Character Info */}
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-amber-500 bg-slate-800 overflow-hidden shadow-inner shrink-0">
                            {character ? (
                                <img src={character.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full animate-pulse bg-slate-700" />
                            )}
                        </div>
                        <div className="min-w-0">
                            <div className="font-bold text-amber-500 text-sm truncate max-w-[120px]">{character?.name || 'Loading...'}</div>
                            <div className="text-[10px] text-slate-400 uppercase tracking-wide bg-slate-800 px-1.5 py-0.5 rounded inline-block">
                                {character?.role || '...'}
                            </div>
                        </div>
                    </div>

                    {/* Bars */}
                    <div className="w-24 md:w-32 flex flex-col gap-1 shrink-0">
                        <div className="flex justify-between text-[10px] font-bold text-green-400">
                            <span>HP</span>
                            <span>{character?.hp || 0}/{character?.maxHp || 0}</span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-green-500 h-full transition-all duration-300" style={{ width: character ? `${(character.hp / character.maxHp) * 100}%` : '0%' }} />
                        </div>

                        <div className="flex justify-between text-[10px] font-bold text-blue-400 mt-0.5">
                            <span>MP</span>
                            <span>{character?.mp || 0}/{character?.maxMp || 0}</span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: character ? `${(character.mp / character.maxMp) * 100}%` : '0%' }} />
                        </div>
                    </div>
                </div>

                {/* Stats Scroll */}
                {character?.stats && (
                    <div className="flex overflow-x-auto gap-2 pb-1 no-scrollbar border-t border-slate-800 pt-2 mask-linear-fade">
                        {Object.entries(character.stats).map(([key, val]) => (
                            <div key={key} className="bg-slate-800/50 rounded flex flex-col items-center px-3 py-1 border border-slate-700/50 shrink-0 min-w-[3rem]">
                                <span className="text-[8px] text-slate-500 font-bold uppercase">{key}</span>
                                <span className="text-[10px] text-amber-100 font-mono font-bold">{val as number}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 🖼️ SCENE AREA (Synced with GM) */}
            <div className="h-[30vh] md:h-[35vh] relative bg-black shrink-0">
                <SceneDisplay
                    sceneDescription={gameState?.currentScene || "Connecting..."}
                    // ✅ รับ URL รูปภาพจาก State (ถ้าไม่มีใช้ Default)
                    imageUrl={gameState?.sceneImageUrl || "https://img.freepik.com/premium-photo/majestic-misty-redwood-forest-with-lush-green-ferns-sunlight-filtering-through-fog_996993-7424.jpg"}
                    // ✅ รับ NPC List จาก State
                    npcs={gameState?.activeNpcs || []}
                />
            </div>

            {/* 🟡 ACTIONS & CONTROLS */}
            <div className="flex-1 bg-slate-900 p-3 md:p-4 overflow-y-auto custom-scrollbar flex flex-col">
                <h2 className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-3 text-center border-b border-slate-800 pb-2">Actions</h2>

                <div className="grid grid-cols-3 gap-2 md:gap-3 mb-4">
                    <ActionButton icon="⚔️" label="Attack" color="red" onClick={() => handleAction('attack')} />
                    <ActionButton icon="✨" label="Magic" color="blue" onClick={() => handleAction('magic')} />
                    <ActionButton icon="🦶" label="Move" color="yellow" onClick={() => handleAction('move')} />
                    <ActionButton icon="🧪" label="Heal" color="green" onClick={() => handleAction('heal')} />
                    <ActionButton icon="💬" label="Talk" color="purple" onClick={() => handleAction('talk')} />
                    <ActionButton icon="🔍" label="Inspect" color="gray" onClick={() => handleAction('inspect')} />
                </div>

                {/* Custom Action Input */}
                <div className="mt-auto bg-slate-800/50 p-2 md:p-3 rounded-xl border border-slate-700 shadow-inner">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={customAction}
                            onChange={(e) => setCustomAction(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') sendCustomAction()
                            }}
                            placeholder="Type custom action..."
                            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-3 md:py-2 text-sm text-white focus:border-amber-500 outline-none placeholder-slate-600 transition-colors"
                        />
                        <button
                            onClick={sendCustomAction}
                            className="bg-amber-600 px-4 md:px-5 rounded-lg font-bold text-sm hover:bg-amber-500 text-black transition-colors whitespace-nowrap"
                        >
                            GO
                        </button>
                    </div>
                </div>
            </div>

            {/* 🔴 LOG */}
            <div className="h-[20vh] md:h-[25vh] bg-slate-950 border-t border-slate-800 flex flex-col shrink-0">
                <div className="px-3 py-1 bg-slate-900 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase flex justify-between">
                    <span>📜 Log</span>
                    <span className="text-amber-500">{logs.length}</span>
                </div>
                <div ref={logContainerRef} className="flex-1 p-3 overflow-y-auto custom-scrollbar scroll-smooth">
                    <GameLog logs={logs} />
                </div>
            </div>

            {/* 🔥 Dice Popup Modal */}
            {rollRequest && (
                <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6 animate-in fade-in zoom-in duration-200 backdrop-blur-sm">
                    <div className="bg-slate-900 p-6 rounded-2xl border-2 border-amber-500 shadow-[0_0_50px_rgba(245,158,11,0.3)] w-full max-w-xs text-center transform scale-110">
                        <div className="text-5xl mb-4 animate-bounce">🎲</div>
                        <h2 className="text-xl font-bold text-white mb-1">GM Orders Roll!</h2>

                        <div className="text-amber-500 text-2xl font-black mb-6 uppercase tracking-wider">{rollRequest.checkType}</div>

                        <p className="text-slate-400 text-xs mb-6 italic">
                            "Destiny is in your hands..."
                        </p>

                        <button
                            onClick={handleRollResponse}
                            className="w-full py-3 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-bold text-lg rounded-xl shadow-lg transform active:scale-95 transition-all"
                        >
                            ROLL D20
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

const ActionButton = ({ icon, label, color, onClick }: any) => {
    const colorStyles: any = {
        red: "bg-red-950/30 border-red-500/30 active:bg-red-500/20 text-red-400",
        blue: "bg-blue-950/30 border-blue-500/30 active:bg-blue-500/20 text-blue-400",
        yellow: "bg-amber-950/30 border-amber-500/30 active:bg-amber-500/20 text-amber-400",
        green: "bg-emerald-950/30 border-emerald-500/30 active:bg-emerald-500/20 text-emerald-400",
        purple: "bg-fuchsia-950/30 border-fuchsia-500/30 active:bg-fuchsia-500/20 text-fuchsia-400",
        gray: "bg-slate-800/30 border-slate-500/30 active:bg-slate-500/20 text-slate-400",
    }

    return (
        <button
            onClick={onClick}
            className={`${colorStyles[color]} border p-2 md:p-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 active:border-white/50 min-h-[80px]`}
        >
            <span className="text-2xl md:text-3xl filter drop-shadow-lg">{icon}</span>
            <span className="font-bold text-[10px] uppercase tracking-wide">{label}</span>
        </button>
    )
}