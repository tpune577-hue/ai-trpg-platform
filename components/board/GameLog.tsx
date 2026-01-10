'use client'

import { useEffect, useRef, useState } from 'react'
import { SocketChatMessage } from '@/types/socket'
import { MessageType } from '@prisma/client'

interface DiceRoll {
    id: string
    playerName: string
    roll: number
    sides: number
    modifier?: number
    total: number
    purpose?: string
    timestamp: Date
    isCritical?: boolean
    isFumble?: boolean
}

interface GameLogEntry {
    id: string
    type: 'chat' | 'dice' | 'action' | 'system'
    content: string
    playerName?: string
    timestamp: Date
    data?: DiceRoll | SocketChatMessage | any
}

interface GameLogProps {
    entries: GameLogEntry[]
    maxEntries?: number
    autoScroll?: boolean
}

export default function GameLog({
    entries,
    maxEntries = 100,
    autoScroll = true,
}: GameLogProps) {
    const scrollRef = useRef<HTMLDivElement>(null)
    const [isUserScrolling, setIsUserScrolling] = useState(false)
    const displayEntries = entries.slice(-maxEntries)

    // Auto-scroll to bottom when new entries arrive
    useEffect(() => {
        if (autoScroll && !isUserScrolling && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [entries, autoScroll, isUserScrolling])

    // Detect user scrolling
    const handleScroll = () => {
        if (!scrollRef.current) return

        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 50

        setIsUserScrolling(!isAtBottom)
    }

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
            setIsUserScrolling(false)
        }
    }

    const formatTime = (date: Date) => {
        return new Date(date).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    const renderDiceRoll = (roll: DiceRoll) => {
        const isCritical = roll.isCritical || roll.roll === roll.sides
        const isFumble = roll.isFumble || roll.roll === 1

        return (
            <div
                className={`flex items-center gap-3 p-3 rounded-lg border ${isCritical
                        ? 'bg-emerald-900/30 border-emerald-500/50'
                        : isFumble
                            ? 'bg-red-900/30 border-red-500/50'
                            : 'bg-slate-800/50 border-slate-700/50'
                    }`}
            >
                {/* Dice Icon */}
                <div
                    className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center font-bold text-xl ${isCritical
                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/50'
                            : isFumble
                                ? 'bg-red-500 text-white shadow-lg shadow-red-500/50'
                                : 'bg-amber-500 text-white'
                        }`}
                >
                    {roll.roll}
                </div>

                {/* Roll Details */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-200">
                            {roll.playerName}
                        </span>
                        {isCritical && (
                            <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
                                CRITICAL!
                            </span>
                        )}
                        {isFumble && (
                            <span className="px-2 py-0.5 text-xs font-bold bg-red-500/20 text-red-300 rounded border border-red-500/30">
                                FUMBLE!
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-gray-400">
                        {roll.purpose && <span className="mr-2">{roll.purpose}</span>}
                        <span className="font-mono">
                            d{roll.sides}
                            {roll.modifier && roll.modifier !== 0 && (
                                <span>
                                    {' '}
                                    {roll.modifier > 0 ? '+' : ''}
                                    {roll.modifier}
                                </span>
                            )}
                            {' = '}
                            <span className="text-amber-400 font-bold">{roll.total}</span>
                        </span>
                    </p>
                </div>
            </div>
        )
    }

    const renderChatMessage = (message: SocketChatMessage) => {
        const isNarration = message.type === ('NARRATION' as any)
        const isAction = message.type === ('ACTION' as any)

        return (
            <div
                className={`p-3 rounded-lg ${isNarration
                        ? 'bg-purple-900/20 border border-purple-500/30'
                        : isAction
                            ? 'bg-blue-900/20 border border-blue-500/30'
                            : 'bg-slate-800/50 border border-slate-700/50'
                    }`}
            >
                <div className="flex items-start gap-2">
                    {/* Icon */}
                    {isNarration && (
                        <svg className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                        </svg>
                    )}
                    {isAction && (
                        <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                        </svg>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        {!isNarration && (
                            <p className="text-sm font-semibold text-gray-200 mb-1">
                                {message.senderName}
                            </p>
                        )}
                        <p
                            className={`text-sm ${isNarration
                                    ? 'text-purple-200 italic font-serif'
                                    : isAction
                                        ? 'text-blue-200'
                                        : 'text-gray-300'
                                }`}
                        >
                            {message.content}
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    const renderEntry = (entry: GameLogEntry) => {
        switch (entry.type) {
            case 'dice':
                return renderDiceRoll(entry.data as DiceRoll)
            case 'chat':
            case 'action':
                return renderChatMessage(entry.data as SocketChatMessage)
            case 'system':
                return (
                    <div className="text-center">
                        <p className="text-xs text-gray-500 italic">{entry.content}</p>
                    </div>
                )
            default:
                return (
                    <div className="p-2 bg-slate-800/50 rounded">
                        <p className="text-sm text-gray-300">{entry.content}</p>
                    </div>
                )
        }
    }

    return (
        <div className="h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-t border-amber-500/30 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-amber-500/30 bg-gradient-to-r from-amber-900/20 to-transparent">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <svg
                            className="w-6 h-6 text-amber-500"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path
                                fillRule="evenodd"
                                d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z"
                                clipRule="evenodd"
                            />
                        </svg>
                        <h2 className="text-xl font-bold text-amber-400 tracking-wide uppercase">
                            Game Log
                        </h2>
                    </div>
                    <span className="text-xs text-gray-400">
                        {displayEntries.length} {displayEntries.length === 1 ? 'entry' : 'entries'}
                    </span>
                </div>
            </div>

            {/* Log Entries */}
            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3"
            >
                {displayEntries.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-gray-500 text-sm italic">No activity yet...</p>
                    </div>
                ) : (
                    displayEntries.map((entry) => (
                        <div key={entry.id} className="animate-fade-in">
                            {/* Timestamp */}
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs text-gray-500 font-mono">
                                    {formatTime(entry.timestamp)}
                                </span>
                                <div className="flex-1 h-px bg-gradient-to-r from-gray-700 to-transparent" />
                            </div>

                            {/* Entry Content */}
                            {renderEntry(entry)}
                        </div>
                    ))
                )}
            </div>

            {/* Scroll to Bottom Button */}
            {isUserScrolling && (
                <button
                    onClick={scrollToBottom}
                    className="absolute bottom-20 right-8 p-3 bg-amber-500 hover:bg-amber-600 text-white rounded-full shadow-lg shadow-amber-500/50 transition-all duration-300 animate-bounce"
                >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                            fillRule="evenodd"
                            d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                        />
                    </svg>
                </button>
            )}
        </div>
    )
}
