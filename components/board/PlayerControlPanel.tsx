'use client'

import { useState } from 'react'
import { UserProfile } from '@/types/socket'

interface PlayerControlPanelProps {
    players: UserProfile[]
    scenes: { id: string; name: string; url: string }[]
    onSetPrivateScene: (playerId: string, sceneId: string | null) => void
    onWhisper: (targetPlayerId: string, message: string) => void
    onSetGlobalScene: (sceneId: string) => void
    // ✅ เพิ่ม prop สำหรับแจกของ
    onGiveItem: (targetPlayerId: string, itemData: any, action: string) => void
}

// Helper: เลือก Icon อัตโนมัติตามประเภท
const getItemIcon = (type: string) => {
    switch (type) {
        case 'WEAPON': return '⚔️';
        case 'CONSUMABLE': return '🧪';
        case 'KEY': return '🗝️';
        case 'ARMOR': return '🛡️';
        default: return '📦';
    }
}

export function PlayerControlPanel({
    players,
    scenes,
    onSetPrivateScene,
    onWhisper,
    onSetGlobalScene,
    onGiveItem // ✅ Destructure ออกมา
}: PlayerControlPanelProps) {
    const [whisperInputs, setWhisperInputs] = useState<Record<string, string>>({})
    const [selectedScenes, setSelectedScenes] = useState<Record<string, string>>({})
    const [globalSceneId, setGlobalSceneId] = useState<string>(scenes[0]?.id || '')

    // State สำหรับสร้าง Item
    const [creationMode, setCreationMode] = useState(false)
    const [newItem, setNewItem] = useState({ name: '', description: '', type: 'MISC' })

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

    const handleCreateAndGive = (targetPlayerId: string) => {
        if (!newItem.name) return;

        // สร้าง Object Item ก้อนใหม่
        const customItem = {
            id: `custom-${Date.now()}`,
            name: newItem.name,
            description: newItem.description || 'A mysterious item.',
            type: newItem.type,
            icon: getItemIcon(newItem.type)
        }

        // ส่งผ่าน Prop ที่รับมา
        onGiveItem(targetPlayerId, customItem, 'GIVE_CUSTOM')
    }

    return (
        <div className="flex flex-col gap-4 p-4 bg-slate-900 border-t border-slate-700 h-full overflow-hidden">
            <h3 className="text-amber-500 font-bold uppercase text-xs tracking-wider flex-shrink-0">GM Player Controls</h3>

            {/* 1. Global Scene Control */}
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
                        APPLY
                    </button>
                </div>
            </div>

            {/* 2. Item Creator Section */}
            <div className="bg-slate-800 rounded border border-slate-700 overflow-hidden flex-shrink-0">
                <div
                    className="p-2 bg-slate-800 flex justify-between items-center cursor-pointer hover:bg-slate-700 transition-colors"
                    onClick={() => setCreationMode(!creationMode)}
                >
                    <span className="text-xs font-bold text-emerald-400 uppercase">🎁 Item Creator</span>
                    <span className="text-emerald-400 text-xs">{creationMode ? '▼' : '▶'}</span>
                </div>

                {creationMode && (
                    <div className="p-3 bg-slate-900 border-t border-slate-700 space-y-2 animate-in slide-in-from-top-2">
                        <div className="flex gap-2">
                            <input
                                placeholder="Item Name"
                                className="flex-1 bg-slate-800 text-xs p-2 rounded border border-slate-600 text-white outline-none focus:border-emerald-500"
                                value={newItem.name}
                                onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                            />
                            <select
                                className="w-1/3 bg-slate-800 text-xs p-2 rounded border border-slate-600 text-white outline-none"
                                value={newItem.type}
                                onChange={e => setNewItem({ ...newItem, type: e.target.value })}
                            >
                                <option value="MISC">📦 Misc</option>
                                <option value="WEAPON">⚔️ Wpn</option>
                                <option value="CONSUMABLE">🧪 Pot</option>
                                <option value="KEY">🗝️ Key</option>
                            </select>
                        </div>
                        <textarea
                            placeholder="Description..."
                            className="w-full bg-slate-800 text-xs p-2 rounded border border-slate-600 text-slate-300 resize-none h-16 outline-none focus:border-emerald-500"
                            value={newItem.description}
                            onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                        />
                        <div className="text-[10px] text-emerald-500/80 text-center italic">
                            Select "GIVE" on a player below to send this item
                        </div>
                    </div>
                )}
            </div>

            {/* 3. Player List & Actions - Scrollable */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0">
                <div className="space-y-3">
                    {players.map(player => (
                        <div key={player.id} className={`bg-slate-950 p-2 rounded border transition-all ${creationMode ? 'border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'border-slate-800'} flex flex-col gap-2`}>

                            {/* Player Header */}
                            <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                                <span className="text-xs font-bold text-slate-300">{player.name}</span>
                                {creationMode ? (
                                    <button
                                        onClick={() => handleCreateAndGive(player.id)}
                                        className="bg-emerald-600 hover:bg-emerald-500 text-black text-[9px] px-3 py-0.5 rounded font-bold transition-transform active:scale-95"
                                    >
                                        GIVE ITEM
                                    </button>
                                ) : (
                                    <span className="text-[9px] text-slate-500 uppercase">{player.role}</span>
                                )}
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