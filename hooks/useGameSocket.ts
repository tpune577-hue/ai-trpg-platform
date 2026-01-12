'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Pusher from 'pusher-js'
import { PlayerActionData, GameStateUpdate, SocketChatMessage, UserProfile } from '@/types/socket'

// ตั้งค่า Pusher Client
const pusherClient = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
})

export const useGameSocket = (campaignId: string | null, options: any = {}) => {
    const [isConnected, setIsConnected] = useState(false)
    const [roomInfo, setRoomInfo] = useState<any>(null) // Mock room info for Pusher

    // Event Refs
    const eventCallbacksRef = useRef({
        onPlayerAction: (action: PlayerActionData) => { },
        onGameStateUpdate: (state: GameStateUpdate) => { },
        onChatMessage: (message: SocketChatMessage) => { },
        onDiceResult: (result: any) => { },
        onRollRequested: (request: { checkType: string, dc: number }) => { },
        // ✅ เพิ่มกลับมาให้ครบครับ
        onWhisperReceived: (data: { sender: string, message: string }) => { },
        onPrivateSceneUpdate: (data: { sceneId: string | null }) => { },
        onPlayerJoined: (profile: UserProfile) => { },
    })

    useEffect(() => {
        if (!campaignId) return

        const channelName = `campaign-${campaignId}`
        const channel = pusherClient.subscribe(channelName)

        console.log(`🔌 Pusher Subscribed: ${channelName}`)
        setIsConnected(true)

        // Track connected players via JOIN_GAME events
        // Initialize with empty list
        setRoomInfo({ connectedPlayers: [] })

        // Get current user ID from options (for filtering targeted events)
        const currentUserId = options.userId || options.sessionToken

        // Listen for ALL events
        channel.bind('game-event', (data: any) => {
            // 1. Dispatch Game State
            if (data.actionType === 'GM_UPDATE_SCENE' || data.gameState) {
                eventCallbacksRef.current.onGameStateUpdate(data.gameState || { currentScene: data.payload?.sceneImageUrl })
            }

            // 2. Dispatch Roll Request (with filtering for targeted player)
            if (data.actionType === 'GM_REQUEST_ROLL') {
                console.log('📨 GM_REQUEST_ROLL event received:', {
                    targetPlayerId: data.targetPlayerId,
                    currentUserId,
                    payload: data.payload
                })

                // Only show roll request if it's for me OR if no specific target (broadcast to all)
                if (!data.targetPlayerId || data.targetPlayerId === currentUserId) {
                    console.log('✅ Processing roll request for me')
                    eventCallbacksRef.current.onRollRequested(data.payload)
                } else {
                    console.log('❌ Roll request not for me, ignoring')
                }
            }

            // 3. Dispatch Dice Result
            if (data.actionType === 'dice_roll') {
                eventCallbacksRef.current.onDiceResult(data)
            }

            // 4. Player Actions
            if (['move', 'attack', 'talk', 'inspect', 'custom', 'JOIN_GAME'].includes(data.actionType)) {
                eventCallbacksRef.current.onPlayerAction(data)

                // Track player joins for room info
                if (data.actionType === 'JOIN_GAME' && data.characterData) {
                    setRoomInfo((prev: any) => {
                        const existing = prev?.connectedPlayers || []
                        const alreadyExists = existing.some((p: any) => p.id === data.characterData.id)
                        if (alreadyExists) return prev

                        return {
                            ...prev,
                            connectedPlayers: [...existing, {
                                id: data.characterData.id,
                                name: data.characterData.name || data.actorName,
                                role: data.characterData.role || 'PLAYER',
                                hp: data.characterData.hp,
                                maxHp: data.characterData.maxHp,
                                avatarUrl: data.characterData.avatarUrl
                            }]
                        }
                    })
                }
            }

            // ✅ 5. Whisper (Handle Whispers) - WITH FILTERING
            if (data.type === 'WHISPER' || data.actionType === 'WHISPER') {
                console.log('📨 Whisper event received:', data, 'currentUserId:', currentUserId)

                // Only process if this whisper is for me OR if I'm the sender (GM confirmation)
                if (!data.targetPlayerId || data.targetPlayerId === currentUserId || currentUserId === 'DEMO_GM_TOKEN') {
                    console.log('✅ Processing whisper')
                    eventCallbacksRef.current.onWhisperReceived({
                        sender: data.sender || 'System',
                        message: data.message || data.payload?.message
                    })
                } else {
                    console.log('❌ Whisper filtered out - not for me')
                }
            }

            // ✅ 6. Private Scene Update - WITH FILTERING
            if (data.type === 'PRIVATE_SCENE_UPDATE') {
                console.log('📨 Private scene event received:', data, 'currentUserId:', currentUserId)

                // Only process if this is for me OR if it's a global clear (no targetPlayerId)
                if (!data.targetPlayerId || data.targetPlayerId === currentUserId) {
                    console.log('✅ Processing private scene update')
                    eventCallbacksRef.current.onPrivateSceneUpdate({
                        sceneId: data.payload?.sceneId
                    })
                } else {
                    console.log('❌ Private scene filtered out - not for me')
                }
            }
        })

        return () => {
            channel.unbind_all()
            channel.unsubscribe()
        }
    }, [campaignId])

    // --- Sending Actions (API Calls) ---
    // Helper function to call API
    const callApi = async (body: any) => {
        try {
            await fetch('/api/game/pusher', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...body, campaignId })
            })
        } catch (err) {
            console.error('API Error:', err)
        }
    }

    const sendPlayerAction = useCallback((action: PlayerActionData) => callApi({ action }), [campaignId])

    const sendGMUpdate = useCallback((gameState: GameStateUpdate) =>
        callApi({ action: { actionType: 'GM_UPDATE_SCENE', payload: gameState } }),
        [campaignId])

    const requestRoll = useCallback((checkType: string, dc: number = 10, targetPlayerId?: string) =>
        callApi({ action: { type: 'GM_REQUEST_ROLL', targetPlayerId, payload: { checkType, dc } } }),
        [campaignId])

    // ✅ เพิ่ม Methods ฝั่ง GM Control ให้ครบ
    const setPrivateScene = useCallback((playerId: string, sceneId: string | null) =>
        callApi({ action: { type: 'PRIVATE_SCENE_UPDATE', targetPlayerId: playerId, payload: { sceneId } } }),
        [campaignId])

    const sendWhisper = useCallback((targetPlayerId: string, message: string) =>
        callApi({ action: { type: 'WHISPER', targetPlayerId, message, sender: 'GM' } }),
        [campaignId])

    const setGlobalScene = useCallback((sceneId: string) =>
        sendGMUpdate({ currentScene: sceneId } as any),
        [sendGMUpdate])

    // --- Callback Setters ---
    const onGameStateUpdate = (cb: any) => { eventCallbacksRef.current.onGameStateUpdate = cb }
    const onPlayerAction = (cb: any) => { eventCallbacksRef.current.onPlayerAction = cb }
    const onChatMessage = (cb: any) => { eventCallbacksRef.current.onChatMessage = cb }
    const onDiceResult = (cb: any) => { eventCallbacksRef.current.onDiceResult = cb }
    const onRollRequested = (cb: any) => { eventCallbacksRef.current.onRollRequested = cb }
    // ✅ Setter ที่หายไป
    const onWhisperReceived = (cb: any) => { eventCallbacksRef.current.onWhisperReceived = cb }
    const onPrivateSceneUpdate = (cb: any) => { eventCallbacksRef.current.onPrivateSceneUpdate = cb }
    const onPlayerJoined = (cb: any) => { eventCallbacksRef.current.onPlayerJoined = cb }

    // Stubs
    const measureLatency = () => { }
    const sendChatMessage = async (content: string) => { }
    const sendTypingIndicator = () => { }

    // ✅ RETURN ทุกอย่างออกไปให้ครบ
    return {
        isConnected,
        roomInfo,
        sendPlayerAction,
        sendGMUpdate,
        requestRoll,
        setPrivateScene, // <--- มาแล้ว
        sendWhisper,     // <--- มาแล้ว
        setGlobalScene,  // <--- มาแล้ว

        onGameStateUpdate,
        onPlayerAction,
        onChatMessage,
        onDiceResult,
        onRollRequested,
        onWhisperReceived, // <--- แก้ Error ตัวนี้
        onPrivateSceneUpdate,
        onPlayerJoined,

        measureLatency,
        sendChatMessage,
        sendTypingIndicator
    }
}