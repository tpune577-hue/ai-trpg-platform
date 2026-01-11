'use client'

/* eslint-disable @next/next/no-img-element */
import React, { useState } from 'react'

export const PartyStatus = ({ characters }: { characters: any[] }) => {
    // State เก็บ ID ของคนที่กำลังเปิดดู Stat อยู่ (null = ปิดหมด)
    const [expandedId, setExpandedId] = useState<string | null>(null)

    const toggleExpand = (id: string) => {
        // ถ้ากดตัวเดิมให้ปิด (Collapse), ถ้ากดตัวใหม่ให้เปิด (Expand)
        setExpandedId(prev => prev === id ? null : id)
    }

    return (
        <div className="space-y-3">
            {characters.map(char => {
                const isExpanded = expandedId === char.id

                return (
                    <div
                        key={char.id}
                        className={`
                        relative rounded-xl border transition-all cursor-pointer overflow-hidden
                        ${isExpanded
                                ? 'bg-slate-800 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                                : 'bg-slate-800/50 border-slate-700 hover:border-slate-500'}
                    `}
                        onClick={() => toggleExpand(char.id)}
                    >
                        {/* ส่วนหัวการ์ด (แสดงตลอดเวลา) */}
                        <div className="p-3 flex items-center gap-4">

                            {/* Avatar */}
                            <div className="relative shrink-0">
                                <img
                                    src={char.avatarUrl}
                                    className="w-12 h-12 rounded-full border-2 border-slate-500 object-cover bg-slate-700"
                                    alt={char.name}
                                />
                            </div>

                            {/* Basic Info (HP/MP) */}
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-1">
                                    <span className={`font-bold text-sm truncate transition-colors ${isExpanded ? 'text-amber-500' : 'text-slate-200'}`}>
                                        {char.name}
                                    </span>
                                    {/* ไอคอนลูกศร */}
                                    <span className="text-[10px] text-slate-500">
                                        {isExpanded ? '▲' : '▼'}
                                    </span>
                                </div>

                                {/* HP Bar */}
                                <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mb-1">
                                    <div
                                        className="bg-green-500 h-full transition-all duration-500"
                                        style={{ width: `${(char.hp / char.maxHp) * 100}%` }}
                                    ></div>
                                </div>
                                {/* MP Bar */}
                                <div className="w-full bg-slate-950 h-1 rounded-full overflow-hidden">
                                    <div
                                        className="bg-blue-500 h-full transition-all duration-500"
                                        style={{ width: `${(char.mp / char.maxMp) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>

                        {/* ส่วน Stats (แสดงเมื่อกด Expand) */}
                        {isExpanded && (
                            <div className="px-3 pb-3 pt-0 animate-in slide-in-from-top-2 duration-200 fade-in">
                                <div className="border-t border-slate-700/50 my-2"></div>

                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[10px] text-slate-400 uppercase tracking-widest">Attributes</span>
                                    <span className="text-[10px] text-slate-500">{char.role}</span>
                                </div>

                                <div className="grid grid-cols-3 gap-2 text-center">
                                    {Object.entries(char.stats || {}).map(([key, val]) => (
                                        <div key={key} className="bg-slate-900/50 rounded p-1.5 border border-slate-700 hover:border-amber-500/30 transition-colors">
                                            <div className="text-[8px] text-slate-500 uppercase font-bold">{key}</div>
                                            <div className="text-sm font-bold text-white">{val as number}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}