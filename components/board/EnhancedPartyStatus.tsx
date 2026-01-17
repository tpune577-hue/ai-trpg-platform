'use client'

import { useState } from 'react'
import { UserProfile } from '@/types/socket'

interface EnhancedPartyStatusProps {
    players: UserProfile[]
    scenes: { id: string; name: string; url: string }[]
    onSetPrivateScene: (playerId: string, sceneId: string | null) => void
    onWhisper: (targetPlayerId: string, message: string) => void
    onGiveItem: (targetPlayerId: string, itemData: any, action: string) => void
    onRequestRoll?: (playerId: string, checkType: string, dc: number) => void
    onKickPlayer?: (playerId: string, playerName: string) => void
    playerInventories?: Record<string, any[]>
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

export function EnhancedPartyStatus({
    players,
    scenes,
    onSetPrivateScene,
    onWhisper,
    onGiveItem,
    onRequestRoll,
    onKickPlayer,
    playerInventories = {}
}: EnhancedPartyStatusProps) {
    const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null)
    const [whisperInputs, setWhisperInputs] = useState<Record<string, string>>({})
    const [selectedScenes, setSelectedScenes] = useState<Record<string, string>>({})
    const [selectedChecks, setSelectedChecks] = useState<Record<string, string>>({})
    const [dcs, setDcs] = useState<Record<string, number>>({})

    // Item Creator State
    const [creationMode, setCreationMode] = useState(false)
    const [newItem, setNewItem] = useState({ name: '', description: '', type: 'MISC' })

    const handleWhisperChange = (playerId: string, value: string) => setWhisperInputs(prev => ({ ...prev, [playerId]: value }))
    const handleSceneSelect = (playerId: string, sceneId: string) => setSelectedScenes(prev => ({ ...prev, [playerId]: sceneId }))
    const handleCheckSelect = (playerId: string, checkType: string) => setSelectedChecks(prev => ({ ...prev, [playerId]: checkType }))
    const handleDcChange = (playerId: string, dc: number) => setDcs(prev => ({ ...prev, [playerId]: dc }))

    const sendWhisper = (playerId: string) => {
        const msg = whisperInputs[playerId]
        if (!msg?.trim()) return
        onWhisper(playerId, msg)
        setWhisperInputs(prev => ({ ...prev, [playerId]: '' }))
    }

    const handleCreateAndGive = (targetPlayerId: string) => {
        if (!newItem.name) return;
        const customItem = {
            id: `custom-${Date.now()}`,
            name: newItem.name,
            description: newItem.description || 'A mysterious item.',
            type: newItem.type,
            icon: getItemIcon(newItem.type)
        }
        onGiveItem(targetPlayerId, customItem, 'GIVE_CUSTOM')
    }

    return (
        <div className="space-y-3">
            {/* Item Creator (คงเดิม) */}
            <div className="bg-slate-800 rounded border border-slate-700 overflow-hidden flex-shrink-0">
                <div
                    className="p-2 bg-slate-800 flex justify-between items-center cursor-pointer hover:bg-slate-700 transition-colors"
                    onClick={() => setCreationMode(!creationMode)}
                >
                    <span className="text-xs font-bold text-emerald-400 uppercase">🎁 Item Creator</span>
                    <span className="text-emerald-400 text-xs">{creationMode ? '▼' : '▶'}</span>
                </div>

                {creationMode && (
                    <div className="p-3 bg-slate-900 border-t border-slate-700 space-y-2">
                        <div className="flex gap-2">
                            <input placeholder="Item Name" className="flex-1 bg-slate-800 text-xs p-2 rounded border border-slate-600 text-white outline-none focus:border-emerald-500" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
                            <select className="w-1/3 bg-slate-800 text-xs p-2 rounded border border-slate-600 text-white outline-none" value={newItem.type} onChange={e => setNewItem({ ...newItem, type: e.target.value })}>
                                <option value="MISC">📦 Misc</option>
                                <option value="WEAPON">⚔️ Wpn</option>
                                <option value="CONSUMABLE">🧪 Pot</option>
                                <option value="KEY">🗝️ Key</option>
                            </select>
                        </div>
                        <textarea placeholder="Description..." className="w-full bg-slate-800 text-xs p-2 rounded border border-slate-600 text-slate-300 resize-none h-16 outline-none focus:border-emerald-500" value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} />
                    </div>
                )}
            </div>

