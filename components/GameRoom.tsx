'use client'

import { useEffect, useState } from 'react'
import { useGameSocket } from '@/hooks/useGameSocket'
import type { UserProfile, PlayerActionData, GameStateUpdate } from '@/types/socket'

interface GameRoomProps {
    campaignId: string
    currentUser: UserProfile
}

export default function GameRoom({ campaignId, currentUser }: GameRoomProps) {
    const [messages, setMessages] = useState<any[]>([])
    const [chatInput, setChatInput] = useState('')
    const [gameState, setGameState] = useState<GameStateUpdate | null>(null)

    // Initialize the socket hook
    const {
        isConnected,
        isInRoom,
        roomInfo,
        connectionError,
        latency,
        sendPlayerAction,
        sendGMUpdate,
        sendChatMessage,
        sendTypingIndicator,
        onPlayerAction,
        onGameStateUpdate,
        onChatMessage,
        onPlayerJoined,
        onPlayerLeft,
        onTyping,
        measureLatency,
    } = useGameSocket(campaignId, {
        sessionToken: 'DEMO_PLAYER_TOKEN',
        userProfile: currentUser,
        autoConnect: true,
        onError: (error) => {
            console.error('Socket error:', error)
        },
        onReconnect: () => {
            console.log('Reconnected to server!')
        },
    })

    // Set up event listeners
    useEffect(() => {
        // Listen for player actions
        onPlayerAction((action: PlayerActionData) => {
            console.log('Player action:', action)
            setMessages((prev) => [
                ...prev,
                {
                    type: 'action',
                    content: `${action.actorName} performed ${action.actionType}: ${action.description}`,
                    timestamp: new Date(),
                },
            ])
        })

        // Listen for game state updates
        onGameStateUpdate((state: GameStateUpdate) => {
            console.log('Game state updated:', state)
            setGameState(state)
        })

        // Listen for chat messages
        onChatMessage((message) => {
            console.log('Chat message:', message)
            setMessages((prev) => [...prev, message])
        })

        // Listen for players joining
        onPlayerJoined((profile: UserProfile) => {
            console.log('Player joined:', profile.name)
            setMessages((prev) => [
                ...prev,
                {
                    type: 'system',
                    content: `${profile.name} joined the game`,
                    timestamp: new Date(),
                },
            ])
        })

        // Listen for players leaving
        onPlayerLeft((data) => {
            console.log('Player left:', data.userName)
            setMessages((prev) => [
                ...prev,
                {
                    type: 'system',
                    content: `${data.userName} left the game`,
                    timestamp: new Date(),
                },
            ])
        })

        // Listen for typing indicators
        onTyping((data) => {
            console.log(`${data.userName} is ${data.isTyping ? 'typing' : 'not typing'}`)
        })
    }, [onPlayerAction, onGameStateUpdate, onChatMessage, onPlayerJoined, onPlayerLeft, onTyping])

    // Measure latency periodically
    useEffect(() => {
        if (!isConnected) return

        const interval = setInterval(() => {
            measureLatency()
        }, 10000) // Every 10 seconds

        return () => clearInterval(interval)
    }, [isConnected, measureLatency])

    // Handle sending chat message
    const handleSendMessage = async () => {
        if (!chatInput.trim()) return

        const result = await sendChatMessage(chatInput, 'TALK' as any)
        if (result.success) {
            setChatInput('')
        } else {
            console.error('Failed to send message:', result.error)
        }
    }

    // Handle player action (example: attack)
    const handleAttack = async (targetId: string, targetName: string) => {
        const actionData: PlayerActionData = {
            actionType: 'attack',
            actorId: currentUser.characterId || currentUser.id,
            actorName: currentUser.characterName || currentUser.name,
            targetId,
            targetName,
            damage: Math.floor(Math.random() * 20) + 1, // Random damage 1-20
            description: `${currentUser.characterName || currentUser.name} attacks ${targetName}!`,
        }

        const result = await sendPlayerAction(actionData)
        if (!result.success) {
            console.error('Failed to send action:', result.error)
        }
    }

    // Handle GM update (only for GMs)
    const handleGMUpdate = async () => {
        if (currentUser.role !== 'GM') return

        const newState: GameStateUpdate = {
            currentScene: 'Dark Forest',
            sessionNumber: 1,
            gameTime: {
                day: 1,
                hour: 14,
                season: 'Spring',
            },
            weather: 'Rainy',
            ambience: 'Mysterious and tense',
        }

        const result = await sendGMUpdate(newState)
        if (!result.success) {
            console.error('Failed to update game state:', result.error)
        }
    }

    return (
        <div className="flex flex-col h-screen bg-gray-900 text-white">
            {/* Header */}
            <div className="bg-gray-800 p-4 border-b border-gray-700">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold">{roomInfo?.campaignTitle || 'Loading...'}</h1>
                        <p className="text-sm text-gray-400">
                            {isConnected ? (
                                <span className="text-green-400">● Connected</span>
                            ) : (
                                <span className="text-red-400">● Disconnected</span>
                            )}
                            {isInRoom && <span className="ml-2">• In Room</span>}
                            {latency > 0 && <span className="ml-2">• Latency: {latency}ms</span>}
                        </p>
                    </div>
                    {currentUser.role === 'GM' && (
                        <button
                            onClick={handleGMUpdate}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded"
                        >
                            Update Game State
                        </button>
                    )}
                </div>
                {connectionError && (
                    <div className="mt-2 p-2 bg-red-900 text-red-200 rounded">{connectionError}</div>
                )}
            </div>

            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar - Players */}
                <div className="w-64 bg-gray-800 p-4 border-r border-gray-700 overflow-y-auto">
                    <h2 className="font-bold mb-4">Players ({roomInfo?.connectedPlayers.length || 0})</h2>
                    <div className="space-y-2">
                        {roomInfo?.connectedPlayers.map((player) => (
                            <div
                                key={player.id}
                                className="p-2 bg-gray-700 rounded hover:bg-gray-600 cursor-pointer"
                                onClick={() => handleAttack(player.id, player.name)}
                            >
                                <div className="font-medium">{player.name}</div>
                                <div className="text-xs text-gray-400">{player.role}</div>
                                {player.characterName && (
                                    <div className="text-xs text-gray-300">as {player.characterName}</div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Area - Messages */}
                <div className="flex-1 flex flex-col">
                    {/* Game State Display */}
                    {gameState && (
                        <div className="bg-gray-800 p-4 border-b border-gray-700">
                            <h3 className="font-bold mb-2">Current Scene: {gameState.currentScene}</h3>
                            <div className="text-sm text-gray-300">
                                {gameState.gameTime && (
                                    <span>
                                        Day {gameState.gameTime.day}, Hour {gameState.gameTime.hour} •{' '}
                                        {gameState.gameTime.season}
                                    </span>
                                )}
                                {gameState.weather && <span className="ml-4">Weather: {gameState.weather}</span>}
                            </div>
                        </div>
                    )}

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`p-3 rounded ${msg.type === 'system'
                                    ? 'bg-gray-700 text-gray-300 italic'
                                    : msg.type === 'action'
                                        ? 'bg-blue-900 text-blue-100'
                                        : 'bg-gray-800'
                                    }`}
                            >
                                {msg.senderName && (
                                    <div className="font-bold text-sm mb-1">{msg.senderName}</div>
                                )}
                                <div>{msg.content}</div>
                            </div>
                        ))}
                    </div>

                    {/* Chat Input */}
                    <div className="bg-gray-800 p-4 border-t border-gray-700">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={(e) => {
                                    setChatInput(e.target.value)
                                    sendTypingIndicator(e.target.value.length > 0)
                                }}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        handleSendMessage()
                                    }
                                }}
                                placeholder="Type a message..."
                                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                onClick={handleSendMessage}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium"
                            >
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
