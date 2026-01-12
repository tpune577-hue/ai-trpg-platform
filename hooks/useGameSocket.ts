'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { ClientToServerEvents, ServerToClientEvents, PlayerActionData, GameStateUpdate, UserProfile, SocketChatMessage } from '@/types/socket'

// Default empty state to prevent null errors
const DEFAULT_GAME_STATE: GameStateUpdate = {
    currentScene: 'Waiting for GM...',
    activeCharacters: [],
    turnOrder: []
}

interface UseGameSocketOptions {
    sessionToken?: string
    userProfile?: any
    autoConnect?: boolean
    onError?: (error: any) => void
    onReconnect?: () => void
}

export const useGameSocket = (campaignId: string | null, options: UseGameSocketOptions = {}) => {
    const [socket, setSocket] = useState<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const [isInRoom, setIsInRoom] = useState(false)
    const [latency, setLatency] = useState(0)
    const [connectionError, setConnectionError] = useState<string | null>(null)
    const [roomInfo, setRoomInfo] = useState<any>(null)

    // Event refs
    const eventCallbacksRef = useRef({
        onPlayerAction: (action: PlayerActionData) => { },
        onGameStateUpdate: (state: GameStateUpdate) => { },
        onChatMessage: (message: SocketChatMessage) => { },
        onPlayerJoined: (profile: UserProfile) => { },
        onPlayerLeft: (data: { userId: string, userName: string }) => { },
        onTyping: (data: { userId: string, userName: string, isTyping: boolean }) => { },
        onDiceResult: (result: any) => { },
        onPrivateSceneUpdate: (data: { sceneId: string | null }) => { },
        onWhisperReceived: (data: { sender: string, message: string }) => { },
        // ✅ 1. ADD THIS: เพิ่ม Callback Ref สำหรับ Roll Request
        onRollRequested: (request: { checkType: string, dc: number }) => { }
    })

    useEffect(() => {
        if (!campaignId || !options.sessionToken) return

        const socketInstance = io({
            auth: {
                sessionToken: options.sessionToken,
                campaignId: campaignId
            },
            autoConnect: options.autoConnect ?? true
        })

        socketInstance.on('connect', () => {
            console.log('🔌 Socket Connected:', socketInstance.id)
            setIsConnected(true)
            setConnectionError(null)

            socketInstance.emit('join_room', { campaignId }, (response) => {
                if (response?.success) {
                    setIsInRoom(true)
                } else if (response?.error) {
                    setConnectionError(response.error)
                }
            })
        })

        socketInstance.on('disconnect', () => {
            console.log('🔌 Socket Disconnected')
            setIsConnected(false)
            setIsInRoom(false)
        })

        socketInstance.on('connect_error', (err) => {
            console.error('Socket Connection Error:', err)
            setConnectionError(err.message)
            options.onError?.(err)
        })

        // Event Listeners
        socketInstance.on('game:action', (data) => eventCallbacksRef.current.onPlayerAction(data))
        socketInstance.on('game:state_update', (data) => eventCallbacksRef.current.onGameStateUpdate(data))
        socketInstance.on('game:scene_update', (data) => {
            eventCallbacksRef.current.onGameStateUpdate({ currentScene: data.sceneId } as any)
        })
        socketInstance.on('chat:message', (data) => eventCallbacksRef.current.onChatMessage(data))
        socketInstance.on('room:player_joined', (data) => eventCallbacksRef.current.onPlayerJoined(data.userProfile))
        socketInstance.on('room:player_left', (data) => eventCallbacksRef.current.onPlayerLeft(data))
        socketInstance.on('chat:typing', (data) => eventCallbacksRef.current.onTyping(data))
        socketInstance.on('game:dice_result', (data) => eventCallbacksRef.current.onDiceResult(data))

        // Private events
        socketInstance.on('player:private_scene_update', (data) => eventCallbacksRef.current.onPrivateSceneUpdate(data))
        socketInstance.on('player:whisper_received', (data) => eventCallbacksRef.current.onWhisperReceived(data))

        // ✅ 2. ADD THIS: Listener รับ Event คำสั่ง Roll จาก Server
        // (ชื่อ event ต้องตรงกับที่ Server emit มานะครับ ถ้า Server ส่งเป็น game:action ต้องไปดักใน onPlayerAction แทน)
        socketInstance.on('game:roll_request', (data) => eventCallbacksRef.current.onRollRequested(data))

        socketInstance.on('room:joined', (data) => {
            setRoomInfo(data.roomInfo)
        })

        setSocket(socketInstance)

        return () => {
            socketInstance.disconnect()
        }
    }, [campaignId, options.sessionToken])

    // --- Actions ---
    // ... (ส่วน Actions คงเดิม) ...

    const sendPlayerAction = useCallback((action: PlayerActionData) => {
        return new Promise<{ success: boolean; error?: string }>((resolve) => {
            if (!socket || !campaignId) {
                resolve({ success: false, error: 'Not connected' })
                return
            }
            socket.emit('player_action', { campaignId, action }, (res) => resolve(res || { success: true }))
        })
    }, [socket, campaignId])

    const sendChatMessage = useCallback((content: string, type: 'TALK' | 'NARRATION' | 'ACTION' = 'TALK') => {
        return new Promise<{ success: boolean; error?: string }>((resolve) => {
            if (!socket || !campaignId) {
                resolve({ success: false, error: 'Not connected' })
                return
            }
            socket.emit('chat:send', { roomId: campaignId, content, type }, (res) => resolve(res || { success: true }))
        })
    }, [socket, campaignId])

    const sendGMUpdate = useCallback((gameState: GameStateUpdate) => {
        return new Promise<{ success: boolean; error?: string }>((resolve) => {
            if (!socket || !campaignId) {
                resolve({ success: false, error: 'Not connected' })
                return
            }
            socket.emit('gm_update', { roomId: campaignId, gameState }, (res) => resolve(res || { success: true }))
        })
    }, [socket, campaignId])

    const setPrivateScene = useCallback((playerId: string, sceneId: string | null) => {
        if (!socket) return
        socket.emit('gm:set_private_scene', { playerId, sceneId })
    }, [socket])

    const sendWhisper = useCallback((targetPlayerId: string, message: string) => {
        if (!socket) return
        socket.emit('gm:whisper', { targetPlayerId, message })
    }, [socket])

    const setGlobalScene = useCallback((sceneId: string) => {
        if (!socket || !campaignId) return
        socket.emit('gm:set_global_scene', { campaignId, sceneId })
    }, [socket, campaignId])

    const measureLatency = useCallback(() => {
        if (!socket) return
        const start = Date.now()
        socket.emit('ping', () => {
            setLatency(Date.now() - start)
        })
    }, [socket])

    const sendTypingIndicator = useCallback((isTyping: boolean) => {
        if (!socket || !campaignId) return
        socket.emit('chat:typing', { roomId: campaignId, isTyping })
    }, [socket, campaignId])

    // Callback Setters
    const onPlayerAction = useCallback((cb: (action: PlayerActionData) => void) => { eventCallbacksRef.current.onPlayerAction = cb }, [])
    const onGameStateUpdate = useCallback((cb: (state: GameStateUpdate) => void) => { eventCallbacksRef.current.onGameStateUpdate = cb }, [])
    const onChatMessage = useCallback((cb: (msg: SocketChatMessage) => void) => { eventCallbacksRef.current.onChatMessage = cb }, [])
    const onPlayerJoined = useCallback((cb: (profile: UserProfile) => void) => { eventCallbacksRef.current.onPlayerJoined = cb }, [])
    const onPlayerLeft = useCallback((cb: (data: { userId: string, userName: string }) => void) => { eventCallbacksRef.current.onPlayerLeft = cb }, [])
    const onTyping = useCallback((cb: (data: { userId: string, userName: string, isTyping: boolean }) => void) => { eventCallbacksRef.current.onTyping = cb }, [])
    const onDiceResult = useCallback((cb: (result: any) => void) => { eventCallbacksRef.current.onDiceResult = cb }, [])
    const onPrivateSceneUpdate = useCallback((cb: (data: { sceneId: string | null }) => void) => { eventCallbacksRef.current.onPrivateSceneUpdate = cb }, [])
    const onWhisperReceived = useCallback((cb: (data: { sender: string, message: string }) => void) => { eventCallbacksRef.current.onWhisperReceived = cb }, [])

    // ✅ 3. ADD THIS: Setter function สำหรับ onRollRequested
    const onRollRequested = useCallback((cb: (request: { checkType: string, dc: number }) => void) => {
        eventCallbacksRef.current.onRollRequested = cb
    }, [])

    // Compatibility shim
    const requestRoll = useCallback(async (checkType: string, dc: number = 10) => {
        sendPlayerAction({
            actionType: 'custom',
            actorId: 'gm',
            actorName: 'Game Master',
            description: `Requested ${checkType} Check (DC ${dc})`,
            metadata: { type: 'REQUEST_ROLL', checkType, dc }
        } as any)
    }, [sendPlayerAction])

    return {
        socket,
        isConnected,
        isInRoom,
        roomInfo,
        latency,
        connectionError,
        sendPlayerAction,
        sendChatMessage,
        sendGMUpdate,
        sendTypingIndicator,
        setPrivateScene,
        sendWhisper,
        setGlobalScene,
        measureLatency,
        onPlayerAction,
        onGameStateUpdate,
        onChatMessage,
        onPlayerJoined,
        onPlayerLeft,
        onTyping,
        onDiceResult,
        onPrivateSceneUpdate,
        onWhisperReceived,
        requestRoll,
        onRollRequested // ✅ 4. ADD THIS: อย่าลืม return ออกไป
    }
}