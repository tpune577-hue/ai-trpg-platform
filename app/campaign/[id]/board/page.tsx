'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useGameSocket } from '@/hooks/useGameSocket'
// ✅ Import Components ให้ครบ
import { SceneDisplay } from '@/components/board/SceneDisplay'
import { PartyStatus } from '@/components/board/PartyStatus'
import { GameLog } from '@/components/board/GameLog'

export default function CampaignBoardPage() {
    const params = useParams()
    const campaignId = params.campaignId as string

    // State
    const [gameState, setGameState] = useState<any>(null)
    const [logs, setLogs] = useState<any[]>([])
    const [players, setPlayers] = useState<any[]>([])
    const [diceResult, setDiceResult] = useState<any>(null)

    // ✅ UI State: สำหรับเปิด/ปิด Sidebar บนจอเล็ก
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)

    // GM Control State
    const [gmInput, setGmInput] = useState('')
    const [targetDC, setTargetDC] = useState(15)

    const {
        onGameStateUpdate,
        onChatMessage,
        onPlayerJoined,
        onPlayerAction,
        onDiceResult,
        requestRoll,
        sendPlayerAction
    } = useGameSocket(campaignId)

    useEffect(() => {
        onGameStateUpdate((state) => setGameState(state))

        onChatMessage((message) => {
            setLogs((prev) => {
                if (prev.some(log => log.id === message.id)) return prev
                return [...prev, message]
            })
        })

        onPlayerAction((action) => {
            if (action.actionType === 'JOIN_GAME' && action.characterData) {
                setPlayers((prev) => {
                    const existingIndex = prev.findIndex(p => p.id === action.characterData.id)
                    if (existingIndex !== -1) {
                        const newPlayers = [...prev]
                        newPlayers[existingIndex] = action.characterData
                        return newPlayers
                    }
                    return [...prev, action.characterData]
                })
            }
        })

        onDiceResult((result) => {
            setDiceResult(result)
            setTimeout(() => setDiceResult(null), 4000)
        })

    }, [onGameStateUpdate, onChatMessage, onPlayerJoined, onPlayerAction, onDiceResult])

    const handleGmNarrate = () => {
        if (!gmInput.trim()) return
        sendPlayerAction({
            actionType: 'custom',
            description: gmInput,
            actorName: 'Game Master'
        })
        setGmInput('')
    }

    return (
        <div className="flex h-screen bg-[#0f172a] text-slate-200 overflow-hidden font-sans relative">

            {/* 🟢 TOP BAR: Header */}
            <div className="absolute top-0 w-full h-14 bg-slate-900/90 border-b border-slate-700 flex justify-between items-center px-4 z-50 backdrop-blur-md shadow-lg">
                <div className="flex items-center gap-4">
                    <h1 className="text-amber-500 font-bold tracking-widest text-sm md:text-lg uppercase glow-text truncate max-w-[200px] md:max-w-none">
                        The Shadow's Veil
                    </h1>
                    <span className="flex items-center gap-2 text-xs text-green-400 bg-green-900/30 px-2 py-1 rounded-full border border-green-500/30">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        LIVE
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    {/* Stats โชว์เฉพาะบนจอใหญ่ */}
                    <div className="hidden md:flex gap-6 text-xs font-mono text-slate-400 border-r border-slate-700 pr-6">
                        <div className="flex items-center gap-2">
                            <span className="text-slate-500">PLAYERS:</span>
                            <span className="text-white">{players.length}/4</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-slate-500">LATENCY:</span>
                            <span className="text-green-400">35ms</span>
                        </div>
                    </div>

                    {/* ✅ HAMBURGER BUTTON (โชว์เฉพาะ Mobile/Tablet) */}
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="lg:hidden p-2 text-slate-300 hover:text-amber-500 border border-slate-700 rounded bg-slate-800 transition-colors"
                    >
                        {isSidebarOpen ? '✖' : '☰ Party'}
                    </button>
                </div>
            </div>

            {/* 🟡 MAIN CONTENT GRID */}
            <div className="flex flex-1 pt-14 pb-24 md:pb-24 h-full w-full relative">

                {/* LEFT: Scene & Log (ปรับให้ยืดเต็มจอเมื่อจอเล็ก) */}
                <div className="flex-1 flex flex-col w-full h-full min-w-0">
                    {/* Scene Area: ปรับความสูงตามความเหมาะสม */}
                    <div className="h-[50%] md:h-[60%] relative bg-black">
                        <SceneDisplay
                            sceneDescription={gameState?.currentScene}
                            // ✅ ใช้รูปป่าหมอกที่คุณชอบ
                            imageUrl="https://img.freepik.com/premium-photo/majestic-misty-redwood-forest-with-lush-green-ferns-sunlight-filtering-through-fog_996993-7424.jpg"
                        />

                        {/* Dice Overlay */}
                        {diceResult && (
                            <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                                <div className="bg-slate-900 p-6 md:p-8 rounded-2xl border-2 border-amber-500 shadow-[0_0_50px_rgba(245,158,11,0.3)] text-center transform scale-90 md:scale-110">
                                    <div className="text-amber-500 text-sm font-bold uppercase tracking-wider mb-2">Result</div>
                                    <div className="text-5xl md:text-7xl font-bold text-white mb-2 drop-shadow-lg">{diceResult.total}</div>
                                    <div className="text-slate-400 font-mono text-sm">{diceResult.detail}</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Game Log: พื้นที่ที่เหลือ */}
                    <div className="flex-1 bg-slate-950 border-t border-slate-800 relative min-h-0">
                        <div className="absolute top-0 left-0 px-4 py-1 bg-slate-900 border-b border-r border-slate-800 text-xs font-bold text-amber-500 uppercase rounded-br-lg z-10">
                            Game Log
                        </div>
                        <div className="h-full pt-8 p-4">
                            <GameLog logs={logs} />
                        </div>
                    </div>
                </div>

                {/* RIGHT: Party Status (Sidebar) -> เปลี่ยนเป็น Off-canvas Drawer บนจอเล็ก */}
                <div className={`
                    fixed inset-y-0 right-0 z-40 w-72 bg-slate-900 border-l border-slate-700 shadow-2xl transform transition-transform duration-300 ease-in-out pt-14
                    ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}
                    lg:relative lg:translate-x-0 lg:block lg:pt-0 lg:w-80 lg:shadow-none
                `}>
                    <div className="h-full flex flex-col">
                        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                            <h2 className="text-amber-500 font-bold text-sm tracking-wider uppercase">Party Status</h2>
                            {/* ปุ่มปิด Sidebar บนมือถือ */}
                            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-500 hover:text-white">✕</button>
                        </div>
                        <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                            {/* ✅ ส่ง players state ไปแสดงผล */}
                            <PartyStatus characters={players} />

                            {players.length === 0 && (
                                <div className="text-center text-slate-600 text-sm italic mt-10">
                                    Waiting for heroes...
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Overlay เมื่อเปิด Sidebar บนมือถือ (กดแล้วปิด) */}
                {isSidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 z-30 lg:hidden"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}
            </div>

            {/* 🔴 BOTTOM CONTROL PANEL (ปรับให้ Scroll ได้แนวนอนบนจอเล็ก) */}
            <div className="absolute bottom-0 w-full h-auto min-h-[80px] md:h-24 bg-slate-900 border-t border-amber-500/30 flex flex-col md:flex-row items-center px-4 py-2 md:px-6 gap-3 md:gap-6 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-50">

                {/* 1. GM Input Area */}
                <div className="w-full md:flex-1 flex gap-2">
                    <input
                        type="text"
                        value={gmInput}
                        onChange={(e) => setGmInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleGmNarrate()}
                        placeholder="Type narration..."
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500 placeholder-slate-500"
                    />
                    <button
                        onClick={handleGmNarrate}
                        className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2 rounded-lg font-bold text-sm border border-slate-600 whitespace-nowrap"
                    >
                        Send
                    </button>
                </div>

                {/* 2. Dice Request Panel (เลื่อนแนวนอนได้ถ้าจอแคบ) */}
                <div className="w-full md:w-auto flex items-center gap-3 overflow-x-auto pb-2 md:pb-0 border-t md:border-t-0 md:border-l border-slate-700 pt-2 md:pt-0 pl-0 md:pl-6 custom-scrollbar">
                    <div className="flex flex-col shrink-0">
                        <label className="text-[10px] text-slate-500 font-bold uppercase mb-1">DC</label>
                        <input
                            type="number"
                            value={targetDC}
                            onChange={(e) => setTargetDC(Number(e.target.value))}
                            className="w-12 bg-slate-800 border border-slate-700 rounded px-1 py-1 text-center text-amber-500 font-bold text-sm focus:outline-none focus:border-amber-500"
                        />
                    </div>

                    <div className="flex gap-2 shrink-0">
                        {['STR', 'DEX', 'INT', 'WIS', 'CHA'].map((stat) => (
                            <button
                                key={stat}
                                onClick={() => requestRoll(`${stat} Check`, targetDC)}
                                className="flex flex-col items-center justify-center w-10 h-10 md:w-12 md:h-12 bg-slate-800 border border-slate-600 hover:border-amber-500 hover:bg-slate-700 rounded-lg transition-all active:scale-95 group"
                            >
                                <span className="text-[9px] md:text-[10px] text-slate-400 group-hover:text-amber-500 font-bold">{stat}</span>
                                <span className="text-xs">🎲</span>
                            </button>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    )
}