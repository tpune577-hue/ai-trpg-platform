import React, { useEffect, useRef } from 'react'

export const GameLog = ({ logs }: { logs: any[] }) => {
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

                return (
                    <div
                        key={log.id}
                        className={`p-2 rounded text-xs ${log.type === 'DICE' ? 'bg-purple-900/30 border-l-2 border-purple-500' :
                                log.type === 'WHISPER' ? 'bg-indigo-900/30 border-l-2 border-indigo-500' :
                                    log.type === 'SYSTEM' ? 'bg-emerald-900/30 border-l-2 border-emerald-500' :
                                        log.type === 'NARRATION' ? 'bg-amber-900/30 border-l-2 border-amber-500' :
                                            'bg-slate-800/50 border-l-2 border-slate-600'
                            }`}
                    >
                        <div className="flex justify-between items-start gap-2 mb-1">
                            <span className="font-bold text-slate-400 text-[10px]">{log.senderName || 'System'}</span>
                            <span className="text-slate-500 text-[9px]">{timeStr}</span>
                        </div>
                        <div className="text-slate-200 leading-relaxed">{log.content}</div>
                    </div>
                )
            })}
        </div>
    )
}