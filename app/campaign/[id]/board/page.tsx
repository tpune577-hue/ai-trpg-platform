'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useGameSocket } from '@/hooks/useGameSocket'
import { SceneDisplay } from '@/components/board/SceneDisplay'
import { PartyStatus } from '@/components/board/PartyStatus'
import { GameLog } from '@/components/board/GameLog'
import { PlayerControlPanel } from '@/components/board/PlayerControlPanel'
import { SCENES, NPCS } from '@/lib/game-data'

export default function CampaignBoardPage() {
    const params = useParams()
    const campaignId = params.id as string

    // Game State
    const [gameState, setGameState] = useState<any>(null)
    const [logs, setLogs] = useState<any[]>([])
    const [diceResult, setDiceResult] = useState<any>(null)
    const [gmNarration, setGmNarration] = useState<string>('') // For GM narration text

    // UI State
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [gmInput, setGmInput] = useState('')
    const [targetDC, setTargetDC] = useState(15)
    // Modified Tabs to include Player Control
    const [activeTab, setActiveTab] = useState<'SCENE' | 'NPC' | 'PLAYERS'>('SCENE')

    const {
        roomInfo,
        onGameStateUpdate, onChatMessage, onPlayerAction, onDiceResult,
        requestRoll, sendPlayerAction,
        // New Socket Methods
        setPrivateScene, sendWhisper, setGlobalScene, onWhisperReceived
    } = useGameSocket(campaignId, {
        sessionToken: 'DEMO_GM_TOKEN',
        userId: 'DEMO_GM_TOKEN', // Add userId for event filtering
        autoConnect: true
    })

    useEffect(() => {
        onGameStateUpdate((newState) => setGameState((prev: any) => ({
            ...prev,
            ...newState
        })))
        onChatMessage((message) => setLogs((prev) => prev.some(log => log.id === message.id) ? prev : [...prev, message]))
        // Listen for Whisper (show in log for GM)
        onWhisperReceived((data) => {
            setLogs((prev) => [...prev, {
                id: Date.now().toString(),
                content: `💬 Whisper to ${data.sender}: ${data.message}`,
                type: 'WHISPER',
                senderName: 'GM',
                timestamp: new Date()
            }])
        })

        onPlayerAction((action) => {
            // Show action in log immediately
            setLogs((prev) => [...prev, {
                id: Date.now().toString(),
                content: `${action.actorName} used ${action.actionType}: ${action.description}`,
                type: 'ACTION',
                senderName: action.actorName,
                timestamp: new Date()
            }])

            // If it's GM narration (custom action from Game Master), show in scene
            if (action.actorName === 'Game Master' && action.actionType === 'custom') {
                setGmNarration(action.description)
            }
        })

        onDiceResult((result) => {
            setDiceResult(result)
            // Add dice result to log (without DC)
            setLogs((prev) => [...prev, {
                id: Date.now().toString(),
                content: `🎲 ${result.actorName || 'Player'} rolled ${result.roll} + ${result.mod} = ${result.total} ${result.total >= result.dc ? '✅ Success!' : '❌ Failed'}`,
                type: 'DICE',
                senderName: 'System',
                timestamp: new Date()
            }])
            setTimeout(() => setDiceResult(null), 4000)
        })
    }, [onGameStateUpdate, onChatMessage, onPlayerAction, onDiceResult, onWhisperReceived])

    const handleGmNarrate = () => {
        if (!gmInput.trim()) return
        sendPlayerAction({ actionType: 'custom', description: gmInput, actorName: 'Game Master' } as any)
        setGmInput('')
    }

    const changeScene = (url: string) => {
        // Fallback or use setGlobalScene if we mapped URLs to IDs
        // For now using old method for compatibility unless we map IDs
        // Ideally we should use setGlobalScene but that requires scene IDs.
        // Let's assume MOCK_SCENES IDs map to something server understands or we send custom action

        // Use the new Global Scene Setter
        // Find ID from URL
        const scene = SCENES.find(s => s.url === url)
        if (scene) {
            setGlobalScene(scene.id)
        } else {
            // Fallback for custom URLs
            sendPlayerAction({
                actionType: 'GM_UPDATE_SCENE',
                payload: { sceneImageUrl: url }
            } as any)
        }
    }

    const toggleNpc = (npc: any) => {
        const currentNpcs = gameState?.activeNpcs || []
        const exists = currentNpcs.find((n: any) => n.id === npc.id)

        let newNpcs
        if (exists) {
            newNpcs = currentNpcs.filter((n: any) => n.id !== npc.id)
        } else {
            newNpcs = [...currentNpcs, npc]
        }

        // Only update NPCs, preserve current scene
        sendPlayerAction({
            actionType: 'GM_UPDATE_SCENE',
            payload: {
                activeNpcs: newNpcs,
                currentScene: gameState?.currentScene, // Preserve current scene
                sceneImageUrl: gameState?.sceneImageUrl // Preserve current image
            }
        } as any)
    }

    return (
        <div className="flex h-screen bg-[#0f172a] text-slate-200 overflow-hidden font-sans relative">

            {/* Header */}
            <div className="absolute top-0 w-full h-14 bg-slate-900/90 border-b border-slate-700 flex justify-between items-center px-4 z-50 backdrop-blur-md shadow-lg">
                <h1 className="text-amber-500 font-bold tracking-widest text-sm md:text-lg uppercase glow-text">The Shadow's Veil (GM)</h1>
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
                            sceneDescription={gmNarration || SCENES.find(s => s.id === gameState?.currentScene)?.name || gameState?.currentScene || 'The adventure awaits...'}
                            imageUrl={gameState?.sceneImageUrl || (SCENES.find(s => s.id === gameState?.currentScene)?.url)} // Fallback to map ID to URL
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
                    <div className="h-[30%] flex flex-col border-b border-slate-700 bg-slate-900/50">
                        <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-900">
                            <h2 className="text-amber-500 font-bold text-xs tracking-wider uppercase">Party Status ({roomInfo?.connectedPlayers?.length || 0})</h2>
                            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-500">✕</button>
                        </div>
                        <div className="p-3 space-y-3 overflow-y-auto custom-scrollbar flex-1">
                            {/* Use Connected Players from Room Info */}
                            <PartyStatus characters={roomInfo?.connectedPlayers || []} />
                            {(!roomInfo?.connectedPlayers || roomInfo.connectedPlayers.length === 0) && <div className="text-center text-slate-600 text-xs italic mt-4">No heroes yet...</div>}
                        </div>
                    </div>

                    {/* 2. GM CONTROLS */}
                    <div className="flex-1 flex flex-col bg-slate-950 min-h-0">
                        <div className="flex border-b border-slate-800">
                            <button onClick={() => setActiveTab('SCENE')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide transition-colors ${activeTab === 'SCENE' ? 'bg-slate-800 text-amber-500 border-b-2 border-amber-500' : 'text-slate-500 hover:text-slate-300'}`}>Scenes</button>
                            <button onClick={() => setActiveTab('NPC')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide transition-colors ${activeTab === 'NPC' ? 'bg-slate-800 text-amber-500 border-b-2 border-amber-500' : 'text-slate-500 hover:text-slate-300'}`}>NPCs</button>
                            <button onClick={() => setActiveTab('PLAYERS')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide transition-colors ${activeTab === 'PLAYERS' ? 'bg-slate-800 text-amber-500 border-b-2 border-amber-500' : 'text-slate-500 hover:text-slate-300'}`}>Players</button>
                        </div>

                        <div className="flex-1 p-3 overflow-y-auto custom-scrollbar">

                            {/* SCENE TAB */}
                            {activeTab === 'SCENE' && (
                                <div className="grid grid-cols-2 gap-2">
                                    {SCENES.map(scene => (
                                        <div
                                            key={scene.id}
                                            onClick={() => changeScene(scene.url)} // This now uses setGlobalScene if matches
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
                                        {NPCS.map(npc => {
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

                            {/* PLAYERS TAB */}
                            {activeTab === 'PLAYERS' && (
                                <PlayerControlPanel
                                    players={roomInfo?.connectedPlayers || []}
                                    scenes={SCENES}
                                    onSetPrivateScene={setPrivateScene}
                                    onSetGlobalScene={setGlobalScene}
                                    onWhisper={sendWhisper}
                                    onRequestRoll={(playerId, checkType, dc) => {
                                        console.log(`🎲 Requesting ${checkType} check (DC ${dc}) from player ${playerId}`)
                                        requestRoll(checkType, dc, playerId)
                                    }}
                                />
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
