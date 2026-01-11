'use client'

import { useState, useEffect } from 'react'
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

    const {
        sendPlayerAction,
        onGameStateUpdate,
        onRollRequested,
        onChatMessage
    } = useGameSocket(campaignId)

    // 1. INITIALIZATION: สร้างตัวละครและส่งข้อมูลเข้าเกม
    useEffect(() => {
        // จำลอง ID ผู้เล่น
        const myPlayerId = `player-${Math.floor(Math.random() * 10000)}`

        // สุ่มสร้างข้อมูลตัวละคร
        const myChar = generateCharacter(myPlayerId)
        setCharacter(myChar)

        // แจ้งเตือน GM ว่า "ฉันมาแล้ว!"
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

    // Listener
    useEffect(() => {
        onRollRequested((req) => setRollRequest(req))
        onGameStateUpdate((s) => setGameState(s))
        onChatMessage((msg) => setLogs((prev) => prev.some(l => l.id === msg.id) ? prev : [...prev, msg]))
    }, [onRollRequested, onGameStateUpdate, onChatMessage])

    // ฟังก์ชัน Action ปกติ
    const handleAction = async (actionType: string) => {
        await sendPlayerAction({
            actionType,
            actorId: character?.id,
            actorName: character?.name,
            description: `performed ${actionType}`
        })
    }

    // ฟังก์ชันตอบกลับการทอยเต๋า
    const handleRollResponse = async () => {
        if (!rollRequest) return
        const roll = Math.floor(Math.random() * 20) + 1

        // ดึงค่า Stat มาบวก (เช่น "STR Check" -> เอาค่า STR มาคิด Mod)
        const statKey = rollRequest.checkType.split(' ')[0]
        const statVal = character?.stats?.[statKey] || 10
        const mod = Math.floor((statVal - 10) / 2) // สูตร D&D: (Stat - 10) / 2

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

    // ฟังก์ชัน Custom Action
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
        <div className="h-screen bg-slate-950 text-white flex flex-col font-sans overflow-hidden">

            {/* 🟢 ส่วนที่ 1: Header Status Bar */}
            <div className="bg-slate-900 border-b border-amber-500/30 flex flex-col gap-2 p-3 shrink-0 z-30 shadow-lg relative">
                <div className="flex items-center justify-between">
                    {/* Left: Avatar & Name */}
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full border-2 border-amber-500 bg-slate-800 overflow-hidden shadow-inner">
                            {character ? (
                                <img src={character.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full animate-pulse bg-slate-700" />
                            )}
                        </div>
                        <div>
                            <div className="font-bold text-amber-500 text-sm">{character?.name || 'Summoning...'}</div>
                            <div className="text-[10px] text-slate-400 uppercase tracking-wide bg-slate-800 px-1.5 py-0.5 rounded inline-block">
                                {character?.role || 'Class'}
                            </div>
                        </div>
                    </div>

                    {/* Right: HP/MP Bars */}
                    <div className="w-24 flex flex-col gap-1">
                        <div className="flex justify-between text-[10px] font-bold text-green-400">
                            <span>HP</span>
                            <span>{character?.hp || 0}/{character?.maxHp || 0}</span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-green-500 h-full" style={{ width: character ? `${(character.hp / character.maxHp) * 100}%` : '0%' }} />
                        </div>

                        <div className="flex justify-between text-[10px] font-bold text-blue-400 mt-0.5">
                            <span>MP</span>
                            <span>{character?.mp || 0}/{character?.maxMp || 0}</span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-blue-500 h-full" style={{ width: character ? `${(character.mp / character.maxMp) * 100}%` : '0%' }} />
                        </div>
                    </div>
                </div>

                {/* ✅ Stats Grid (STR, DEX, INT...) */}
                {character?.stats && (
                    <div className="grid grid-cols-6 gap-1 mt-1 border-t border-slate-800 pt-2">
                        {Object.entries(character.stats).map(([key, val]) => (
                            <div key={key} className="bg-slate-800/50 rounded flex flex-col items-center p-1 border border-slate-700/50">
                                <span className="text-[8px] text-slate-500 font-bold uppercase">{key}</span>
                                <span className="text-[10px] text-amber-100 font-mono font-bold">{val as number}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 🖼️ Scene Area */}
            <div className="h-[25%] relative bg-black shrink-0">
                <SceneDisplay
                    sceneDescription={gameState?.currentScene || "Connecting..."}
                    // ✅ รูปป่าหมอกที่คุณเลือก
                    imageUrl="https://img.freepik.com/premium-photo/majestic-misty-redwood-forest-with-lush-green-ferns-sunlight-filtering-through-fog_996993-7424.jpg"
                />
            </div>

            {/* 🟡 ส่วนที่ 2: Action Buttons */}
            <div className="flex-1 bg-slate-900 p-4 overflow-y-auto custom-scrollbar">
                <h2 className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-3 text-center border-b border-slate-800 pb-2">Actions</h2>

                <div className="grid grid-cols-3 gap-3 mb-4">
                    <ActionButton icon="⚔️" label="Attack" color="red" onClick={() => handleAction('attack')} />
                    <ActionButton icon="✨" label="Magic" color="blue" onClick={() => handleAction('magic')} />
                    <ActionButton icon="🦶" label="Move" color="yellow" onClick={() => handleAction('move')} />
                    <ActionButton icon="🧪" label="Heal" color="green" onClick={() => handleAction('heal')} />
                    <ActionButton icon="💬" label="Talk" color="purple" onClick={() => handleAction('talk')} />
                    <ActionButton icon="🔍" label="Inspect" color="gray" onClick={() => handleAction('inspect')} />
                </div>

                {/* Custom Action Input */}
                <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 shadow-inner">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={customAction}
                            onChange={(e) => setCustomAction(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') sendCustomAction()
                            }}
                            placeholder="Type custom action..."
                            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 outline-none placeholder-slate-600 transition-colors"
                        />
                        <button
                            onClick={sendCustomAction}
                            className="bg-amber-600 px-4 rounded-lg font-bold text-sm hover:bg-amber-500 text-black transition-colors"
                        >
                            GO
                        </button>
                    </div>
                </div>
            </div>

            {/* 🔴 ส่วนที่ 3: Game Log */}
            <div className="h-[25%] bg-slate-950 border-t border-slate-800 flex flex-col shrink-0">
                <div className="px-3 py-1 bg-slate-900 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase flex justify-between">
                    <span>📜 Adventure Log</span>
                    <span className="text-amber-500">{logs.length} events</span>
                </div>
                <div className="flex-1 p-3 overflow-hidden">
                    <GameLog logs={logs} />
                </div>
            </div>

            {/* 🔥 Dice Popup Modal */}
            {rollRequest && (
                <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6 animate-in fade-in zoom-in duration-200 backdrop-blur-sm">
                    <div className="bg-slate-900 p-6 rounded-2xl border-2 border-amber-500 shadow-[0_0_50px_rgba(245,158,11,0.3)] w-full max-w-xs text-center">
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

// Helper Component: Action Button
const ActionButton = ({ icon, label, color, onClick }: any) => {
    const colorStyles: any = {
        red: "bg-red-950/30 border-red-500/30 hover:bg-red-500/20 text-red-400",
        blue: "bg-blue-950/30 border-blue-500/30 hover:bg-blue-500/20 text-blue-400",
        yellow: "bg-amber-950/30 border-amber-500/30 hover:bg-amber-500/20 text-amber-400",
        green: "bg-emerald-950/30 border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400",
        purple: "bg-fuchsia-950/30 border-fuchsia-500/30 hover:bg-fuchsia-500/20 text-fuchsia-400",
        gray: "bg-slate-800/30 border-slate-500/30 hover:bg-slate-500/20 text-slate-400",
    }

    return (
        <button
            onClick={onClick}
            className={`${colorStyles[color]} border p-3 rounded-xl flex flex-col items-center gap-1 transition-all active:scale-95 active:border-white/50`}
        >
            <span className="text-2xl filter drop-shadow-lg">{icon}</span>
            <span className="font-bold text-[10px] uppercase tracking-wide">{label}</span>
        </button>
    )
}