import React, { useEffect, useRef } from 'react'

interface GameLogProps {
    logs: any[]
    onAnnounce?: (log: any) => void
}

export const GameLog = ({ logs, onAnnounce }: GameLogProps) => {
    const scrollRef = useRef<HTMLDivElement>(null)

    // Filter duplicate logs by ID
    const uniqueLogs = logs.filter((log, index, self) =>
        index === self.findIndex((t) => t.id === log.id)
    )

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }, [uniqueLogs])

    return (
        <div ref={scrollRef} className="h-full overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {uniqueLogs.map((log) => {
                // Ensure timestamp is a valid Date object
                const timestamp = log.timestamp instanceof Date
                    ? log.timestamp
                    : (log.timestamp ? new Date(log.timestamp) : new Date())

                const timeStr = timestamp.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                })

                // ✅ Check if it's an RnR Roll log
                const isRnR = log.content && (log.content.includes('Role & Roll') || log.type === 'rnr_roll')

                // Determine Log Style
                let logStyle = 'bg-slate-800/50 border-l-2 border-slate-600'
                if (log.type === 'DICE' || isRnR) logStyle = 'bg-purple-900/30 border-l-2 border-purple-500'
                else if (log.type === 'WHISPER') logStyle = 'bg-indigo-900/30 border-l-2 border-indigo-500'
                else if (log.type === 'SYSTEM') logStyle = 'bg-emerald-900/30 border-l-2 border-emerald-500'
                else if (log.type === 'NARRATION') logStyle = 'bg-amber-900/30 border-l-2 border-amber-500'

                return (
                    <div key={log.id} className={`p-2 rounded text-xs ${logStyle} relative group`}>

                        {/* Header */}
                        <div className="flex justify-between items-start gap-2 mb-1">
                            <span className="font-bold text-slate-400 text-[10px]">{log.senderName || 'System'}</span>
                            <span className="text-slate-500 text-[9px]">{timeStr}</span>
                        </div>

                        {/* Content */}
                        <div className="text-slate-200 leading-relaxed">
                            {isRnR ? (
                                <div>
                                    <span className="text-amber-400 font-bold">🎲 Role & Roll Check</span>
                                    {/* ถ้ามีคะแนนรวมใน Content ให้ทำตัวหนา (Regex ดึงตัวเลขหลัง :) */}
                                    <div className="mt-1 text-sm">
                                        Result: <span className="font-black text-white text-base">{log.total || log.content.split(':').pop()}</span>
                                    </div>
                                </div>
                            ) : (
                                log.content
                            )}
                        </div>

                        {/* Announce Button (Only for GM/Narrations) */}
                        {onAnnounce && log.type !== 'SYSTEM' && (
                            <button
                                onClick={() => onAnnounce(log)}
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-700 text-[10px] px-1.5 rounded hover:bg-amber-600 text-white"
                                title="Announce to Screen"
                            >
                                📢
                            </button>
                        )}
                    </div>
                )
            })}
        </div>
    )
}