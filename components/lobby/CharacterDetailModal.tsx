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

    // Parse character data
    const charData = typeof character === 'string' ? JSON.parse(character) : character
    const abilities = charData.abilities || {}
    const skills = charData.skills || []
    const equipment = charData.equipment || []

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
                        src={charData.avatarUrl || '/placeholder.jpg'}
                        alt={charData.name}
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
                        <h2 className="text-4xl font-black text-white mb-2">
                            {charData.name}
                        </h2>
                        <p className="text-amber-400 font-bold text-lg">
                            {charData.class} • Level {charData.level || 1}
                        </p>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Description */}
                    {charData.description && (
                        <div>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <span>📜</span> Background
                            </h3>
                            <p className="text-slate-300 leading-relaxed">
                                {charData.description}
                            </p>
                        </div>
                    )}

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-4">
                        <StatBox label="HP" value={charData.hp || '—'} color="red" />
                        <StatBox label="AC" value={charData.ac || '—'} color="blue" />
                        <StatBox label="Speed" value={charData.speed || '30 ft'} color="green" />
                    </div>

                    {/* Ability Scores */}
                    {Object.keys(abilities).length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <span>⚡</span> Ability Scores
                            </h3>
                            <div className="grid grid-cols-6 gap-2">
                                {Object.entries(abilities).map(([key, value]) => (
                                    <AbilityScore key={key} name={key} value={value as number} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Skills */}
                    {skills.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <span>🎯</span> Skills
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {skills.map((skill: string, idx: number) => (
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

// Stat Box Component
function StatBox({ label, value, color }: { label: string; value: any; color: string }) {
    const colorClasses = {
        red: 'border-red-500/30 bg-red-900/10',
        blue: 'border-blue-500/30 bg-blue-900/10',
        green: 'border-emerald-500/30 bg-emerald-900/10'
    }

    return (
        <div className={`border-2 ${colorClasses[color as keyof typeof colorClasses]} rounded-xl p-4 text-center`}>
            <div className="text-3xl font-black text-white mb-1">{value}</div>
            <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">{label}</div>
        </div>
    )
}

// Ability Score Component
function AbilityScore({ name, value }: { name: string; value: number }) {
    const modifier = Math.floor((value - 10) / 2)
    const modifierStr = modifier >= 0 ? `+${modifier}` : `${modifier}`

    return (
        <div className="bg-slate-800 rounded-lg p-2 text-center border border-slate-700">
            <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">{name}</div>
            <div className="text-xl font-black text-white">{value}</div>
            <div className="text-xs text-amber-400 font-bold">{modifierStr}</div>
        </div>
    )
}
