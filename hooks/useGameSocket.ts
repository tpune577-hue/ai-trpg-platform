'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import type {
    ServerToClientEvents,
    ClientToServerEvents,
    UserProfile,
    PlayerActionData,
    GameStateUpdate,
    SocketChatMessage,
    RoomInfo,
    SocketError,
} from '@/types/socket'
import { MessageType } from '@prisma/client'

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>

export interface UseGameSocketOptions {
    userProfile: UserProfile
    autoConnect?: boolean
    onError?: (error: SocketError) => void
    onReconnect?: () => void
}

export interface UseGameSocketReturn {
    // Connection state
    socket: TypedSocket | null
    isConnected: boolean
    isInRoom: boolean
    roomInfo: RoomInfo | null
    connectionError: string | null
    latency: number

    // Room actions
    joinRoom: (roomId: string) => Promise<{ success: boolean; error?: string }>
    leaveRoom: () => void

    // Game actions
    sendPlayerAction: (actionData: PlayerActionData) => Promise<{ success: boolean; error?: string }>
    sendGMUpdate: (gameState: GameStateUpdate) => Promise<{ success: boolean; error?: string }>

    // Chat actions
    sendChatMessage: (content: string, type?: MessageType) => Promise<{ success: boolean; messageId?: string; error?: string }>
    sendTypingIndicator: (isTyping: boolean) => void

    // Event listeners
    onPlayerAction: (callback: (action: PlayerActionData) => void) => void
    onGameStateUpdate: (callback: (state: GameStateUpdate) => void) => void
    onChatMessage: (callback: (message: SocketChatMessage) => void) => void
    onPlayerJoined: (callback: (profile: UserProfile) => void) => void
    onPlayerLeft: (callback: (data: { userId: string; userName: string }) => void) => void
    onTyping: (callback: (data: { userId: string; userName: string; isTyping: boolean }) => void) => void

    // Utility
    measureLatency: () => Promise<number>
    reconnect: () => void
    disconnect: () => void
}

