'use client'

import { useState } from 'react'
import { UserProfile } from '@/types/socket'

interface PlayerControlPanelProps {
    players: UserProfile[]
    scenes: { id: string; name: string; url: string }[]
    onSetPrivateScene: (playerId: string, sceneId: string | null) => void
    onWhisper: (targetPlayerId: string, message: string) => void
    onSetGlobalScene: (sceneId: string) => void
    onRequestRoll: (playerId: string, checkType: string, dc: number) => void
}

export function PlayerControlPanel({
    players,
    scenes,
    onSetPrivateScene,
    onWhisper,
    onSetGlobalScene,
    onRequestRoll
}: PlayerControlPanelProps) {
    const [whisperInputs, setWhisperInputs] = useState<Record<string, string>>({})
    const [selectedScenes, setSelectedScenes] = useState<Record<string, string>>({})
    const [globalSceneId, setGlobalSceneId] = useState<string>(scenes[0]?.id || '')
    const [selectedChecks, setSelectedChecks] = useState<Record<string, string>>({})
    const [dcValues, setDcValues] = useState<Record<string, number>>({})

    const checkTypes = ['STR', 'DEX', 'INT', 'WIS', 'CHA', 'CON']

    const handleWhisperChange = (playerId: string, value: string) => {
        setWhisperInputs(prev => ({ ...prev, [playerId]: value }))
    }

    const handleSceneSelect = (playerId: string, sceneId: string) => {
        setSelectedScenes(prev => ({ ...prev, [playerId]: sceneId }))
    }

    const sendWhisper = (playerId: string) => {
        const msg = whisperInputs[playerId]
        if (!msg?.trim()) return
        onWhisper(playerId, msg)
        setWhisperInputs(prev => ({ ...prev, [playerId]: '' }))
    }

    const requestRoll = (playerId: string) => {
        const checkType = selectedChecks[playerId] || 'STR'
        const dc = dcValues[playerId] || 10
        onRequestRoll(playerId, checkType, dc)
    }

    return (
        <div className="flex flex-col gap-4 p-4 bg-slate-900 border-t border-slate-700 h-full overflow-hidden">
            <h3 className="text-amber-500 font-bold uppercase text-xs tracking-wider flex-shrink-0">GM Player Controls</h3>

            {/* Global Scene Control */}
            <div className="p-3 bg-slate-800 rounded border border-slate-700 space-y-2 flex-shrink-0">
                <label className="text-xs font-bold text-slate-400 uppercase">Global Scene (Apply All)</label>
                <div className="flex gap-2">
                    <select
                        className="flex-1 bg-slate-950 text-slate-200 text-xs p-2 rounded border border-slate-600 outline-none"
                        value={globalSceneId}
                        onChange={(e) => setGlobalSceneId(e.target.value)}
                    >
                        <option value="">Select Scene...</option>
                        {scenes.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => onSetGlobalScene(globalSceneId)}
                        disabled={!globalSceneId}
                        className="px-3 py-1 bg-red-900/50 hover:bg-red-800 text-red-200 text-xs font-bold rounded border border-red-700 shadow-sm transition-all disabled:opacity-50"
                    >
                        APPLY ALL
                    </button>
                </div>
            </div>

            {/* Individual Controls - Scrollable */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0">
                <div className="space-y-3">
                    {players.map(player => (
                        <div key={player.id} className="bg-slate-950 p-2 rounded border border-slate-800 flex flex-col gap-2">
                            <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                                <span className="text-xs font-bold text-slate-300">{player.name}</span>
                                <span className="text-[9px] text-slate-500 uppercase">{player.role}</span>
                            </div>

                            {/* Private Scene */}
                            <div className="flex gap-1 items-center">
                                <select
                                    className="flex-1 bg-slate-900 text-slate-300 text-[10px] p-1 rounded border border-slate-700 outline-none"
                                    value={selectedScenes[player.id] || ''}
                                    onChange={(e) => handleSceneSelect(player.id, e.target.value)}
                                >
                                    <option value="">Default Scene</option>
                                    {scenes.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                                <button
                                    onClick={() => onSetPrivateScene(player.id, selectedScenes[player.id] || null)}
                                    className="px-2 py-1 bg-amber-900/40 hover:bg-amber-800 text-amber-200 text-[9px] font-bold rounded border border-amber-800/50"
                                >
                                    SET
                                </button>
                            </div>

                            {/* Whisper */}
                            <div className="flex gap-1 items-center">
                                <input
                                    type="text"
                                    placeholder="Whisper..."
                                    className="flex-1 bg-slate-900 text-slate-300 text-[10px] p-1 rounded border border-slate-700 outline-none placeholder:text-slate-600"
                                    value={whisperInputs[player.id] || ''}
                                    onChange={(e) => handleWhisperChange(player.id, e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && sendWhisper(player.id)}
                                />
                                <button
                                    onClick={() => sendWhisper(player.id)}
                                    className="px-2 py-1 bg-indigo-900/40 hover:bg-indigo-800 text-indigo-200 text-[9px] font-bold rounded border border-indigo-800/50"
                                >
                                    SEND
                                </button>
                            </div>

                            {/* Dice Roll Request */}
                            <div className="flex gap-1 items-center">
                                <select
                                    className="bg-slate-900 text-slate-300 text-[10px] p-1 rounded border border-slate-700 outline-none"
                                    value={selectedChecks[player.id] || 'STR'}
                                    onChange={(e) => setSelectedChecks(prev => ({ ...prev, [player.id]: e.target.value }))}
                                >
                                    {checkTypes.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                                <input
                                    type="number"
                                    placeholder="DC"
                                    className="w-12 bg-slate-900 text-slate-300 text-[10px] p-1 rounded border border-slate-700 outline-none text-center"
                                    value={dcValues[player.id] || 10}
                                    onChange={(e) => setDcValues(prev => ({ ...prev, [player.id]: parseInt(e.target.value) || 10 }))}
                                    min="1"
                                    max="30"
                                />
                                <button
                                    onClick={() => requestRoll(player.id)}
                                    className="flex-1 px-2 py-1 bg-purple-900/40 hover:bg-purple-800 text-purple-200 text-[9px] font-bold rounded border border-purple-800/50"
                                >
                                    🎲 ROLL
                                </button>
                            </div>
                        </div>
                    ))}
                    {players.length === 0 && (
                        <div className="text-center text-slate-600 text-xs py-4">No players connected</div>
                    )}
                </div>
            </div>
        </div>
    )
}
