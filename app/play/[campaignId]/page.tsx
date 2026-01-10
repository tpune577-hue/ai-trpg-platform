'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useGameSocket } from '@/hooks/useGameSocket'
import CharacterCard from '@/components/player/CharacterCard'
import ActionTabs from '@/components/player/ActionTabs'
import FeedbackPanel, { FeedbackStatus } from '@/components/player/FeedbackPanel'
import type { UserProfile, GameStateUpdate } from '@/types/socket'

// Mock user data - replace with actual authentication
const MOCK_USER: UserProfile = {
    id: 'player-1',
    name: 'Aragorn',
    role: 'PLAYER' as any,
    characterId: 'char-1',
    characterName: 'Aragorn the Ranger',
}

export default function PlayerControllerPage() {
    const params = useParams()
    const campaignId = params.campaignId as string

    // Character state
    const [character, setCharacter] = useState({
        name: 'Aragorn the Ranger',
        className: 'Ranger',
        level: 5,
        hp: 45,
        maxHp: 60,
        status: 'wounded' as 'healthy' | 'wounded' | 'critical' | 'unconscious',
    })

    // Feedback state
    const [feedbackStatus, setFeedbackStatus] = useState<FeedbackStatus>('idle')
    const [feedbackMessage, setFeedbackMessage] = useState<string>()

    // Current scene narration
    const [currentNarration, setCurrentNarration] = useState<string>(
        'You stand at the entrance of a dark cave...'
    )

    // Socket.io integration
    const {
        isConnected,
        isInRoom,
        connectionError,
        sendPlayerAction,
        onGameStateUpdate,
        onPlayerAction,
    } = useGameSocket(campaignId, {
        sessionToken: 'demo-token', // Bypassing auth for demo
        userProfile: MOCK_USER,
        autoConnect: true,
        onError: (error) => {
            console.error('Socket error:', error)
            setFeedbackStatus('error')
            setFeedbackMessage(error.message)
        },
        onReconnect: () => {
            console.log('Reconnected!')
            setFeedbackStatus('success')
            setFeedbackMessage('Reconnected to game')
        },
    })

    // Listen for game state updates
    useEffect(() => {
        onGameStateUpdate((state: GameStateUpdate) => {
            console.log('Game state updated:', state)

            if (state.currentScene) {
                setCurrentNarration(state.currentScene)
            }

            // Update character HP if included in state
            if (state.metadata?.characterUpdates) {
                const update = state.metadata.characterUpdates[MOCK_USER.characterId!]
                if (update) {
                    setCharacter((prev) => ({
                        ...prev,
                        hp: update.hp ?? prev.hp,
                        status: update.status ?? prev.status,
                    }))
                }
            }
        })

        // Listen for other player actions (optional)
        onPlayerAction((action) => {
            console.log('Player action:', action)
            // Could show notifications for other players' actions
        })
    }, [onGameStateUpdate, onPlayerAction])

    // Handle action button clicks
    const handleAction = async (action: {
        type: 'attack' | 'skill' | 'item'
        id: string
        name: string
        target?: string
    }) => {
        console.log('Action triggered:', action)

        // Show waiting feedback
        setFeedbackStatus('waiting')
        setFeedbackMessage(`Using ${action.name}...`)

        try {
            // Send action via Socket.io
            const result = await sendPlayerAction({
                actionType: action.type === 'attack' ? 'attack' : action.type === 'skill' ? 'skill' : 'item',
                actorId: MOCK_USER.characterId || MOCK_USER.id,
                actorName: character.name,
                targetId: action.target,
                targetName: 'Enemy',
                skillName: action.type === 'skill' ? action.name : undefined,
                itemName: action.type === 'item' ? action.name : undefined,
                description: `${character.name} uses ${action.name}!`,
                damage: action.type === 'attack' ? Math.floor(Math.random() * 20) + 1 : undefined,
            })

            if (result.success) {
                setFeedbackStatus('success')
                setFeedbackMessage(`${action.name} successful!`)
            } else {
                setFeedbackStatus('error')
                setFeedbackMessage(result.error || 'Action failed')
            }
        } catch (error) {
            console.error('Action error:', error)
            setFeedbackStatus('error')
            setFeedbackMessage('Failed to send action')
        }
    }

    // Loading state
    if (!isConnected) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-amber-400 text-lg font-semibold">Connecting to campaign...</p>
                </div>
            </div>
        )
    }

    // Error state
    if (connectionError) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <svg
                        className="w-16 h-16 text-red-500 mx-auto mb-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                    >
                        <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                        />
                    </svg>
                    <h2 className="text-red-400 text-xl font-bold mb-2">Connection Error</h2>
                    <p className="text-gray-400 mb-4">{connectionError}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold transition-colors touch-manipulation"
                    >
                        Retry
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-amber-500/30 backdrop-blur-lg">
                <div className="max-w-2xl mx-auto px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => window.history.back()}
                                className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors touch-manipulation"
                            >
                                <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path
                                        fillRule="evenodd"
                                        d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </button>
                            <div>
                                <h1 className="text-lg font-bold text-amber-400">Player Controller</h1>
                                <p className="text-xs text-gray-400">
                                    {isInRoom ? 'Connected' : 'Connecting...'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div
                                className={`w-2 h-2 rounded-full ${isInRoom ? 'bg-emerald-500 animate-pulse' : 'bg-gray-500'
                                    }`}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-2xl mx-auto px-4 py-6 pb-24 space-y-6">
                {/* Current Narration */}
                <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 border-2 border-purple-500/30 rounded-2xl p-6">
                    <div className="flex items-start gap-3">
                        <svg className="w-6 h-6 text-purple-400 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                        </svg>
                        <div className="flex-1">
                            <p className="text-sm text-purple-200 italic leading-relaxed">
                                {currentNarration}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Character Card */}
                <CharacterCard
                    name={character.name}
                    className={character.className}
                    level={character.level}
                    hp={character.hp}
                    maxHp={character.maxHp}
                    status={character.status}
                />

                {/* Action Tabs */}
                <ActionTabs onAction={handleAction} disabled={!isInRoom} />
            </div>

            {/* Feedback Panel */}
            <FeedbackPanel
                status={feedbackStatus}
                message={feedbackMessage}
                onHide={() => setFeedbackStatus('idle')}
            />
        </div>
    )
}
