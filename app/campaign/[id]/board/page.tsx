'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useGameSocket } from '@/hooks/useGameSocket'
import { SceneDisplay } from '@/components/board/SceneDisplay'
import { PartyStatus } from '@/components/board/PartyStatus'
import { GameLog } from '@/components/board/GameLog'

export default function CampaignBoardPage() {
    const params = useParams()
    const campaignId = params.id as string

    const [gameState, setGameState] = useState<any>(null)
    const [logs, setLogs] = useState<any[]>([])
    const [players, setPlayers] = useState<any[]>([])
    const [diceResult, setDiceResult] = useState<any>(null)

    // State สำหรับ GM Control
    const [gmInput, setGmInput] = useState('')
    const [targetDC, setTargetDC] = useState(15) // ค่า DC เริ่มต้น

    const {
        onGameStateUpdate,
        onChatMessage,
        onPlayerJoined,
        onDiceResult,
        requestRoll,
        sendPlayerAction // ใช้ส่งข้อความจาก GM
    } = useGameSocket(campaignId)

    useEffect(() => {
        onGameStateUpdate((state) => setGameState(state))
        onChatMessage((message) => setLogs((prev) => [...prev, message]))
        onPlayerJoined((profile) => setPlayers((prev) => {
            if (prev.find(p => p.id === profile.id)) return prev
            return [...prev, profile]
        }))
        onDiceResult((result) => {
            setDiceResult(result)
            setTimeout(() => setDiceResult(null), 4000)
        })
    }, [onGameStateUpdate, onChatMessage, onPlayerJoined, onDiceResult])

    // ฟังก์ชันส่งข้อความบรรยายจาก GM
    const handleGmNarrate = () => {
        if (!gmInput.trim()) return
        // ใช้ช่องทางเดียวกับ Player Action แต่ส่งเป็น Custom Narrative
        sendPlayerAction({
            actionType: 'custom',
            description: gmInput, // ส่งข้อความที่พิมพ์
            actorName: 'Game Master'
        })
        setGmInput('')
    }

    return (
        <div className="flex h-screen bg-[#0f172a] text-slate-200 overflow-hidden font-sans">

            {/* 🟢 TOP BAR: Header เหมือนในรูป */}
            <div className="absolute top-0 w-full h-14 bg-slate-900/90 border-b border-slate-700 flex justify-between items-center px-6 z-50 backdrop-blur-md shadow-lg">
                <div className="flex items-center gap-4">
                    <h1 className="text-amber-500 font-bold tracking-widest text-lg uppercase glow-text">
                        The Shadow's Veil Campaign
                    </h1>
                    <span className="flex items-center gap-2 text-xs text-green-400 bg-green-900/30 px-2 py-1 rounded-full border border-green-500/30">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        CONNECTED
                    </span>
                </div>
                <div className="flex gap-6 text-xs font-mono text-slate-400">
                    <div className="flex items-center gap-2">
                        <span className="text-slate-500">PLAYERS:</span>
                        <span className="text-white">{players.length}/4</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-slate-500">LATENCY:</span>
                        <span className="text-green-400">35ms</span>
                    </div>
                </div>
            </div>

            {/* 🟡 MAIN CONTENT GRID */}
            <div className="flex flex-1 pt-14 pb-24"> {/* pb-24 เว้นที่ให้ Control Panel ด้านล่าง */}

                {/* LEFT: Scene & Log */}
                <div className="flex-1 flex flex-col border-r border-slate-800">
                    {/* Scene Area (60%) */}
                    <div className="h-[60%] relative bg-black">
                        <SceneDisplay
                            sceneDescription={gameState?.currentScene}
                            imageUrl="/images/placeholder-dungeon.jpg" // หารูปสวยๆ มาใส่ได้ครับ
                        />

                        {/* Dice Overlay (เด้งกลางจอ) */}
                        {diceResult && (
                            <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                                <div className="bg-slate-900 p-8 rounded-2xl border-2 border-amber-500 shadow-[0_0_50px_rgba(245,158,11,0.3)] text-center transform scale-110">
                                    <div className="text-amber-500 text-sm font-bold uppercase tracking-wider mb-2">Result</div>
                                    <div className="text-7xl font-bold text-white mb-2 drop-shadow-lg">{diceResult.total}</div>
                                    <div className="text-slate-400 font-mono text-sm">{diceResult.detail}</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Game Log (40%) */}
                    <div className="flex-1 bg-slate-950 border-t border-slate-800 relative">
                        <div className="absolute top-0 left-0 px-4 py-1 bg-slate-900 border-b border-r border-slate-800 text-xs font-bold text-amber-500 uppercase rounded-br-lg">
                            Game Log
                        </div>
                        <div className="h-full pt-8 p-4">
                            <GameLog logs={logs} />
                        </div>
                    </div>
                </div>

                {/* RIGHT: Party Status (Sidebar) */}
                <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col">
                    <div className="p-4 border-b border-slate-800">
                        <h2 className="text-amber-500 font-bold text-sm tracking-wider uppercase text-center">Party Status</h2>
                    </div>
                    <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar">
                        {players.map(p => (
                            <PartyStatus key={p.id} characters={[p]} />
                        ))}
                        {players.length === 0 && (
                            <div className="text-center text-slate-600 text-sm italic mt-10">Waiting for players...</div>
                        )}
                    </div>
                </div>
            </div>

            {/* 🔴 BOTTOM CONTROL PANEL (พื้นที่ GM สั่งการ) */}
            <div className="absolute bottom-0 w-full h-24 bg-slate-900 border-t border-amber-500/30 flex items-center px-6 gap-6 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-40">

                {/* 1. GM Input Area (พิมพ์เล่าเรื่อง) */}
                <div className="flex-1 flex gap-2">
                    <input
                        type="text"
                        value={gmInput}
                        onChange={(e) => setGmInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleGmNarrate()}
                        placeholder="Type narration or description..."
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 placeholder-slate-500"
                    />
                    <button
                        onClick={handleGmNarrate}
                        className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg font-bold border border-slate-600 transition-colors"
                    >
                        Send
                    </button>
                </div>

                {/* 2. Dice Request Panel (สั่งทอยเต๋า) */}
                <div className="flex items-center gap-4 border-l border-slate-700 pl-6">
                    <div className="flex flex-col">
                        <label className="text-[10px] text-slate-500 font-bold uppercase mb-1">Difficulty (DC)</label>
                        <input
                            type="number"
                            value={targetDC}
                            onChange={(e) => setTargetDC(Number(e.target.value))}
                            className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-center text-amber-500 font-bold focus:outline-none focus:border-amber-500"
                        />
                    </div>

                    <div className="flex gap-2">
                        {['STR', 'DEX', 'INT', 'WIS', 'CHA'].map((stat) => (
                            <button
                                key={stat}
                                onClick={() => requestRoll(`${stat} Check`, targetDC)}
                                className="flex flex-col items-center justify-center w-12 h-12 bg-slate-800 border border-slate-600 hover:border-amber-500 hover:bg-slate-700 rounded-lg transition-all active:scale-95 group"
                            >
                                <span className="text-[10px] text-slate-400 group-hover:text-amber-500 font-bold">{stat}</span>
                                <span className="text-xs">🎲</span>
                            </button>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    )
}