export function useGameSocket(
    roomId: string | null,
    options: UseGameSocketOptions
): UseGameSocketReturn {
    const { userProfile, autoConnect = true, onError, onReconnect } = options

    const [socket, setSocket] = useState<TypedSocket | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const [isInRoom, setIsInRoom] = useState(false)
    const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null)
    const [connectionError, setConnectionError] = useState<string | null>(null)
    const [latency, setLatency] = useState(0)

    const currentRoomIdRef = useRef<string | null>(null)
    const eventCallbacksRef = useRef<{
        onPlayerAction?: (action: PlayerActionData) => void
        onGameStateUpdate?: (state: GameStateUpdate) => void
        onChatMessage?: (message: SocketChatMessage) => void
        onPlayerJoined?: (profile: UserProfile) => void
        onPlayerLeft?: (data: { userId: string; userName: string }) => void
        onTyping?: (data: { userId: string; userName: string; isTyping: boolean }) => void
    }>({})

    // Initialize socket connection
    useEffect(() => {
        if (!autoConnect) return

        const socketInstance: TypedSocket = io({
            auth: {
                userId: userProfile.id,
                userName: userProfile.name,
                userRole: userProfile.role,
            },
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
        })

        // Connection events
        socketInstance.on('connect', () => {
            console.log('[useGameSocket] Connected to server')
            setIsConnected(true)
            setConnectionError(null)
        })

        socketInstance.on('disconnect', () => {
            console.log('[useGameSocket] Disconnected from server')
            setIsConnected(false)
            setIsInRoom(false)
            setRoomInfo(null)
        })

        socketInstance.on('connection:established', () => {
            console.log('[useGameSocket] Connection established')
        })

        socketInstance.on('connection:reconnected', () => {
            console.log('[useGameSocket] Reconnected to server')
            onReconnect?.()
        })

        socketInstance.on('error', (error) => {
            console.error('[useGameSocket] Socket error:', error)
            setConnectionError(error.message)
            onError?.(error)
        })

        // Room events
        socketInstance.on('room:joined', ({ roomInfo: info, userProfile: profile }) => {
            console.log('[useGameSocket] Joined room:', info.campaignTitle)
            setIsInRoom(true)
            setRoomInfo(info)
            currentRoomIdRef.current = info.roomId
        })

        socketInstance.on('room:left', () => {
            console.log('[useGameSocket] Left room')
            setIsInRoom(false)
            setRoomInfo(null)
            currentRoomIdRef.current = null
        })

        socketInstance.on('room:player_joined', ({ userProfile: profile }) => {
            console.log('[useGameSocket] Player joined:', profile.name)
            eventCallbacksRef.current.onPlayerJoined?.(profile)

            // Update room info
            setRoomInfo((prev) => {
                if (!prev) return prev
                return {
                    ...prev,
                    connectedPlayers: [...prev.connectedPlayers, profile],
                }
            })
        })

        socketInstance.on('room:player_left', (data) => {
            console.log('[useGameSocket] Player left:', data.userName)
            eventCallbacksRef.current.onPlayerLeft?.(data)

            // Update room info
            setRoomInfo((prev) => {
                if (!prev) return prev
                return {
                    ...prev,
                    connectedPlayers: prev.connectedPlayers.filter((p) => p.id !== data.userId),
                }
            })
        })

        // Game events
        socketInstance.on('game:action', (action) => {
            eventCallbacksRef.current.onPlayerAction?.(action)
        })

        socketInstance.on('game:state_update', (state) => {
            eventCallbacksRef.current.onGameStateUpdate?.(state)
        })

        // Chat events
        socketInstance.on('chat:message', (message) => {
            eventCallbacksRef.current.onChatMessage?.(message)
        })

        socketInstance.on('chat:typing', (data) => {
            eventCallbacksRef.current.onTyping?.(data)
        })

        setSocket(socketInstance)

        // Cleanup
        return () => {
            if (currentRoomIdRef.current) {
                socketInstance.emit('leave_room', { roomId: currentRoomIdRef.current })
            }
            socketInstance.disconnect()
        }
    }, [autoConnect, userProfile, onError, onReconnect])

    // Auto-join room when roomId changes
    useEffect(() => {
        if (!socket || !isConnected || !roomId) return

        // Leave previous room if any
        if (currentRoomIdRef.current && currentRoomIdRef.current !== roomId) {
            socket.emit('leave_room', { roomId: currentRoomIdRef.current })
        }

        // Join new room
        socket.emit('join_room', { roomId, userProfile }, (response) => {
            if (!response.success) {
                console.error('[useGameSocket] Failed to join room:', response.error)
                setConnectionError(response.error || 'Failed to join room')
            }
        })
    }, [socket, isConnected, roomId, userProfile])

    // Join room manually
    const joinRoom = useCallback(
        (targetRoomId: string): Promise<{ success: boolean; error?: string }> => {
            return new Promise((resolve) => {
                if (!socket || !isConnected) {
                    resolve({ success: false, error: 'Not connected to server' })
                    return
                }

                socket.emit('join_room', { roomId: targetRoomId, userProfile }, (response) => {
                    resolve(response)
                })
            })
        },
        [socket, isConnected, userProfile]
    )

    // Leave room
    const leaveRoom = useCallback(() => {
        if (!socket || !currentRoomIdRef.current) return

        socket.emit('leave_room', { roomId: currentRoomIdRef.current })
        setIsInRoom(false)
        setRoomInfo(null)
        currentRoomIdRef.current = null
    }, [socket])

    // Send player action
    const sendPlayerAction = useCallback(
        (actionData: PlayerActionData): Promise<{ success: boolean; error?: string }> => {
            return new Promise((resolve) => {
                if (!socket || !currentRoomIdRef.current) {
                    resolve({ success: false, error: 'Not in a room' })
                    return
                }

                socket.emit(
                    'player_action',
                    { roomId: currentRoomIdRef.current, actionData },
                    (response) => {
                        resolve(response)
                    }
                )
            })
        },
        [socket]
    )

    // Send GM update
    const sendGMUpdate = useCallback(
        (gameState: GameStateUpdate): Promise<{ success: boolean; error?: string }> => {
            return new Promise((resolve) => {
                if (!socket || !currentRoomIdRef.current) {
                    resolve({ success: false, error: 'Not in a room' })
                    return
                }

                socket.emit('gm_update', { roomId: currentRoomIdRef.current, gameState }, (response) => {
                    resolve(response)
                })
            })
        },
        [socket]
    )

    // Send chat message
    const sendChatMessage = useCallback(
        (
            content: string,
            type: MessageType = MessageType.TALK
        ): Promise<{ success: boolean; messageId?: string; error?: string }> => {
            return new Promise((resolve) => {
                if (!socket || !currentRoomIdRef.current) {
                    resolve({ success: false, error: 'Not in a room' })
                    return
                }

                socket.emit(
                    'chat:send',
                    { roomId: currentRoomIdRef.current, content, type },
                    (response) => {
                        resolve(response)
                    }
                )
            })
        },
        [socket]
    )

    // Send typing indicator
    const sendTypingIndicator = useCallback(
        (isTyping: boolean) => {
            if (!socket || !currentRoomIdRef.current) return

            socket.emit('chat:typing', { roomId: currentRoomIdRef.current, isTyping })
        },
        [socket]
    )

    // Event listener setters
    const onPlayerAction = useCallback((callback: (action: PlayerActionData) => void) => {
        eventCallbacksRef.current.onPlayerAction = callback
    }, [])

    const onGameStateUpdate = useCallback((callback: (state: GameStateUpdate) => void) => {
        eventCallbacksRef.current.onGameStateUpdate = callback
    }, [])

    const onChatMessage = useCallback((callback: (message: SocketChatMessage) => void) => {
        eventCallbacksRef.current.onChatMessage = callback
    }, [])

    const onPlayerJoined = useCallback((callback: (profile: UserProfile) => void) => {
        eventCallbacksRef.current.onPlayerJoined = callback
    }, [])

    const onPlayerLeft = useCallback(
        (callback: (data: { userId: string; userName: string }) => void) => {
            eventCallbacksRef.current.onPlayerLeft = callback
        },
        []
    )

    const onTyping = useCallback(
        (callback: (data: { userId: string; userName: string; isTyping: boolean }) => void) => {
            eventCallbacksRef.current.onTyping = callback
        },
        []
    )

    // Measure latency
    const measureLatency = useCallback((): Promise<number> => {
        return new Promise((resolve) => {
            if (!socket) {
                resolve(-1)
                return
            }

            const startTime = Date.now()
            socket.emit('ping', (serverTime) => {
                const roundTripTime = Date.now() - startTime
                setLatency(roundTripTime)
                resolve(roundTripTime)
            })
        })
    }, [socket])

    // Reconnect
    const reconnect = useCallback(() => {
        if (socket) {
            socket.connect()
        }
    }, [socket])

    // Disconnect
    const disconnect = useCallback(() => {
        if (socket) {
            if (currentRoomIdRef.current) {
                socket.emit('leave_room', { roomId: currentRoomIdRef.current })
            }
            socket.disconnect()
        }
    }, [socket])

    return {
        socket,
        isConnected,
        isInRoom,
        roomInfo,
        connectionError,
        latency,
        joinRoom,
        leaveRoom,
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
        reconnect,
        disconnect,
    }
}
