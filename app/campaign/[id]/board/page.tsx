'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useGameSocket } from '@/hooks/useGameSocket'
import SceneDisplay from '@/components/board/SceneDisplay'
import PartyStatus from '@/components/board/PartyStatus'
import GameLog from '@/components/board/GameLog'
import type { PlayerActionData, GameStateUpdate, SocketChatMessage, UserProfile } from '@/types/socket'

// Mock data - replace with actual data from your API/database
const MOCK_USER: UserProfile = {
    id: 'gm-1',
    name: 'Game Master',
    role: 'GM' as any,
}

interface PlayerStatus {
    profile: UserProfile
    hp: number
    maxHp: number
    isActive: boolean
    status?: 'healthy' | 'wounded' | 'critical' | 'unconscious'
    level?: number
    class?: string
}

interface GameLogEntry {
    id: string
    type: 'chat' | 'dice' | 'action' | 'system'
    content: string
    playerName?: string
    timestamp: Date
    data?: any
}

export default function CampaignBoardPage() {
    const params = useParams()
    const campaignId = params.id as string

    // State
    const [players, setPlayers] = useState<PlayerStatus[]>([])
    const [gameLog, setGameLog] = useState<GameLogEntry[]>([])
    const [currentScene, setCurrentScene] = useState({
        name: 'The Misty Forest',
        backgroundImage: 'https://images.unsplash.com/photo-1511497584788-876760111969?w=1920&q=80',
        narration: 'As you venture deeper into the ancient forest, a thick mist begins to envelop your party. The trees loom overhead like silent sentinels, their gnarled branches reaching toward the darkening sky. In the distance, you hear the faint sound of running water and... something else. Something watching.',
    })

    // Socket.io integration
    const {
        isConnected,
        isInRoom,
        roomInfo,
        connectionError,
        latency,
        sendGMUpdate,
        onPlayerAction,
        onGameStateUpdate,
        onChatMessage,
        onPlayerJoined,
        onPlayerLeft,
    } = useGameSocket(campaignId, {
        userProfile: MOCK_USER,
        autoConnect: true,
        onError: (error) => {
            console.error('Socket error:', error)
            addSystemLog(`Connection error: ${error.message}`)
        },
        onReconnect: () => {
            console.log('Reconnected!')
            addSystemLog('Reconnected to server')
        },
    })

    // Helper function to add system logs
    const addSystemLog = (message: string) => {
        setGameLog((prev) => [
            ...prev,
            {
                id: `system-${Date.now()}`,
                type: 'system',
                content: message,
                timestamp: new Date(),
            },
        ])
    }

    // Set up Socket.io event listeners
    useEffect(() => {
        // Listen for player actions
        onPlayerAction((action: PlayerActionData) => {
            console.log('Player action received:', action)

            // Add to game log
            setGameLog((prev) => [
                ...prev,
                {
                    id: `action-${Date.now()}`,
                    type: 'action',
                    content: action.description,
                    playerName: action.actorName,
                    timestamp: new Date(),
                    data: {
                        id: `msg-${Date.now()}`,
                        content: action.description,
                        type: 'ACTION',
                        senderId: action.actorId,
                        senderName: action.actorName,
                        timestamp: new Date(),
                    } as SocketChatMessage,
                },
            ])

            // Simulate dice roll for attacks
            if (action.actionType === 'attack' && action.damage) {
                setGameLog((prev) => [
                    ...prev,
                    {
                        id: `dice-${Date.now()}`,
                        type: 'dice',
                        content: `${action.actorName} rolled for attack`,
                        playerName: action.actorName,
                        timestamp: new Date(),
                        data: {
                            id: `roll-${Date.now()}`,
                            playerName: action.actorName,
                            roll: action.damage,
                            sides: 20,
                            modifier: 5,
                            total: action.damage + 5,
                            purpose: 'Attack Roll',
                            timestamp: new Date(),
                            isCritical: action.damage === 20,
                            isFumble: action.damage === 1,
                        },
                    },
                ])
            }

            // Update player HP if target exists
            if (action.targetId && action.damage) {
                setPlayers((prev) =>
                    prev.map((p) =>
                        p.profile.id === action.targetId
                            ? {
                                ...p,
                                hp: Math.max(0, p.hp - action.damage),
                                status:
                                    p.hp - action.damage <= 0
                                        ? 'unconscious'
                                        : p.hp - action.damage < p.maxHp * 0.2
                                            ? 'critical'
                                            : p.hp - action.damage < p.maxHp * 0.5
                                                ? 'wounded'
                                                : 'healthy',
                            }
                            : p
                    )
                )
            }
        })

        // Listen for game state updates
        onGameStateUpdate((state: GameStateUpdate) => {
            console.log('Game state updated:', state)

            if (state.currentScene) {
                setCurrentScene((prev) => ({
                    ...prev,
                    name: state.currentScene || prev.name,
                }))
            }

            addSystemLog('Game state updated by GM')
        })

        // Listen for chat messages
        onChatMessage((message: SocketChatMessage) => {
            console.log('Chat message received:', message)

            setGameLog((prev) => [
                ...prev,
                {
                    id: message.id,
                    type: 'chat',
                    content: message.content,
                    playerName: message.senderName,
                    timestamp: message.timestamp,
                    data: message,
                },
            ])
        })

        // Listen for players joining
        onPlayerJoined((profile: UserProfile) => {
            console.log('Player joined:', profile)

            // Add new player to party status
            setPlayers((prev) => [
                ...prev,
                {
                    profile,
                    hp: 100,
                    maxHp: 100,
                    isActive: true,
                    status: 'healthy',
                    level: Math.floor(Math.random() * 10) + 1,
                    class: ['Warrior', 'Mage', 'Rogue', 'Cleric'][Math.floor(Math.random() * 4)],
                },
            ])

            addSystemLog(`${profile.name} joined the campaign`)
        })

        // Listen for players leaving
        onPlayerLeft((data) => {
            console.log('Player left:', data)

            setPlayers((prev) =>
                prev.map((p) =>
                    p.profile.id === data.userId ? { ...p, isActive: false } : p
                )
            )

            addSystemLog(`${data.userName} left the campaign`)
        })
    }, [onPlayerAction, onGameStateUpdate, onChatMessage, onPlayerJoined, onPlayerLeft])

    // Initialize with mock players (replace with actual data)
    useEffect(() => {
        if (roomInfo?.connectedPlayers) {
            const mockPlayers: PlayerStatus[] = roomInfo.connectedPlayers.map((player, index) => ({
                profile: player,
                hp: 80 - index * 10,
                maxHp: 100,
                isActive: true,
                status: index === 0 ? 'healthy' : index === 1 ? 'wounded' : 'critical',
                level: 5 + index,
                class: ['Warrior', 'Mage', 'Rogue', 'Cleric'][index % 4],
            }))
            setPlayers(mockPlayers)
        }
    }, [roomInfo])

    // Update scene narration (example GM action)
    const updateNarration = (newNarration: string) => {
        setCurrentScene((prev) => ({ ...prev, narration: newNarration }))

        // Send to all players via Socket.io
        sendGMUpdate({
            currentScene: currentScene.name,
            metadata: { narration: newNarration },
        })
    }

    if (!isConnected) {
        return (
            <div className="h-screen w-screen bg-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-amber-400 text-lg font-semibold">Connecting to server...</p>
                </div>
            </div>
        )
    }

    if (connectionError) {
        return (
            <div className="h-screen w-screen bg-slate-900 flex items-center justify-center">
                <div className="text-center max-w-md">
                    <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <h2 className="text-red-400 text-xl font-bold mb-2">Connection Error</h2>
                    <p className="text-gray-400 mb-4">{connectionError}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="h-screen w-screen bg-slate-950 overflow-hidden flex flex-col">
            {/* Top Status Bar */}
            <div className="h-12 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-amber-500/30 flex items-center justify-between px-6">
                <div className="flex items-center gap-4">
                    <h1 className="text-lg font-bold text-amber-400 tracking-wide">
                        {roomInfo?.campaignTitle || 'Campaign Board'}
                    </h1>
                    <div className="h-4 w-px bg-amber-500/30" />
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isInRoom ? 'bg-emerald-500 animate-pulse' : 'bg-gray-500'}`} />
                        <span className="text-sm text-gray-400">
                            {isInRoom ? 'Connected' : 'Connecting...'}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-6 text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                        <span>{players.filter(p => p.isActive).length} Players</span>
                    </div>
                    {latency > 0 && (
                        <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                            </svg>
                            <span>{latency}ms</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left: Scene Display + Game Log */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Scene Display - 60% height */}
                    <div className="h-[60%]">
                        <SceneDisplay
                            backgroundImage={currentScene.backgroundImage}
                            narrationText={currentScene.narration}
                            sceneName={currentScene.name}
                        />
                    </div>

                    {/* Game Log - 40% height */}
                    <div className="h-[40%]">
                        <GameLog entries={gameLog} autoScroll={true} />
                    </div>
                </div>

                {/* Right: Party Status Sidebar */}
                <div className="w-80 flex-shrink-0">
                    <PartyStatus players={players} gmProfile={MOCK_USER} />
                </div>
            </div>
        </div>
    )
}
