import React, { useEffect, useRef } from 'react'

export const GameLog = ({ logs }: { logs: any[] }) => {
    const scrollRef = useRef<HTMLDivElement>(null)

    // ✅ ขั้นตอนสำคัญ: กรองข้อความที่ ID ซ้ำกันทิ้งไป (เหลือไว้อันเดียว)
    // วิธีนี้แก้ปัญหา "Encountered two children with the same key" ได้ 100%
    const uniqueLogs = logs.filter((log, index, self) =>
        index === self.findIndex((t) => t.id === log.id)
    )

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }, [uniqueLogs]) // เปลี่ยน dependency เป็น uniqueLogs

    return (
        <div ref={scrollRef} className="h-full overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {uniqueLogs.map((log) => (
                <div key={log.id} className="text-sm font-mono flex gap-3 opacity-90 hover:opacity-100 transition-opacity">
                    <span className="text-slate-500 shrink-0">
                        [{new Date(log.createdAt).toLocaleTimeString([], { hour12: false })}]
                    </span>
                    <div className="break-words">
                        {/* จัดสีตามประเภทข้อความ */}
                        {log.type === 'NARRATION' ? (
                            <span className="text-fuchsia-400">[Narration] <span className="text-fuchsia-200">{log.content}</span></span>
                        ) : log.content.includes('Success') || log.content.includes('Critical') ? (
                            <span className="text-yellow-400">{log.content}</span>
                        ) : (
                            <span className="text-sky-300">{log.senderName}: <span className="text-slate-300">{log.content}</span></span>
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}