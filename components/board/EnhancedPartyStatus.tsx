'use client'

import { useState } from 'react'
import { UserProfile } from '@/types/socket'

interface EnhancedPartyStatusProps {
    players: UserProfile[]
    scenes: { id: string; name: string; url: string }[]
    system: 'STANDARD' | 'ROLE_AND_ROLL' // ✅ รับค่า System มาเพื่อเปลี่ยน Dropdown
    onSetPrivateScene: (playerId: string, sceneId: string | null) => void
    onWhisper: (targetPlayerId: string, message: string) => void
    onGiveItem: (targetPlayerId: string, itemData: any, action: string) => void
    onRequestRoll?: (playerId: string, checkType: string, dc: number) => void
    onKickPlayer?: (playerId: string, playerName: string) => void
    onUpdateVitals?: (playerId: string, type: 'hp' | 'mp', delta: number) => void // ✅ New prop
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
    system, // ✅ ใช้ตัวแปรนี้กำหนด List Check
    onSetPrivateScene,
    onWhisper,
    onGiveItem,
    onRequestRoll,
    onKickPlayer,
    onUpdateVitals, // ✅ New prop
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
    const [expandedStats, setExpandedStats] = useState<string | null>(null)

    // ✅ CHECK LIST CONFIGURATION
    const STANDARD_CHECKS = ['STR', 'DEX', 'INT', 'WIS', 'CHA', 'CON']
    const RNR_CHECKS = [
        // Attributes
        'Strength', 'Dexterity', 'Toughness',
        'Intellect', 'Aptitude', 'Sanity',
        'Charm', 'Rhetoric', 'Ego',
        // Abilities (Optional - GM might want to check skills directly)
        'Brawl', 'Weapons', 'Search', 'Perception', 'Stealth'
    ]

    // ✅ เลือก List ตาม System
    const checkOptions = system === 'ROLE_AND_ROLL' ? RNR_CHECKS : STANDARD_CHECKS

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

                        {/* Player Header */}
                        <div className="p-3 flex items-center justify-between">
                            {/* Info Left */}
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-sm">
                                    {player.name?.charAt(0) || '?'}
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-slate-200">{(player as any).character?.name || player.characterName || player.name}</div>
                                    <div className="text-[10px] text-slate-500 uppercase">{player.name}</div>
                                </div>
                            </div>

                            {/* Actions Right */}
                            <div className="flex items-center gap-2">
                                {/* Give Button (In Creation Mode) */}
                                {creationMode && (
                                    <button
                                        onClick={() => handleCreateAndGive(player.id)}
                                        className="bg-emerald-600 hover:bg-emerald-500 text-black text-[9px] px-3 py-1.5 rounded font-bold transition-colors"
                                    >
                                        GIVE
                                    </button>
                                )}

                                {/* Manage Toggle */}
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

                                {/* Kick Button */}
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

