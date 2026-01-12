'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useGameSocket } from '@/hooks/useGameSocket'
import { SceneDisplay } from '@/components/board/SceneDisplay'
import { PartyStatus } from '@/components/board/PartyStatus'
import { GameLog } from '@/components/board/GameLog'

// --- Mock Data ---
const MOCK_SCENES = [
    { id: 's1', name: 'Misty Forest', url: 'https://img.freepik.com/premium-photo/majestic-misty-redwood-forest-with-lush-green-ferns-sunlight-filtering-through-fog_996993-7424.jpg' },
    { id: 's2', name: 'Dark Dungeon', url: 'https://img.freepik.com/premium-photo/dark-scary-fantasy-dungeon-room_950002-14068.jpg' },
    { id: 's3', name: 'Tavern', url: 'https://img.freepik.com/premium-photo/medieval-tavern-interior_950002-13251.jpg' },
    { id: 's4', name: 'Snow Mountain', url: 'https://img.freepik.com/premium-photo/snowy-mountain-peak-fantasy-landscape_950002-2345.jpg' },
]

const MOCK_NPCS = [
    { id: 'n1', name: 'Shadow Goblin', type: 'ENEMY', imageUrl: 'https://dmdave.com/wp-content/uploads/2020/02/shadow-goblin.png' },
    { id: 'n2', name: 'Ancient Chest', type: 'NEUTRAL', imageUrl: 'https://www.pngarts.com/files/3/Treasure-Chest-PNG-Download-Image.png' },
    { id: 'n3', name: 'Village Elder', type: 'FRIENDLY', imageUrl: 'https://s3-eu-west-2.amazonaws.com/dungeon20/images/985066/medium-63ed55ce6d3ac22ce30730a0bf172152f56bf9c8.png?1676026777' }
]

