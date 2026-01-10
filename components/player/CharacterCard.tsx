'use client'

interface CharacterCardProps {
    name: string
    className: string
    level: number
    hp: number
    maxHp: number
    avatarUrl?: string
    status?: 'healthy' | 'wounded' | 'critical' | 'unconscious'
}

export default function CharacterCard({
    name,
    className,
    level,
    hp,
    maxHp,
    avatarUrl,
    status = 'healthy',
}: CharacterCardProps) {
    const hpPercentage = Math.max(0, Math.min(100, (hp / maxHp) * 100))

    const getHpColor = () => {
        if (hpPercentage > 70) return 'from-emerald-500 to-emerald-600'
        if (hpPercentage > 40) return 'from-amber-500 to-amber-600'
        if (hpPercentage > 20) return 'from-orange-500 to-orange-600'
        return 'from-red-500 to-red-600'
    }

    const getStatusColor = () => {
        switch (status) {
            case 'healthy':
                return 'text-emerald-400'
            case 'wounded':
                return 'text-amber-400'
            case 'critical':
                return 'text-orange-400'
            case 'unconscious':
                return 'text-red-400'
            default:
                return 'text-gray-400'
        }
    }

    const getStatusIcon = () => {
        switch (status) {
            case 'healthy':
                return '❤️'
            case 'wounded':
                return '🩹'
            case 'critical':
                return '⚠️'
            case 'unconscious':
                return '💀'
            default:
                return '●'
        }
    }

    return (
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border-2 border-amber-500/30 p-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                {/* Avatar */}
                <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-amber-500/50 border-4 border-slate-900">
                        {avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt={name}
                                className="w-full h-full rounded-full object-cover"
                            />
                        ) : (
                            name.charAt(0).toUpperCase()
                        )}
                    </div>
                    {/* Status badge */}
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center border-2 border-amber-500/50">
                        <span className="text-lg">{getStatusIcon()}</span>
                    </div>
                </div>

                {/* Character Info */}
                <div className="flex-1 min-w-0">
                    <h1 className="text-2xl font-bold text-white truncate mb-1">{name}</h1>
                    <div className="flex items-center gap-3 text-sm">
                        <span className="text-amber-400 font-semibold">{className}</span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-300">Level {level}</span>
                    </div>
                    <div className="mt-1">
                        <span className={`text-sm font-semibold uppercase tracking-wide ${getStatusColor()}`}>
                            {status}
                        </span>
                    </div>
                </div>
            </div>

            {/* HP Bar */}
            <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400 font-medium">Health Points</span>
                    <span className="text-white font-bold">
                        {hp} / {maxHp}
                    </span>
                </div>

                {/* HP Progress Bar */}
                <div className="relative h-4 bg-slate-950/80 rounded-full overflow-hidden border border-slate-700/50 shadow-inner">
                    <div
                        className={`h-full bg-gradient-to-r ${getHpColor()} transition-all duration-500 ease-out relative`}
                        style={{ width: `${hpPercentage}%` }}
                    >
                        {/* Shine effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                    </div>

                    {/* HP Text Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                            {Math.round(hpPercentage)}%
                        </span>
                    </div>
                </div>
            </div>

            {/* Quick Stats (Optional) */}
            <div className="mt-4 pt-4 border-t border-slate-700/50 grid grid-cols-3 gap-3">
                <div className="text-center">
                    <div className="text-xs text-gray-400 mb-1">AC</div>
                    <div className="text-lg font-bold text-white">15</div>
                </div>
                <div className="text-center">
                    <div className="text-xs text-gray-400 mb-1">Initiative</div>
                    <div className="text-lg font-bold text-white">+3</div>
                </div>
                <div className="text-center">
                    <div className="text-xs text-gray-400 mb-1">Speed</div>
                    <div className="text-lg font-bold text-white">30ft</div>
                </div>
            </div>
        </div>
    )
}