                        {/* Expanded Controls */}
                        {isExpanded && (
                            <div className="p-3 pt-0 space-y-3 border-t border-slate-800 bg-slate-900/30">

                                {/* Stats Display */}
                                {(player as any).stats && (() => {
                                    // ✅ Detect character type and get correct values
                                    // ✅ Fix: Robust Auto-Detect Logic (Priority: RnR Vitals > Standard Root)
                                    const playerStats = (player as any).stats
                                    const hasVitals = !!(playerStats.vitals)
                                    const isRnR = hasVitals || (player as any).character?.sheetType === 'ROLE_AND_ROLL'

                                    // Use Nullish Coalescing to fallback correctly (0 is valid)
                                    const hp = isRnR ? (playerStats.vitals?.hp ?? playerStats.vitals?.health ?? 0) : (playerStats.hp ?? 0)
                                    const maxHp = isRnR ? (playerStats.vitals?.maxHp ?? playerStats.vitals?.maxHealth ?? 0) : (playerStats.maxHp ?? 0)
                                    const mp = isRnR ? (playerStats.vitals?.mental ?? 0) : (playerStats.mp ?? 0)
                                    const maxMp = isRnR ? (playerStats.vitals?.maxMental ?? 0) : (playerStats.maxMp ?? 0)
                                    const willPower = isRnR ? (playerStats.vitals?.willPower ?? 0) : (playerStats.willPower ?? playerStats.will ?? 0)

                                    return (
                                        <div className="space-y-2 mt-2">
                                            <div className="bg-slate-800 rounded p-2 border border-slate-700 space-y-1">
                                                {/* HP */}
                                                <div className="flex justify-between items-center gap-2">
                                                    <span className="text-[10px] text-slate-400 font-bold">HP</span>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[11px] text-green-400 font-mono font-bold">
                                                            {hp} / {maxHp}
                                                        </span>
                                                        <input
                                                            type="text"
                                                            placeholder="+/-"
                                                            className="w-14 h-5 bg-slate-950 border border-slate-600 rounded px-1 text-[10px] text-white text-center"
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    const value = parseInt((e.target as HTMLInputElement).value)
                                                                    if (!isNaN(value)) {
                                                                        onUpdateVitals?.(player.id, 'hp', value)
                                                                            ; (e.target as HTMLInputElement).value = ''
                                                                    }
                                                                }
                                                            }}
                                                        />
                                                        <button
                                                            onClick={(e) => {
                                                                const input = (e.target as HTMLElement).previousElementSibling as HTMLInputElement
                                                                const value = parseInt(input.value)
                                                                if (!isNaN(value)) {
                                                                    onUpdateVitals?.(player.id, 'hp', value)
                                                                    input.value = ''
                                                                }
                                                            }}
                                                            className="w-8 h-5 bg-amber-900/50 hover:bg-amber-800 text-amber-200 rounded text-[9px] font-bold"
                                                            title="Apply HP change (+/-)"
                                                        >
                                                            SET
                                                        </button>
                                                    </div>
                                                </div>
                                                {/* MP */}
                                                <div className="flex justify-between items-center gap-2">
                                                    <span className="text-[10px] text-slate-400 font-bold">MP</span>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[11px] text-blue-400 font-mono font-bold">
                                                            {mp} / {maxMp}
                                                        </span>
                                                        <input
                                                            type="text"
                                                            placeholder="+/-"
                                                            className="w-14 h-5 bg-slate-950 border border-slate-600 rounded px-1 text-[10px] text-white text-center"
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    const value = parseInt((e.target as HTMLInputElement).value)
                                                                    if (!isNaN(value)) {
                                                                        onUpdateVitals?.(player.id, 'mp', value)
                                                                            ; (e.target as HTMLInputElement).value = ''
                                                                    }
                                                                }
                                                            }}
                                                        />
                                                        <button
                                                            onClick={(e) => {
                                                                const input = (e.target as HTMLElement).previousElementSibling as HTMLInputElement
                                                                const value = parseInt(input.value)
                                                                if (!isNaN(value)) {
                                                                    onUpdateVitals?.(player.id, 'mp', value)
                                                                    input.value = ''
                                                                }
                                                            }}
                                                            className="w-8 h-5 bg-amber-900/50 hover:bg-amber-800 text-amber-200 rounded text-[9px] font-bold"
                                                            title="Apply MP change (+/-)"
                                                        >
                                                            SET
                                                        </button>
                                                    </div>
                                                </div>
                                                {/* WILL POWER */}
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] text-slate-400 font-bold">WILL Power</span>
                                                    <span className="text-[11px] text-amber-400 font-mono font-bold">
                                                        {willPower}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })()}

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

                                    {/* Row 3: Roll Request (✅ Dynamic List based on Character Type) */}
                                    {onRequestRoll && (() => {
                                        try {
                                            // ✅ เช็ค Character Type ของแต่ละ Player
                                            const playerCharType = (player as any).character?.sheetType || 'STANDARD'
                                            const playerCheckOptions = playerCharType === 'ROLE_AND_ROLL' ? RNR_CHECKS : STANDARD_CHECKS

                                            return (
                                                <div className="flex gap-2 items-center">
                                                    <div className="w-6 text-[10px] text-slate-500 font-bold text-right">REQ</div>
                                                    <select
                                                        className="flex-1 bg-slate-950 text-slate-300 text-[10px] p-1.5 rounded border border-slate-700 outline-none"
                                                        value={selectedChecks[player.id] || playerCheckOptions[0]}
                                                        onChange={(e) => handleCheckSelect(player.id, e.target.value)}
                                                    >
                                                        {playerCheckOptions.map(stat => (
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
                                                        onClick={() => {
                                                            try {
                                                                const selectedStat = selectedChecks[player.id] || playerCheckOptions[0]
                                                                const checkType = `${selectedStat} Check`
                                                                console.log('🎲 GM Roll Button Clicked:', { playerId: player.id, checkType, dc: dcs[player.id] || 15 })
                                                                onRequestRoll(player.id, checkType, dcs[player.id] || 15)
                                                            } catch (error) {
                                                                console.error('❌ Roll button error:', error)
                                                            }
                                                        }}
                                                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-black text-[9px] font-bold rounded"
                                                    >
                                                        ROLL
                                                    </button>
                                                </div>
                                            )
                                        } catch (error) {
                                            console.error('❌ Roll UI render error:', error)
                                            return <div className="text-red-500 text-xs">Error rendering roll UI</div>
                                        }
                                    })()}
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