export default function CampaignBoardPage() {
    const params = useParams()
    const campaignId = params.campaignId as string

    // Game State
    const [gameState, setGameState] = useState<any>(null)
    const [logs, setLogs] = useState<any[]>([])
    const [players, setPlayers] = useState<any[]>([])
    const [diceResult, setDiceResult] = useState<any>(null)

    // UI State
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [gmInput, setGmInput] = useState('')
    const [targetDC, setTargetDC] = useState(15)
    const [activeTab, setActiveTab] = useState<'SCENE' | 'NPC'>('SCENE')

    // ❌ เอา Local State ออก
    // const [currentSceneImg, setCurrentSceneImg] = useState(...)
    // const [activeNpcs, setActiveNpcs] = useState(...) 

    const {
        onGameStateUpdate, onChatMessage, onPlayerAction, onDiceResult,
        requestRoll, sendPlayerAction
    } = useGameSocket(campaignId)

    useEffect(() => {
        onGameStateUpdate((state) => setGameState(state))
        onChatMessage((message) => setLogs((prev) => prev.some(log => log.id === message.id) ? prev : [...prev, message]))

        onPlayerAction((action) => {
            if (action.actionType === 'JOIN_GAME' && action.characterData) {
                setPlayers((prev) => {
                    const idx = prev.findIndex(p => p.id === action.characterData.id)
                    if (idx !== -1) { const newP = [...prev]; newP[idx] = action.characterData; return newP }
                    return [...prev, action.characterData]
                })
            }
        })

        onDiceResult((result) => { setDiceResult(result); setTimeout(() => setDiceResult(null), 4000) })
    }, [onGameStateUpdate, onChatMessage, onPlayerAction, onDiceResult])

    const handleGmNarrate = () => {
        if (!gmInput.trim()) return
        sendPlayerAction({ actionType: 'custom', description: gmInput, actorName: 'Game Master' })
        setGmInput('')
    }

    // ✅ NEW: ฟังก์ชันส่งคำสั่งเปลี่ยนฉาก
    const changeScene = (url: string) => {
        sendPlayerAction({
            actionType: 'GM_UPDATE_SCENE',
            payload: { sceneImageUrl: url }
        })
    }

    // ✅ NEW: ฟังก์ชันส่งคำสั่ง Toggle NPC
    const toggleNpc = (npc: any) => {
        const currentNpcs = gameState?.activeNpcs || []
        const exists = currentNpcs.find((n: any) => n.id === npc.id)

        let newNpcs
        if (exists) {
            newNpcs = currentNpcs.filter((n: any) => n.id !== npc.id)
        } else {
            newNpcs = [...currentNpcs, npc]
        }

        sendPlayerAction({
            actionType: 'GM_UPDATE_SCENE',
            payload: { activeNpcs: newNpcs }
        })
    }

    return (
        <div className="flex h-screen bg-[#0f172a] text-slate-200 overflow-hidden font-sans relative">

            {/* Header */}
            <div className="absolute top-0 w-full h-14 bg-slate-900/90 border-b border-slate-700 flex justify-between items-center px-4 z-50 backdrop-blur-md shadow-lg">
                <h1 className="text-amber-500 font-bold tracking-widest text-sm md:text-lg uppercase glow-text">The Shadow's Veil</h1>
                <div className="flex items-center gap-4">
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden p-2 text-slate-300 border border-slate-700 rounded bg-slate-800">
                        {isSidebarOpen ? '✖' : '☰ Menu'}
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex flex-1 pt-14 pb-24 md:pb-24 h-full w-full relative">

                {/* LEFT: Scene & Log */}
                <div className="flex-1 flex flex-col w-full h-full min-w-0">
                    <div className="h-[50%] md:h-[60%] relative bg-black">
                        <SceneDisplay
                            sceneDescription={gameState?.currentScene}
                            // ✅ ใช้ค่าจาก gameState กลางแทน local state
                            imageUrl={gameState?.sceneImageUrl}
                            npcs={gameState?.activeNpcs || []}
                        />
                        {diceResult && (
                            <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/60 backdrop-blur-sm">
                                <div className="bg-slate-900 p-8 rounded-2xl border-2 border-amber-500 text-center animate-in zoom-in">
                                    <div className="text-7xl font-bold text-white">{diceResult.total}</div>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex-1 bg-slate-950 border-t border-slate-800 relative min-h-0">
                        <div className="h-full pt-2 p-4"><GameLog logs={logs} /></div>
                    </div>
                </div>

                {/* RIGHT SIDEBAR */}
                <div className={`
                    fixed inset-y-0 right-0 z-40 w-80 bg-slate-900 border-l border-slate-700 shadow-2xl transform transition-transform duration-300 ease-in-out pt-14
                    ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}
                    lg:relative lg:translate-x-0 lg:block lg:pt-0 lg:w-80 lg:shadow-none flex flex-col h-full
                `}>
                    {/* 1. PARTY STATUS */}
                    <div className="h-[40%] flex flex-col border-b border-slate-700 bg-slate-900/50">
                        <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-900">
                            <h2 className="text-amber-500 font-bold text-xs tracking-wider uppercase">Party Status ({players.length})</h2>
                            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-500">✕</button>
                        </div>
                        <div className="p-3 space-y-3 overflow-y-auto custom-scrollbar flex-1">
                            <PartyStatus characters={players} />
                            {players.length === 0 && <div className="text-center text-slate-600 text-xs italic mt-4">No heroes yet...</div>}
                        </div>
                    </div>

                    {/* 2. GM CONTROLS */}
                    <div className="flex-1 flex flex-col bg-slate-950 min-h-0">
                        <div className="flex border-b border-slate-800">
                            <button onClick={() => setActiveTab('SCENE')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide transition-colors ${activeTab === 'SCENE' ? 'bg-slate-800 text-amber-500 border-b-2 border-amber-500' : 'text-slate-500 hover:text-slate-300'}`}>🌄 Scenes</button>
                            <button onClick={() => setActiveTab('NPC')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide transition-colors ${activeTab === 'NPC' ? 'bg-slate-800 text-amber-500 border-b-2 border-amber-500' : 'text-slate-500 hover:text-slate-300'}`}>👤 NPCs ({gameState?.activeNpcs?.length || 0})</button>
                        </div>

                        <div className="flex-1 p-3 overflow-y-auto custom-scrollbar">

                            {/* SCENE TAB */}
                            {activeTab === 'SCENE' && (
                                <div className="grid grid-cols-2 gap-2">
                                    {MOCK_SCENES.map(scene => (
                                        <div
                                            key={scene.id}
                                            // ✅ เปลี่ยนเป็นเรียก changeScene()
                                            onClick={() => changeScene(scene.url)}
                                            className={`
                                                relative aspect-video rounded-lg overflow-hidden cursor-pointer border-2 transition-all group
                                                ${gameState?.sceneImageUrl === scene.url ? 'border-amber-500 ring-2 ring-amber-500/30' : 'border-slate-700 hover:border-slate-500'}
                                            `}
                                        >
                                            <img src={scene.url} alt={scene.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-2">
                                                <span className="text-[10px] font-bold text-white truncate">{scene.name}</span>
                                            </div>
                                            {gameState?.sceneImageUrl === scene.url && (
                                                <div className="absolute top-1 right-1 bg-amber-500 text-black text-[8px] font-bold px-1.5 py-0.5 rounded">ACTIVE</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* NPC TAB */}
                            {activeTab === 'NPC' && (
                                <div className="space-y-3">
                                    <div className="text-[10px] text-slate-500 uppercase font-bold text-center mb-2">Click to Toggle Overlay</div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {MOCK_NPCS.map(npc => {
                                            const isActive = gameState?.activeNpcs?.some((n: any) => n.id === npc.id)
                                            let borderColor = 'border-slate-600'
                                            if (isActive) {
                                                if (npc.type === 'FRIENDLY') borderColor = 'border-emerald-500 ring-2 ring-emerald-500/30'
                                                else if (npc.type === 'ENEMY') borderColor = 'border-red-500 ring-2 ring-red-500/30'
                                                else borderColor = 'border-white ring-2 ring-white/30'
                                            }

                                            return (
                                                <div
                                                    key={npc.id}
                                                    // ✅ เปลี่ยนเป็นเรียก toggleNpc()
                                                    onClick={() => toggleNpc(npc)}
                                                    className={`
                                                        flex flex-col items-center gap-1 cursor-pointer p-2 rounded-lg transition-all
                                                        ${isActive ? 'bg-slate-800' : 'hover:bg-slate-900'}
                                                    `}
                                                >
                                                    <div className={`w-12 h-12 rounded-full border-2 overflow-hidden bg-white/10 ${borderColor}`}>
                                                        <img src={npc.imageUrl} alt={npc.name} className={`w-full h-full object-cover transition-all ${!isActive && 'grayscale opacity-60'}`} />
                                                    </div>
                                                    <span className={`text-[9px] font-bold truncate max-w-full ${isActive ? 'text-white' : 'text-slate-500'}`}>
                                                        {npc.name}
                                                    </span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-0 w-full h-auto min-h-[80px] md:h-24 bg-slate-900 border-t border-slate-700 flex flex-col md:flex-row items-center px-4 py-2 gap-3 z-50">
                <div className="w-full md:flex-1 flex gap-2">
                    <input value={gmInput} onChange={(e) => setGmInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleGmNarrate()} placeholder="Narrate..." className="flex-1 bg-slate-800 border-slate-700 rounded px-3 py-2 text-sm text-slate-200 outline-none focus:border-amber-500" />
                    <button onClick={handleGmNarrate} className="bg-slate-700 text-slate-200 px-3 py-2 rounded text-sm font-bold">Send</button>
                </div>
                <div className="w-full md:w-auto flex gap-2 overflow-x-auto pb-2 md:pb-0">
                    <input type="number" value={targetDC} onChange={(e) => setTargetDC(Number(e.target.value))} className="w-12 bg-slate-800 border-slate-700 rounded text-center text-amber-500 font-bold text-sm" />
                    {['STR', 'DEX', 'INT', 'WIS', 'CHA'].map(stat => (
                        <button key={stat} onClick={() => requestRoll(`${stat} Check`, targetDC)} className="w-10 h-10 bg-slate-800 border-slate-600 rounded flex flex-col items-center justify-center active:scale-95">
                            <span className="text-[8px] text-slate-400">{stat}</span>
                            <span className="text-xs">🎲</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}