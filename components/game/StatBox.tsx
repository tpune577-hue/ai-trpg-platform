import React from 'react'

interface StatBoxProps {
    label: string
    value: number
}

export default function StatBox({ label, value }: StatBoxProps) {
    const modifier = Math.floor((value - 10) / 2)
    const modString = modifier >= 0 ? `+${modifier}` : `${modifier}`

    return (
        <div className="bg-slate-950 rounded-lg p-2 text-center border border-slate-600 flex flex-col justify-center items-center">
            <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">{label}</div>
            <div className="text-2xl font-black text-white leading-none">{value}</div>
            <div className={`text-xs font-bold mt-1 px-2 rounded ${modifier >= 0 ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                {modString}
            </div>
        </div>
    )
}
