'use client'

interface CharacterDetailModalProps {
    character: any
    isOpen: boolean
    onClose: () => void
    onSelect: () => void
    isSelected: boolean
}

export default function CharacterDetailModal({
    character,
    isOpen,
    onClose,
    onSelect,
    isSelected
}: CharacterDetailModalProps) {
    if (!isOpen || !character) return null

    // --------------------------------------------------------
    // ✅ Logic การ parse stats ที่แม่นยำขึ้น (Updated for CharacterCreator compatibility)
    // --------------------------------------------------------

    // 1. Base Data
    let charData = typeof character === 'string' ? JSON.parse(character) : character || {}

    // Support legacy/root level stats
    let rawStats: any = charData.stats || charData // default to charData if no stats field

    // Handle JSON string case for stats
    if (typeof rawStats === 'string') {
        try { rawStats = JSON.parse(rawStats) } catch (e) { console.error('Parse rawStats error', e) }
    }

    // 2. Detect System Type
    // Use explicit sheetType from creator, or fallback to heuristics
    const sheetType = charData.sheetType || rawStats.sheetType || 'STANDARD'
    const isRnR = sheetType === 'ROLE_AND_ROLL'

    // 3. Extract Stats & Attributes based on System
    let hp = 0, mp = 0, wp = 0, mental = 0
    let displayAttributes: any = {}
    let displayAbilities: any = {} // ✅ New: For RnR Abilities

    if (isRnR) {
        // --- Role & Roll ---
        // Vitals are usually in 'vitals' object root or inside stats
        const vitals = charData.vitals || rawStats.vitals || rawStats

        hp = Number(vitals.health || vitals.maxHealth || vitals.hp || 0)
        mental = Number(vitals.mental || vitals.maxMental || 0)
        wp = Number(vitals.willPower || vitals.wp || 0)

        // Attributes are in 'attributes' object
        displayAttributes = charData.attributes || rawStats.attributes || {}
        displayAbilities = charData.abilities || rawStats.abilities || {} // ✅ Extract Abilities
    } else {
        // --- Standard (D&D) ---
        // Stats are inline in the stats object
        hp = Number(rawStats.hp || rawStats.maxHp || 0)
        mp = Number(rawStats.mp || rawStats.maxMp || 0)
        wp = Number(rawStats.willPower || rawStats.wp || 0)

        // Attributes
        if (rawStats.abilities) {
            displayAttributes = rawStats.abilities
        } else {
            const { str, dex, int, wis, cha, con } = rawStats
            if (str !== undefined) displayAttributes['STR'] = str
            if (dex !== undefined) displayAttributes['DEX'] = dex
            if (int !== undefined) displayAttributes['INT'] = int
            if (wis !== undefined) displayAttributes['WIS'] = wis
            if (cha !== undefined) displayAttributes['CHA'] = cha
            if (con !== undefined) displayAttributes['CON'] = con
        }
    }

    // Fallback for description
    const description = charData.bio?.description || charData.description || rawStats.description || charData.bio || ''

    // Skills (Legacy/Generic) -> For Standard, abilities might be standard skills? 
    const legacySkills = charData.skills || rawStats.skills || rawStats.Skills || []
    const equipment = charData.equipment || rawStats.equipment || rawStats.Equipment || []

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 border-slate-700 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header with Image */}
                <div className="relative h-64 bg-black">
                    <img
                        src={charData.avatarUrl || charData.imageUrl || '/placeholder.jpg'}
                        alt={charData.name || 'Character'}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 bg-black/70 hover:bg-black text-white p-2 rounded-lg transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {/* Character Name Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                        <div className="flex justify-between items-end">
                            <div>
                                <h2 className="text-4xl font-black text-white mb-2">
                                    {charData.name || 'Unknown'}
                                </h2>
                                <p className="text-amber-400 font-bold text-lg">
                                    {charData.class || 'Adventurer'}
                                </p>
                            </div>
                            <span className={`px-3 py-1 rounded text-xs font-bold border ${isRnR ? 'bg-amber-900/50 text-amber-500 border-amber-500/50' : 'bg-blue-900/50 text-blue-400 border-blue-500/50'}`}>
                                {isRnR ? 'ROLE & ROLL' : 'STANDARD RPG'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Description */}
                    {description && (
                        typeof description === 'string' ? (
                            <div>
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <span>📜</span> Background
                                </h3>
                                <p className="text-slate-300 leading-relaxed">
                                    {description}
                                </p>
                            </div>
                        ) : null
                    )}

                    {/* Stats List */}
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <span>📊</span> Status
                        </h3>
                        <div className="space-y-3">
                            <StatBar label="HP" value={hp} max={hp} color="red" icon="❤️" />
                            {isRnR ? (
                                <>
                                    <StatBar label="Mental" value={mental} max={mental} color="blue" icon="🧠" />
                                    <StatBar label="Will Power" value={wp} max={wp} color="purple" icon="🔥" />
                                </>
                            ) : (
                                <>
                                    <StatBar label="MP" value={mp} max={mp} color="blue" icon="💧" />
                                    <StatBar label="Will Power" value={wp} max={wp} color="purple" icon="✨" />
                                </>
                            )}
                        </div>
                    </div>

                    {/* Attributes */}
                    {Object.keys(displayAttributes).length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <span>⚡</span> {isRnR ? 'Attributes' : 'Ability Scores'}
                            </h3>
                            <div className="bg-slate-800/30 rounded-xl border border-slate-700 divide-y divide-slate-700/50">
                                {Object.entries(displayAttributes).map(([key, value]) => (
                                    <AbilityRow key={key} name={key} value={value as number} isRnR={isRnR} isAttribute={true} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* RnR Abilities (Skills) */}
                    {isRnR && Object.keys(displayAbilities).length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <span>🎯</span> Abilities
                            </h3>
                            <div className="bg-slate-800/30 rounded-xl border border-slate-700 divide-y divide-slate-700/50">
                                {Object.entries(displayAbilities).map(([key, value]) => (
                                    <AbilityRow key={key} name={key} value={value as number} isRnR={true} isAttribute={false} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Generic Skills (Legacy) */}
                    {legacySkills.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <span>🎯</span> Skills
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {legacySkills.map((skill: string, idx: number) => (
                                    <span
                                        key={idx}
                                        className="px-3 py-1 bg-slate-800 text-slate-300 text-sm rounded-full"
                                    >
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Equipment */}
                    {equipment.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <span>⚔️</span> Equipment
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {equipment.map((item: string, idx: number) => (
                                    <span
                                        key={idx}
                                        className="px-3 py-1 bg-slate-800 text-slate-300 text-sm rounded-full"
                                    >
                                        {item}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Select Button */}
                    <button
                        onClick={onSelect}
                        className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${isSelected
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-black'
                            : 'bg-amber-500 hover:bg-amber-400 text-black'
                            }`}
                    >
                        {isSelected ? '✓ Selected' : 'Select This Character'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// Stat Bar Component 
function StatBar({ label, value, max, color, icon, suffix = '', isValueOnly = false }: {
    label: string;
    value: number;
    max: number;
    color: string;
    icon: string;
    suffix?: string;
    isValueOnly?: boolean;
}) {
    const colorClasses = {
        red: 'bg-red-500',
        blue: 'bg-blue-500',
        purple: 'bg-purple-500',
        green: 'bg-emerald-500'
    }

    // Calculate percentage (default to 100% if max is 0 to avoid div by zero)
    const percentage = max > 0 ? Math.min((value / max) * 100, 100) : (value > 0 ? 100 : 0)

    return (
        <div className="flex items-center gap-4">
            <div className="w-8 text-2xl text-center">{icon}</div>
            <div className="flex-1">
                <div className="flex justify-between items-end mb-1">
                    <span className="text-sm font-bold text-slate-300 uppercase tracking-wider">{label}</span>
                    <span className="text-sm font-black text-white">{value}{suffix} {max > 0 && `/ ${max}`}</span>
                </div>
                {!isValueOnly && (
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full ${colorClasses[color as keyof typeof colorClasses]}`}
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}

// Ability Row Component (List Layout, No Modifier)
function AbilityRow({ name, value, isRnR = false, isAttribute = false }: { name: string; value: number; isRnR?: boolean; isAttribute?: boolean }) {
    // Modifier calculation logic (Only for Standard D&D)
    // RnR uses direct values (Attributes)
    const modifier = Math.floor((value - 10) / 2)
    const modifierStr = modifier >= 0 ? `+${modifier}` : `${modifier}`

    // Scale for visualization
    // RnR Attributes: 0-6
    // RnR Abilities: 0-3
    // Standard Attributes: 0-20
    let maxVal = 20
    if (isRnR) {
        maxVal = isAttribute ? 6 : 3
    }

    const showModifier = !isRnR // Only show (+X) for Standard D&D
    const showProgressBar = !isRnR // Hide bar for ALL RnR items (Attributes & Abilities)

    return (
        <div className="flex justify-between items-center p-3 hover:bg-white/5 transition-colors">
            <span className="font-bold text-slate-300 uppercase tracking-wider text-sm pl-2">{name}</span>
            <div className="flex items-center gap-3">
                {/* Progress Bar visual for stat */}
                {showProgressBar && (
                    <div className="hidden sm:block w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full ${isRnR ? 'bg-cyan-500' : 'bg-slate-500'}`}
                            style={{ width: `${Math.min((value / maxVal) * 100, 100)}%` }}
                        />
                    </div>
                )}

                <div className="text-right w-16">
                    <span className={`text-lg font-black ${isRnR ? 'text-amber-400' : 'text-white'}`}>{value}</span>
                    {showModifier && (
                        <span className="text-xs text-amber-500 font-bold ml-2">({modifierStr})</span>
                    )}
                </div>
            </div>
        </div>
    )
}