            {/* Player Cards */}
            {players.map(player => {
                const isExpanded = expandedPlayer === player.id
                const isGM = player.role === 'GM'

                return (
                    <div key={player.id} className={`bg-slate-950 rounded border transition-all ${isExpanded ? 'border-amber-500/50' : 'border-slate-800'}`}>

                        {/* ✅ Player Header: ปรับใหม่ตาม Requirement */}
                        <div className="p-3 flex items-center justify-between">

                            {/* Info Left */}
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-sm">
                                    {player.name?.charAt(0) || '?'}
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-slate-200">{player.name}</div>
                                    <div className="text-[10px] text-slate-500 uppercase">{player.role || 'Adventurer'}</div>
                                </div>
                            </div>

                            {/* Actions Right (ปุ่มแยกกันชัดเจน) */}
                            <div className="flex items-center gap-2">

                                {/* 🎁 ปุ่ม Give (ถ้าเปิดโหมดสร้างไอเทม) */}
                                {creationMode && (
                                    <button
                                        onClick={() => handleCreateAndGive(player.id)}
                                        className="bg-emerald-600 hover:bg-emerald-500 text-black text-[9px] px-3 py-1.5 rounded font-bold transition-colors"
                                    >
                                        GIVE
                                    </button>
                                )}

                                {/* ⚙️ 1. ปุ่ม Manage Player (Toggle View) */}
                                <button
                                    onClick={() => setExpandedPlayer(isExpanded ? null : player.id)}
                                    className={`
                                        flex items-center gap-1 px-3 py-1.5 rounded text-[10px] font-bold border transition-colors
                                        ${isExpanded
                                            ? 'bg-amber-900/30 text-amber-400 border-amber-700 hover:bg-amber-900/50'
                                            : 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700 hover:text-white'}
                                    `}
                                >
                                    <span>{isExpanded ? '▼' : '⚙️'}</span>
                                    <span>MANAGE</span>
                                </button>

                                {/* 🚫 2. ปุ่ม Kick Player (แยกออกมา) */}
                                {!isGM && onKickPlayer && (
                                    <button
                                        onClick={() => onKickPlayer(player.id, player.name || 'Player')}
                                        className="bg-red-900/20 hover:bg-red-600 text-red-500 hover:text-white border border-red-900/50 hover:border-red-500 px-3 py-1.5 rounded text-[10px] font-bold transition-all"
                                        title="Kick Player"
                                    >
                                        KICK
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Expanded Controls (เนื้อหาข้างในเหมือนเดิม) */}
                        {isExpanded && (
                            <div className="p-3 pt-0 space-y-3 border-t border-slate-800 bg-slate-900/30">

                                {/* Stats Display */}
                                {player.stats && (
                                    <div className="grid grid-cols-3 gap-2 mt-2">
                                        {Object.entries(player.stats).map(([key, val]) => (
                                            <div key={key} className="bg-slate-800 rounded flex flex-col items-center p-1 border border-slate-700">
                                                <span className="text-[8px] text-slate-500 font-bold uppercase">{key}</span>
                                                <span className="text-[10px] text-amber-100 font-mono font-bold">{val as number}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Action Buttons Group */}
                                <div className="space-y-2">

                                    {/* Row 1: Scene & Move */}
                                    <div className="flex gap-2 items-center">
                                        <div className="w-6 text-[10px] text-slate-500 font-bold text-right">LOC</div>
                                        <select
                                            className="flex-1 bg-slate-950 text-slate-300 text-[10px] p-1.5 rounded border border-slate-700 outline-none"
                                            value={selectedScenes[player.id] || ''}
                                            onChange={(e) => handleSceneSelect(player.id, e.target.value)}
                                        >
                                            <option value="">Default Scene</option>
                                            {scenes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                        <button
                                            onClick={() => onSetPrivateScene(player.id, selectedScenes[player.id] || null)}
                                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[9px] font-bold rounded"
                                        >
                                            MOVE
                                        </button>
                                    </div>

                                    {/* Row 2: Whisper */}
                                    <div className="flex gap-2 items-center">
                                        <div className="w-6 text-[10px] text-slate-500 font-bold text-right">MSG</div>
                                        <input
                                            type="text"
                                            placeholder="Private message..."
                                            className="flex-1 bg-slate-950 text-slate-300 text-[10px] p-1.5 rounded border border-slate-700 outline-none"
                                            value={whisperInputs[player.id] || ''}
                                            onChange={(e) => handleWhisperChange(player.id, e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && sendWhisper(player.id)}
                                        />
                                        <button
                                            onClick={() => sendWhisper(player.id)}
                                            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-[9px] font-bold rounded"
                                        >
                                            SEND
                                        </button>
                                    </div>

                                    {/* Row 3: Roll Request */}
                                    {onRequestRoll && (
                                        <div className="flex gap-2 items-center">
                                            <div className="w-6 text-[10px] text-slate-500 font-bold text-right">REQ</div>
                                            <select
                                                className="flex-1 bg-slate-950 text-slate-300 text-[10px] p-1.5 rounded border border-slate-700 outline-none"
                                                value={selectedChecks[player.id] || 'STR'}
                                                onChange={(e) => handleCheckSelect(player.id, e.target.value)}
                                            >
                                                {['STR', 'DEX', 'INT', 'WIS', 'CHA', 'CON'].map(stat => (
                                                    <option key={stat} value={stat}>{stat} Check</option>
                                                ))}
                                            </select>
                                            <input
                                                type="number"
                                                placeholder="DC"
                                                className="w-10 bg-slate-950 text-slate-300 text-[10px] p-1.5 rounded border border-slate-700 outline-none text-center"
                                                value={dcs[player.id] || 15}
                                                onChange={(e) => handleDcChange(player.id, parseInt(e.target.value) || 15)}
                                            />
                                            <button
                                                onClick={() => onRequestRoll(player.id, selectedChecks[player.id] || 'STR', dcs[player.id] || 15)}
                                                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-black text-[9px] font-bold rounded"
                                            >
                                                ROLL
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Inventory Section */}
                                <div className="mt-2 pt-2 border-t border-slate-800">
                                    <div className="text-[9px] text-slate-500 font-bold uppercase mb-2 ml-1">🎒 Inventory</div>
                                    <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar bg-slate-950/50 rounded p-1">
                                        {(playerInventories[player.id] || []).length === 0 ? (
                                            <div className="text-[10px] text-slate-600 italic text-center py-2">Empty Pockets</div>
                                        ) : (
                                            (playerInventories[player.id] || []).map((item: any) => (
                                                <div key={item.id} className="flex items-center justify-between bg-slate-900 p-1.5 rounded border border-slate-800">
                                                    <span className="text-[10px] text-slate-300 flex-1 truncate flex items-center gap-2">
                                                        <span>{item.icon || '📦'}</span>
                                                        {item.name}
                                                    </span>
                                                    <button
                                                        onClick={() => onGiveItem(player.id, item, 'REMOVE')}
                                                        className="px-2 py-0.5 bg-red-900/30 hover:bg-red-800 text-red-400 hover:text-white text-[8px] font-bold rounded transition-colors"
                                                    >
                                                        DEL
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )
            })}

            {players.length === 0 && (
                <div className="text-center text-slate-600 text-xs py-8 italic border-2 border-dashed border-slate-800 rounded">
                    Waiting for players to join...
                </div>
            )}
        </div>
    )
}