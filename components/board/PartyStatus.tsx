/* eslint-disable @next/next/no-img-element */
import React from 'react'

export const PartyStatus = ({ characters }: { characters: any[] }) => {
    return (
        <div className="space-y-3">
            {characters.map(char => (
                <div key={char.id} className="bg-slate-800/50 p-3 rounded-lg border border-slate-700 flex items-center gap-4 relative overflow-hidden">
                    {/* Portrait */}
                    <div className="relative shrink-0">
                        <img
                            src={char.avatarUrl}
                            className="w-14 h-14 rounded-full border-2 border-slate-500 object-cover"
                            alt={char.name}
                        />
                        {/* Level Badge */}
                        <div className="absolute -bottom-1 -right-1 bg-amber-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold border border-slate-900">1</div>
                    </div>

                    {/* Stats */}
                    <div className="flex-1 min-w-0 z-10">
                        <div className="flex justify-between items-baseline mb-1">
                            <span className="font-bold text-slate-200 text-sm truncate">{char.name}</span>
                            <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wide">GUARDING</span>
                        </div>

                        {/* HP Bar */}
                        <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-700/50">
                            <div className="bg-gradient-to-r from-green-600 to-green-400 h-full w-[85%]"></div>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                            <span>HP</span>
                            <span className="text-green-400 font-mono">85/100</span>
                        </div>
                    </div>

                    {/* Decorative BG effect */}
                    <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-slate-700/10 to-transparent pointer-events-none"></div>
                </div>
            ))}
        </div>
    )
}