'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { useGameSocket } from '@/hooks/useGameSocket'

// Components
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
        isConnected,
        sendPlayerAction,
        onGameStateUpdate,
        onRollRequested,
        onChatMessage
    } = useGameSocket(campaignId)

    useEffect(() => {
        const handleCharData = (e: any) => { setCharacter(e.detail) }
        window.addEventListener('player:character_data', handleCharData)

        onRollRequested((request) => setRollRequest(request))
        onGameStateUpdate((state) => setGameState(state))
        onChatMessage((message) => setLogs((prev) => [...prev, message]))

        return () => window.removeEventListener('player:character_data', handleCharData)
    }, [onRollRequested, onGameStateUpdate, onChatMessage])

    // ฟังก์ชันสำหรับปุ่ม Action ปกติ (Attack, Move, etc.)
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
        const mod = 3

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

    // ฟังก์ชันส่ง Custom Action (แยกออกมาเพื่อให้เรียกใช้ง่าย)
    const sendCustomAction = async () => {
        if (!customAction.trim()) return

        await sendPlayerAction({
            actionType: 'custom', // ✅ ต้องส่ง type เป็น 'custom' เสมอ
            actorId: character?.id,
            actorName: character?.name,
            description: customAction // ✅ เอาข้อความที่พิมพ์ใส่ตรงนี้
        })
        setCustomAction('') // ล้างช่องพิมพ์
    }

    return (
        <div className="h-screen bg-slate-950 text-white flex flex-col overflow-hidden font-sans">

            {/* 🟢 ส่วนที่ 1: Header + Scene */}
            <div className="h-[35%] flex flex-col relative shrink-0">
                <div className="absolute top-0 w-full p-3 bg-gradient-to-b from-black/80 to-transparent z-20 flex justify-between items-center backdrop-blur-[2px]">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center border-2 border-indigo-400 shadow-lg">
                            {character?.name?.[0] || '?'}
                        </div>
                        <div>
                            <div className="font-bold text-sm shadow-black drop-shadow-md">{character?.name || 'Loading...'}</div>
                            <div className="text-[10px] text-indigo-300 bg-black/50 px-1.5 rounded inline-block">LV.1</div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-green-400 font-bold text-lg drop-shadow-md">{character?.hp || 20} <span className="text-xs text-gray-400">/20 HP</span></div>
                    </div>
                </div>

                <div className="flex-1 relative border-b-2 border-amber-500/50">
                    <SceneDisplay
                        sceneDescription={gameState?.currentScene || "Waiting for GM..."}
                        imageUrl="/images/placeholder-dungeon.jpg"
                    />
                </div>
            </div>

            {/* 🟡 ส่วนที่ 2: Action Buttons */}
            <div className="flex-1 overflow-y-auto bg-slate-900 p-4 custom-scrollbar">

                <h2 className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-3 text-center">— Select Action —</h2>

                <div className="grid grid-cols-3 gap-3 mb-4">
                    <ActionButton icon="⚔️" label="Attack" color="red" onClick={() => handleAction('attack')} />
                    <ActionButton icon="✨" label="Magic" color="blue" onClick={() => handleAction('magic')} />
                    <ActionButton icon="🦶" label="Move" color="yellow" onClick={() => handleAction('move')} />
                    <ActionButton icon="🧪" label="Heal" color="green" onClick={() => handleAction('heal')} />
                    <ActionButton icon="💬" label="Talk" color="purple" onClick={() => handleAction('talk')} />
                    <ActionButton icon="🔍" label="Inspect" color="gray" onClick={() => handleAction('inspect')} />
                </div>

                {/* Custom Action Input (แก้ไขแล้ว) */}
                <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={customAction}
                            onChange={(e) => setCustomAction(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') sendCustomAction()
                            }}
                            placeholder="Type custom action..."
                            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
                        />
                        <button
                            onClick={sendCustomAction}
                            className="bg-indigo-600 px-4 rounded-lg font-bold text-sm hover:bg-indigo-500 transition-colors"
                        >
                            GO
                        </button>
                    </div>
                </div>
            </div>

            {/* 🔴 ส่วนที่ 3: Game Log */}
            <div className="h-[30%] bg-slate-950 border-t border-slate-800 flex flex-col shrink-0">
                <div className="px-3 py-1 bg-slate-900 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase flex justify-between">
                    <span>📜 Adventure Log</span>
                    <span className="text-green-500">{logs.length} events</span>
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

                        {/* ชื่อ Skill ที่ให้ทอย */}
                        <div className="text-amber-500 text-2xl font-black mb-6 uppercase tracking-wider">{rollRequest.checkType}</div>

                        {/* คำโปรยเพิ่มความกดดัน */}
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
        red: "bg-red-500/10 border-red-500/30 hover:bg-red-500/20 text-red-400",
        blue: "bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20 text-blue-400",
        yellow: "bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 text-amber-400",
        green: "bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400",
        purple: "bg-fuchsia-500/10 border-fuchsia-500/30 hover:bg-fuchsia-500/20 text-fuchsia-400",
        gray: "bg-slate-500/10 border-slate-500/30 hover:bg-slate-500/20 text-slate-400",
    }

    return (
        <button
            onClick={onClick}
            className={`${colorStyles[color]} border p-3 rounded-xl flex flex-col items-center gap-1 transition-all active:scale-95`}
        >
            <span className="text-2xl filter drop-shadow-lg">{icon}</span>
            <span className="font-bold text-[10px] uppercase tracking-wide">{label}</span>
        </button>
    )
}