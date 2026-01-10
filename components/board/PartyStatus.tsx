'use client'

import { UserProfile } from '@/types/socket'
import { UserRole } from '@prisma/client'

interface PlayerStatus {
    profile: UserProfile
    hp: number
    maxHp: number
    isActive: boolean
    status?: 'healthy' | 'wounded' | 'critical' | 'unconscious'
    level?: number
    class?: string
}

interface PartyStatusProps {
    players: PlayerStatus[]
    gmProfile?: UserProfile
}

export default function PartyStatus({ players, gmProfile }: PartyStatusProps) {
    const getHpPercentage = (hp: number, maxHp: number) => {
        return Math.max(0, Math.min(100, (hp / maxHp) * 100))
    }

    const getHpColor = (percentage: number) => {
        if (percentage > 70) return 'bg-emerald-500'
        if (percentage > 40) return 'bg-amber-500'
        if (percentage > 20) return 'bg-orange-500'
        return 'bg-red-500'
    }

    const getStatusColor = (status?: string) => {
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

    const getStatusIcon = (status?: string) => {
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
        <div className="h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-l border-amber-500/30 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-amber-500/30 bg-gradient-to-r from-amber-900/20 to-transparent">
                <div className="flex items-center gap-2">
                    <svg
                        className="w-6 h-6 text-amber-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                    >
                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                    </svg>
                    <h2 className="text-xl font-bold text-amber-400 tracking-wide uppercase">
                        Party Status
                    </h2>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                    {players.filter((p) => p.isActive).length} / {players.length} Active
                </p>
            </div>

            {/* GM Info */}
            {gmProfile && (
                <div className="p-4 border-b border-purple-500/30 bg-gradient-to-r from-purple-900/20 to-transparent">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white font-bold shadow-lg shadow-purple-500/50">
                            {gmProfile.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-purple-300 truncate">
                                    {gmProfile.name}
                                </p>
                                <span className="px-2 py-0.5 text-xs font-bold bg-purple-500/20 text-purple-300 rounded border border-purple-500/30">
                                    GM
                                </span>
                            </div>
                            <p className="text-xs text-gray-400">Game Master</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Players List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-4 space-y-3">
                    {players.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-gray-500 text-sm">No players connected</p>
                        </div>
                    ) : (
                        players.map((player) => {
                            const hpPercentage = getHpPercentage(player.hp, player.maxHp)
                            const hpColor = getHpColor(hpPercentage)

                            return (
                                <div
                                    key={player.profile.id}
                                    className={`relative group transition-all duration-300 ${player.isActive
                                            ? 'opacity-100'
                                            : 'opacity-50 grayscale'
                                        }`}
                                >
                                    {/* Player Card */}
                                    <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-lg border border-slate-700/50 p-3 hover:border-amber-500/50 transition-all duration-300 backdrop-blur-sm">
                                        {/* Active indicator */}
                                        {player.isActive && (
                                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-500/50" />
                                        )}

                                        {/* Player Info */}
                                        <div className="flex items-start gap-3">
                                            {/* Avatar */}
                                            <div className="relative">
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white font-bold shadow-lg">
                                                    {player.profile.characterName?.charAt(0).toUpperCase() ||
                                                        player.profile.name.charAt(0).toUpperCase()}
                                                </div>
                                                {/* Status icon */}
                                                <div className="absolute -bottom-1 -right-1 text-lg">
                                                    {getStatusIcon(player.status)}
                                                </div>
                                            </div>

                                            {/* Details */}
                                            <div className="flex-1 min-w-0">
                                                {/* Name and Level */}
                                                <div className="flex items-center justify-between gap-2 mb-1">
                                                    <p className="text-sm font-bold text-gray-100 truncate">
                                                        {player.profile.characterName || player.profile.name}
                                                    </p>
                                                    {player.level && (
                                                        <span className="text-xs font-semibold text-amber-400">
                                                            Lv.{player.level}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Class */}
                                                {player.class && (
                                                    <p className="text-xs text-gray-400 mb-2">{player.class}</p>
                                                )}

                                                {/* HP Bar */}
                                                <div className="space-y-1">
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span className="text-gray-400">HP</span>
                                                        <span className={getStatusColor(player.status)}>
                                                            {player.hp} / {player.maxHp}
                                                        </span>
                                                    </div>
                                                    <div className="relative h-2 bg-slate-950/50 rounded-full overflow-hidden border border-slate-700/50">
                                                        <div
                                                            className={`h-full ${hpColor} transition-all duration-500 ease-out shadow-lg`}
                                                            style={{ width: `${hpPercentage}%` }}
                                                        >
                                                            {/* Shine effect */}
                                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Status */}
                                                {player.status && (
                                                    <div className="mt-2">
                                                        <span
                                                            className={`text-xs font-semibold uppercase tracking-wide ${getStatusColor(
                                                                player.status
                                                            )}`}
                                                        >
                                                            {player.status}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Hover glow effect */}
                                        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-amber-500/0 via-amber-500/5 to-amber-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>

            {/* Footer Stats */}
            <div className="p-4 border-t border-amber-500/30 bg-gradient-to-r from-amber-900/10 to-transparent">
                <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                        <p className="text-2xl font-bold text-emerald-400">
                            {players.filter((p) => p.status === 'healthy' || p.hp > p.maxHp * 0.7).length}
                        </p>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Healthy</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-red-400">
                            {players.filter((p) => p.status === 'critical' || p.status === 'unconscious').length}
                        </p>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Critical</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
