'use client'

import { useEffect, useState } from 'react'

export type FeedbackStatus = 'idle' | 'waiting' | 'success' | 'error'

interface FeedbackPanelProps {
    status: FeedbackStatus
    message?: string
    autoHide?: boolean
    autoHideDuration?: number
    onHide?: () => void
}

export default function FeedbackPanel({
    status,
    message,
    autoHide = true,
    autoHideDuration = 3000,
    onHide,
}: FeedbackPanelProps) {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        if (status !== 'idle') {
            setIsVisible(true)

            if (autoHide && (status === 'success' || status === 'error')) {
                const timer = setTimeout(() => {
                    setIsVisible(false)
                    onHide?.()
                }, autoHideDuration)

                return () => clearTimeout(timer)
            }
        } else {
            setIsVisible(false)
        }
    }, [status, autoHide, autoHideDuration, onHide])

    if (!isVisible || status === 'idle') {
        return null
    }

    const getStatusConfig = () => {
        switch (status) {
            case 'waiting':
                return {
                    bg: 'from-amber-900/90 to-amber-800/90',
                    border: 'border-amber-500',
                    text: 'text-amber-100',
                    icon: (
                        <div className="w-6 h-6 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    ),
                    defaultMessage: 'Waiting for GM...',
                }
            case 'success':
                return {
                    bg: 'from-emerald-900/90 to-emerald-800/90',
                    border: 'border-emerald-500',
                    text: 'text-emerald-100',
                    icon: (
                        <svg className="w-6 h-6 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                            />
                        </svg>
                    ),
                    defaultMessage: 'Action successful!',
                }
            case 'error':
                return {
                    bg: 'from-red-900/90 to-red-800/90',
                    border: 'border-red-500',
                    text: 'text-red-100',
                    icon: (
                        <svg className="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                clipRule="evenodd"
                            />
                        </svg>
                    ),
                    defaultMessage: 'Action failed!',
                }
            default:
                return {
                    bg: 'from-gray-900/90 to-gray-800/90',
                    border: 'border-gray-500',
                    text: 'text-gray-100',
                    icon: null,
                    defaultMessage: '',
                }
        }
    }

    const config = getStatusConfig()

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pointer-events-none animate-slide-up">
            <div
                className={`max-w-md mx-auto bg-gradient-to-r ${config.bg} backdrop-blur-lg border-2 ${config.border} rounded-2xl shadow-2xl pointer-events-auto`}
            >
                <div className="p-4 flex items-center gap-4">
                    {/* Icon */}
                    <div className="flex-shrink-0">{config.icon}</div>

                    {/* Message */}
                    <div className="flex-1 min-w-0">
                        <p className={`font-semibold ${config.text}`}>
                            {message || config.defaultMessage}
                        </p>
                    </div>

                    {/* Close button (only for success/error) */}
                    {(status === 'success' || status === 'error') && (
                        <button
                            onClick={() => {
                                setIsVisible(false)
                                onHide?.()
                            }}
                            className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                    fillRule="evenodd"
                                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Progress bar for waiting state */}
                {status === 'waiting' && (
                    <div className="h-1 bg-amber-950">
                        <div className="h-full bg-amber-500 animate-pulse" style={{ width: '100%' }} />
                    </div>
                )}
            </div>
        </div>
    )
}
