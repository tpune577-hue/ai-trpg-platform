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

    const handleWhisperChange = (playerId: string, value: string) => {
        setWhisperInputs(prev => ({ ...prev, [playerId]: value }))
    }

    const handleSceneSelect = (playerId: string, sceneId: string) => {
        setSelectedScenes(prev => ({ ...prev, [playerId]: sceneId }))
    }

    const handleCheckSelect = (playerId: string, checkType: string) => {
        setSelectedChecks(prev => ({ ...prev, [playerId]: checkType }))
    }

    const handleDcChange = (playerId: string, dc: number) => {
        setDcs(prev => ({ ...prev, [playerId]: dc }))
    }

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
            {/* Item Creator */}
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
                            Click "GIVE" on a player below to send this item
                        </div>
                    </div>
                )}
            </div>

            {/* Player Cards */}
            {players.map(player => {
                const isExpanded = expandedPlayer === player.id

                return (
                    <div key={player.id} className={`bg-slate-950 rounded border transition-all ${creationMode ? 'border-emerald-500/30' : 'border-slate-800'}`}>
                        {/* Player Header - Always Visible */}
                        <div
                            className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-900/50"
                            onClick={() => setExpandedPlayer(isExpanded ? null : player.id)}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-sm">
                                    {player.name?.charAt(0) || '?'}
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-slate-200">{player.name}</div>
                                    <div className="text-[10px] text-slate-500 uppercase">{player.role || 'Adventurer'}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {creationMode && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleCreateAndGive(player.id)
                                        }}
                                        className="bg-emerald-600 hover:bg-emerald-500 text-black text-[9px] px-3 py-1 rounded font-bold"
                                    >
                                        GIVE
                                    </button>
                                )}
                                <span className="text-slate-500 text-xs">{isExpanded ? '▼' : '▶'}</span>
                            </div>
                        </div>

                        {/* Expanded Controls */}
                        {isExpanded && (
                            <div className="p-3 pt-0 space-y-2 border-t border-slate-800">
                                {/* Stats (if available) */}
                                {player.stats && (
                                    <div className="grid grid-cols-3 gap-2 mb-2">
                                        {Object.entries(player.stats).map(([key, val]) => (
                                            <div key={key} className="bg-slate-800/50 rounded flex flex-col items-center p-1">
                                                <span className="text-[8px] text-slate-500 font-bold uppercase">{key}</span>
                                                <span className="text-[10px] text-amber-100 font-mono font-bold">{val as number}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

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
                                {onRequestRoll && (
                                    <div className="flex gap-1 items-center">
                                        <select
                                            className="flex-1 bg-slate-900 text-slate-300 text-[10px] p-1 rounded border border-slate-700 outline-none"
                                            value={selectedChecks[player.id] || 'STR'}
                                            onChange={(e) => handleCheckSelect(player.id, e.target.value)}
                                        >
                                            <option value="STR">STR Check</option>
                                            <option value="DEX">DEX Check</option>
                                            <option value="INT">INT Check</option>
                                            <option value="WIS">WIS Check</option>
                                            <option value="CHA">CHA Check</option>
                                            <option value="CON">CON Check</option>
                                        </select>
                                        <input
                                            type="number"
                                            min="1"
                                            max="30"
                                            placeholder="DC"
                                            className="w-12 bg-slate-900 text-slate-300 text-[10px] p-1 rounded border border-slate-700 outline-none text-center"
                                            value={dcs[player.id] || 15}
                                            onChange={(e) => handleDcChange(player.id, parseInt(e.target.value) || 15)}
                                        />
                                        <button
                                            onClick={() => onRequestRoll(player.id, selectedChecks[player.id] || 'STR', dcs[player.id] || 15)}
                                            className="px-2 py-1 bg-purple-900/40 hover:bg-purple-800 text-purple-200 text-[9px] font-bold rounded border border-purple-800/50"
                                        >
                                            🎲 ROLL
                                        </button>
                                    </div>
                                )}

                                {/* Player Inventory */}
                                <div className="mt-2 pt-2 border-t border-slate-800">
                                    <div className="text-[9px] text-slate-500 font-bold uppercase mb-1">Inventory</div>
                                    <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                                        {(playerInventories[player.id] || []).length === 0 ? (
                                            <div className="text-[10px] text-slate-600 italic text-center py-2">No items</div>
                                        ) : (
                                            (playerInventories[player.id] || []).map((item: any) => (
                                                <div key={item.id} className="flex items-center justify-between bg-slate-900/50 p-1 rounded">
                                                    <span className="text-[10px] text-slate-300 flex-1 truncate">{item.icon || '📦'} {item.name}</span>
                                                    <button
                                                        onClick={() => onGiveItem(player.id, item, 'REMOVE')}
                                                        className="px-1.5 py-0.5 bg-red-900/40 hover:bg-red-800 text-red-200 text-[8px] font-bold rounded"
                                                    >
                                                        REMOVE
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
                <div className="text-center text-slate-600 text-xs py-8 italic">No heroes yet...</div>
            )}
        </div>
    )
}
