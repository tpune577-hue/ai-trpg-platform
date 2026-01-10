'use client'

import { useState, useEffect, useRef } from 'react'

interface SceneDisplayProps {
    backgroundImage?: string
    narrationText: string
    sceneName?: string
    onTypewriterComplete?: () => void
}

export default function SceneDisplay({
    backgroundImage = '/images/default-scene.jpg',
    narrationText,
    sceneName = 'Unknown Location',
    onTypewriterComplete,
}: SceneDisplayProps) {
    const [displayedText, setDisplayedText] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const currentIndexRef = useRef(0)
    const previousTextRef = useRef('')

    // Typewriter effect
    useEffect(() => {
        // Reset if narration text changes
        if (narrationText !== previousTextRef.current) {
            previousTextRef.current = narrationText
            currentIndexRef.current = 0
            setDisplayedText('')
            setIsTyping(true)
        }

        if (!isTyping || currentIndexRef.current >= narrationText.length) {
            if (isTyping) {
                setIsTyping(false)
                onTypewriterComplete?.()
            }
            return
        }

        const timeout = setTimeout(() => {
            setDisplayedText(narrationText.slice(0, currentIndexRef.current + 1))
            currentIndexRef.current += 1
        }, 30) // 30ms per character for smooth typing

        return () => clearTimeout(timeout)
    }, [narrationText, isTyping, onTypewriterComplete])

    // Skip typewriter effect on click
    const handleSkip = () => {
        if (isTyping) {
            setDisplayedText(narrationText)
            currentIndexRef.current = narrationText.length
            setIsTyping(false)
            onTypewriterComplete?.()
        }
    }

    return (
        <div className="relative h-full w-full overflow-hidden" onClick={handleSkip}>
            {/* Background Image with Overlay */}
            <div
                className="absolute inset-0 bg-cover bg-center transition-all duration-1000"
                style={{
                    backgroundImage: `url(${backgroundImage})`,
                }}
            >
                {/* Dark gradient overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />
            </div>

            {/* Scene Name */}
            <div className="absolute top-8 left-8 z-10">
                <div className="flex items-center gap-3">
                    <div className="h-px w-12 bg-gradient-to-r from-amber-500/0 via-amber-500 to-amber-500/0" />
                    <h2 className="text-2xl font-bold text-amber-400 tracking-wider uppercase drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]">
                        {sceneName}
                    </h2>
                    <div className="h-px w-12 bg-gradient-to-r from-amber-500 via-amber-500 to-amber-500/0" />
                </div>
            </div>

            {/* Narration Text */}
            <div className="absolute inset-x-0 bottom-0 z-10 p-8">
                <div className="max-w-5xl mx-auto">
                    {/* Decorative border */}
                    <div className="relative bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 rounded-lg border border-amber-500/30 shadow-2xl backdrop-blur-sm">
                        {/* Corner decorations */}
                        <div className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-amber-500" />
                        <div className="absolute -top-2 -right-2 w-4 h-4 border-t-2 border-r-2 border-amber-500" />
                        <div className="absolute -bottom-2 -left-2 w-4 h-4 border-b-2 border-l-2 border-amber-500" />
                        <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-amber-500" />

                        {/* Content */}
                        <div className="p-6 md:p-8">
                            <div className="flex items-start gap-4">
                                {/* Decorative icon */}
                                <div className="flex-shrink-0 mt-1">
                                    <svg
                                        className="w-6 h-6 text-amber-500"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                    >
                                        <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                                    </svg>
                                </div>

                                {/* Text content */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-lg md:text-xl text-gray-100 leading-relaxed font-serif">
                                        {displayedText}
                                        {isTyping && (
                                            <span className="inline-block w-2 h-5 ml-1 bg-amber-500 animate-pulse" />
                                        )}
                                    </p>

                                    {/* Skip hint */}
                                    {isTyping && (
                                        <p className="text-xs text-gray-400 mt-4 italic animate-pulse">
                                            Click anywhere to skip...
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Glowing effect */}
                        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-amber-500/0 via-amber-500/5 to-amber-500/0 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Ambient particles effect (optional) */}
            <div className="absolute inset-0 pointer-events-none">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 bg-amber-500/30 rounded-full animate-float"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 5}s`,
                            animationDuration: `${5 + Math.random() * 10}s`,
                        }}
                    />
                ))}
            </div>
        </div>
    )
}
