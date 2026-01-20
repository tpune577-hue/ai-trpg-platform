'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Pusher from 'pusher-js'
import { PlayerActionData, GameStateUpdate, SocketChatMessage, UserProfile } from '@/types/socket'

// ตั้งค่า Pusher Client (ตรวจสอบให้แน่ใจว่า .env มีค่า Key ครบถ้วน)
const pusherClient = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
})

export const useGameSocket = (campaignId: string | null, options: any = {}) => {
    const [isConnected, setIsConnected] = useState(false)
    const [roomInfo, setRoomInfo] = useState<any>(null) // Mock room info for Pusher

    // Event Refs (ใช้ Ref เพื่อแก้ปัญหา Closure ใน useEffect)
    const eventCallbacksRef = useRef({
        onPlayerAction: (action: PlayerActionData) => { },
        onGameStateUpdate: (state: GameStateUpdate) => { },
        onChatMessage: (message: SocketChatMessage) => { },
        onDiceResult: (result: any) => { },
        onRollRequested: (request: { checkType: string, dc: number }) => { },
        onWhisperReceived: (data: { sender: string, message: string }) => { },
        onPrivateSceneUpdate: (data: { sceneId: string | null }) => { },
        onPlayerJoined: (profile: UserProfile) => { },
        onAnnounce: (data: { message: string }) => { },
    })

    useEffect(() => {
        if (!campaignId) return

        const channelName = `campaign-${campaignId}`
        const channel = pusherClient.subscribe(channelName)

        console.log(`🔌 Pusher Subscribed: ${channelName}`)
        setIsConnected(true)

        // Initialize Room Info
        setRoomInfo({ connectedPlayers: [] })

        // Get current user ID (for filtering events)
        const currentUserId = options.userId || options.sessionToken

        // --- Listen for ALL events ---
        channel.bind('game-event', (data: any) => {
            console.log(`🔌 Pusher Event on ${channelName}:`, data.actionType || data.type, data)
            // Debug for GM_UPDATE_SCENE
            if (data.actionType === 'GM_UPDATE_SCENE') {
                console.log("🔍 GM_UPDATE_SCENE Detail:", {
                    hasGameState: !!data.gameState,
                    hasPayload: !!data.payload,
                    keys: Object.keys(data)
                })
            }

            // 1. Game State Update
            // รองรับทั้ง payload แบบเก่า (activeNpcs) และแบบใหม่ (sceneImageUrl)
            if (data.actionType === 'GM_UPDATE_SCENE' || data.gameState) {
                eventCallbacksRef.current.onGameStateUpdate(data.gameState || data.payload)
            }

            // 2. Roll Request
            if (data.actionType === 'GM_REQUEST_ROLL') {
                // Filter: รับเฉพาะถ้าส่งหาทุกคน หรือส่งหาเราโดยเฉพาะ
                if (!data.targetPlayerId || data.targetPlayerId === currentUserId) {
                    eventCallbacksRef.current.onRollRequested(data.payload)
                }
            }

            // 3. Dice Result (D20 & RnR)
            if (data.actionType === 'dice_roll' || data.actionType === 'rnr_roll') {
                console.log('🎲 useGameSocket: Calling onDiceResult with:', data)
                eventCallbacksRef.current.onDiceResult(data)
            }

            // 4. Player Actions & Inventory
            // ✅ เพิ่ม 'GM_MANAGE_INVENTORY' เข้าไปเพื่อให้ Client รับรู้ว่ามีการแจกของ
            // ❌ ลบ 'rnr_roll' และ 'RNR_LIVE_UPDATE' ออก - ให้ไปที่ general handler แทน
            if (['move', 'attack', 'talk', 'inspect', 'custom', 'JOIN_GAME', 'GM_MANAGE_INVENTORY'].includes(data.actionType)) {

                eventCallbacksRef.current.onPlayerAction(data)

                // Logic เฉพาะสำหรับคนเข้าห้อง (Update รายชื่อคนออนไลน์แบบ Real-time)
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

            // 5. Whisper
            if (data.type === 'WHISPER' || data.actionType === 'WHISPER') {
                // Filter: รับเฉพาะถ้าส่งหาเรา หรือเราเป็นคนส่งเอง (เพื่อให้เห็นข้อความที่ตัวเองส่ง)
                if (!data.targetPlayerId || data.targetPlayerId === currentUserId || currentUserId === 'DEMO_GM_TOKEN') {
                    eventCallbacksRef.current.onWhisperReceived({
                        sender: data.sender || 'System',
                        message: data.message || data.payload?.message
                    })
                }
            }

            // 6. Private Scene Update
            if (data.type === 'PRIVATE_SCENE_UPDATE') {
                // Filter: รับเฉพาะถ้าส่งหาเรา
                if (!data.targetPlayerId || data.targetPlayerId === currentUserId) {
                    eventCallbacksRef.current.onPrivateSceneUpdate({
                        sceneId: data.payload?.sceneId
                    })
                }
            }


            // 7. Announce (GM broadcasts message to all players)
            if (data.type === 'ANNOUNCE' || data.actionType === 'ANNOUNCE') {
                console.log('📢 Socket Received ANNOUNCE:', data)
                eventCallbacksRef.current.onAnnounce({
                    message: data.message || data.payload?.message || ''
                })
            }

            // 8. Player Actions (Catch-all for unknown actions)
            // Skip actions already handled above in block #4, and other specific types
            // General Player Action Handler
            // ✅ ส่งทุก action ที่ไม่ได้ถูก handle แล้ว
            const handledActions = ['GM_UPDATE_SCENE', 'GM_REQUEST_ROLL', 'dice_roll', 'rnr_roll', 'chat', 'whisper', 'WHISPER', 'PRIVATE_SCENE_UPDATE', 'ANNOUNCE', 'GM_MANAGE_INVENTORY', 'JOIN_GAME']

            if (!handledActions.includes(data.actionType)) {


                console.log('📨 useGameSocket processing player action:', {
                    actionType: data.actionType,
                    actorName: data.actorName,
                    hasDetails: !!data.details,
                    details: data.details
                })

                eventCallbacksRef.current.onPlayerAction({
                    actorId: data.actorId, // ✅ Pass actorId
                    actorName: data.actorName || 'Unknown',
                    actionType: data.actionType,
                    description: data.description || '',
                    payload: data.payload,
                    targetPlayerId: data.targetPlayerId,
                    // ✅ เพิ่ม fields สำหรับ RnR
                    details: data.details,
                    total: data.total,
                    willBoost: data.willBoost,
                    isRequested: data.isRequested,
                    isPrivate: data.isPrivate // ✅ Pass isPrivate flag
                })
            }
        })

        return () => {
            channel.unbind_all()
            channel.unsubscribe()
        }
    }, [campaignId])

    // --- Sending Actions (API Calls) ---
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
        callApi({ action: { actionType: 'GM_REQUEST_ROLL', targetPlayerId, payload: { checkType, dc } } }),
        [campaignId])

    const setPrivateScene = useCallback((playerId: string, sceneId: string | null) =>
        callApi({ action: { actionType: 'PRIVATE_SCENE_UPDATE', targetPlayerId: playerId, payload: { sceneId } } }),
        [campaignId])

    const sendWhisper = useCallback((targetPlayerId: string, message: string) =>
        callApi({ action: { actionType: 'WHISPER', targetPlayerId, message, sender: 'GM' } }),
        [campaignId])

    const setGlobalScene = useCallback((sceneId: string) =>
        sendGMUpdate({ currentScene: sceneId } as any),
        [sendGMUpdate])

    // ✅ ฟังก์ชันใหม่: สำหรับแจกของ (ใช้ใน GM Panel)
    const giveItem = useCallback((targetPlayerId: string, itemData: any, action: 'GIVE_CUSTOM' | 'REMOVE' = 'GIVE_CUSTOM') => {
        const actionText = action === 'REMOVE' ? 'removed' : 'gave'
        const description = `${actionText} ${itemData.name || 'item'}`

        return callApi({
            action: {
                actionType: 'GM_MANAGE_INVENTORY',
                actorName: 'Game Master',
                description,
                targetPlayerId,
                payload: { itemData, action }
            }
        })
    }, [campaignId])

    // --- Callback Setters ---
    const onGameStateUpdate = (cb: any) => { eventCallbacksRef.current.onGameStateUpdate = cb }
    const onPlayerAction = (cb: any) => { eventCallbacksRef.current.onPlayerAction = cb }
    const onChatMessage = (cb: any) => { eventCallbacksRef.current.onChatMessage = cb }
    const onDiceResult = (cb: any) => { eventCallbacksRef.current.onDiceResult = cb }
    const onRollRequested = (cb: any) => { eventCallbacksRef.current.onRollRequested = cb }
    const onWhisperReceived = (cb: any) => { eventCallbacksRef.current.onWhisperReceived = cb }
    const onPrivateSceneUpdate = (cb: any) => { eventCallbacksRef.current.onPrivateSceneUpdate = cb }
    const onPlayerJoined = (cb: any) => { eventCallbacksRef.current.onPlayerJoined = cb }
    const onAnnounce = (cb: any) => { eventCallbacksRef.current.onAnnounce = cb }

    // Stubs (สำหรับความเข้ากันได้กับโค้ดเก่า)
    const measureLatency = () => { }
    const sendChatMessage = async (content: string) => { }
    const sendTypingIndicator = () => { }

    return {
        isConnected,
        roomInfo,
        sendPlayerAction,
        sendGMUpdate,
        requestRoll,
        setPrivateScene,
        sendWhisper,
        setGlobalScene,
        giveItem, // ✅ ส่งออกไปใช้งาน (แก้ Error onGiveItem is not a function)

        onGameStateUpdate,
        onPlayerAction,
        onChatMessage,
        onDiceResult,
        onRollRequested,
        onWhisperReceived,
        onPrivateSceneUpdate,
        onPlayerJoined,
        onAnnounce,

        measureLatency,
        sendChatMessage,
        sendTypingIndicator
    }
}