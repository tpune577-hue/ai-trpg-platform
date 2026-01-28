'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { PlayerActionData, GameStateUpdate, SocketChatMessage, UserProfile } from '@/types/socket'
import { RealtimeChannel } from '@supabase/supabase-js'

export const useGameSocket = (campaignId: string | null, options: any = {}) => {
    const [isConnected, setIsConnected] = useState(false)
    const [roomInfo, setRoomInfo] = useState<any>({ connectedPlayers: [] })
    const [onlineUsers, setOnlineUsers] = useState<any[]>([])

    const channelRef = useRef<RealtimeChannel | null>(null)
    const isChannelConnectedRef = useRef(false) // ใช้ Ref เช็คสถานะเพื่อความแม่นยำ
    const messageQueueRef = useRef<any[]>([])   // คิวเก็บข้อความ

    // Event Refs
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
        if (!campaignId || !supabase) return

        const channelName = `campaign-${campaignId}`

        // Reset state
        setIsConnected(false)
        isChannelConnectedRef.current = false

        const channel = supabase.channel(channelName, {
            config: {
                broadcast: { self: true }, // ✅ สำคัญ: รับข้อความที่ตัวเองส่งด้วย (เพื่อให้ GM ได้ยินเสียงตัวเอง)
                presence: { key: options.userId || 'anon' },
            },
        })

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState()
                const users = Object.keys(state).map(key => {
                    const data = state[key]?.[0] as any
                    return { userId: key, ...data }
                })
                setOnlineUsers(users)
            })
            .on('broadcast', { event: 'game-event' }, ({ payload: data }) => {
                // console.log(`📡 Event: ${data.actionType}`, data) // Uncomment ถ้าอยากดู Log
                const currentUserId = options.userId || options.sessionToken

                if (data.actionType === 'GM_UPDATE_SCENE' || data.gameState) {
                    eventCallbacksRef.current.onGameStateUpdate(data.gameState || data.payload)
                }
                if (data.actionType === 'GM_REQUEST_ROLL') {
                    if (!data.targetPlayerId || data.targetPlayerId === currentUserId) {
                        eventCallbacksRef.current.onRollRequested(data.payload)
                    }
                }
                if (data.actionType === 'dice_roll' || data.actionType === 'rnr_roll') {
                    eventCallbacksRef.current.onDiceResult(data)
                }

                // General Actions
                const generalActions = ['move', 'attack', 'talk', 'inspect', 'custom', 'JOIN_GAME', 'GM_MANAGE_INVENTORY', 'PLAY_AUDIO', 'STOP_BGM']
                if (generalActions.includes(data.actionType)) {
                    eventCallbacksRef.current.onPlayerAction(data)

                    // Handle Join
                    if (data.actionType === 'JOIN_GAME' && data.characterData) {
                        setRoomInfo((prev: any) => {
                            const existing = prev?.connectedPlayers || []
                            if (existing.some((p: any) => p.id === data.characterData.id)) return prev
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

                if (data.type === 'WHISPER' || data.actionType === 'WHISPER') {
                    if (!data.targetPlayerId || data.targetPlayerId === currentUserId || currentUserId === 'DEMO_GM_TOKEN') {
                        eventCallbacksRef.current.onWhisperReceived({
                            sender: data.sender || 'System',
                            message: data.message || data.payload?.message
                        })
                    }
                }
                if (data.type === 'PRIVATE_SCENE_UPDATE') {
                    if (!data.targetPlayerId || data.targetPlayerId === currentUserId) {
                        eventCallbacksRef.current.onPrivateSceneUpdate({ sceneId: data.payload?.sceneId })
                    }
                }
                if (data.type === 'ANNOUNCE' || data.actionType === 'ANNOUNCE') {
                    eventCallbacksRef.current.onAnnounce({
                        message: data.message || data.payload?.message || ''
                    })
                }
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`✅ Socket Connected: ${channelName}`)
                    setIsConnected(true)
                    isChannelConnectedRef.current = true

                    // 🚀 Flush Queue: ส่งข้อความที่ค้างอยู่ทันทีที่ต่อติด
                    if (messageQueueRef.current.length > 0) {
                        console.log(`📨 Flushing ${messageQueueRef.current.length} queued actions...`)
                        for (const msg of messageQueueRef.current) {
                            await channel.send(msg)
                        }
                        messageQueueRef.current = [] // Clear queue
                    }

                    if (options.userId) {
                        await channel.track({
                            userId: options.userId,
                            onlineAt: new Date().toISOString()
                        })
                    }
                } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                    console.warn(`❌ Socket Disconnected: ${status}`)
                    setIsConnected(false)
                    isChannelConnectedRef.current = false
                }
            })

        channelRef.current = channel

        return () => {
            if (channelRef.current) {
                channelRef.current.unsubscribe()
                isChannelConnectedRef.current = false
            }
        }
    }, [campaignId, options.userId, options.sessionToken])

    // --- Broadcast Function (Improved) ---
    const broadcast = async (data: any) => {
        const payload = {
            type: 'broadcast',
            event: 'game-event',
            payload: data,
        }

        if (channelRef.current && isChannelConnectedRef.current) {
            // ✅ ส่งทันทีถ้าต่อติด
            await channelRef.current.send(payload)
        } else {
            // ⚠️ ถ้ายังไม่ต่อ ให้เก็บใส่คิว
            console.warn("⏳ Socket connecting... Action queued:", data.actionType)
            messageQueueRef.current.push(payload)
        }
    }

    const sendPlayerAction = useCallback((action: PlayerActionData) => broadcast(action), [campaignId])

    const sendGMUpdate = useCallback((gameState: GameStateUpdate) =>
        broadcast({ actionType: 'GM_UPDATE_SCENE', payload: gameState }),
        [campaignId])

    const requestRoll = useCallback((checkType: string, dc: number = 10, targetPlayerId?: string) =>
        broadcast({ actionType: 'GM_REQUEST_ROLL', targetPlayerId, payload: { checkType, dc } }),
        [campaignId])

    const setPrivateScene = useCallback((playerId: string, sceneId: string | null) =>
        broadcast({ actionType: 'PRIVATE_SCENE_UPDATE', targetPlayerId: playerId, payload: { sceneId } }),
        [campaignId])

    const sendWhisper = useCallback((targetPlayerId: string, message: string) =>
        broadcast({ actionType: 'WHISPER', targetPlayerId, message, sender: 'GM' }),
        [campaignId])

    const setGlobalScene = useCallback((sceneId: string) =>
        sendGMUpdate({ currentScene: sceneId } as any),
        [sendGMUpdate])

    const giveItem = useCallback((targetPlayerId: string, itemData: any, action: 'GIVE_CUSTOM' | 'REMOVE' = 'GIVE_CUSTOM') => {
        const actionText = action === 'REMOVE' ? 'removed' : 'gave'
        return broadcast({
            actionType: 'GM_MANAGE_INVENTORY',
            actorName: 'Game Master',
            description: `${actionText} ${itemData.name || 'item'}`,
            targetPlayerId,
            payload: { itemData, action }
        })
    }, [campaignId])

    // Callback Setters
    const onGameStateUpdate = (cb: any) => { eventCallbacksRef.current.onGameStateUpdate = cb }
    const onPlayerAction = (cb: any) => { eventCallbacksRef.current.onPlayerAction = cb }
    const onChatMessage = (cb: any) => { eventCallbacksRef.current.onChatMessage = cb }
    const onDiceResult = (cb: any) => { eventCallbacksRef.current.onDiceResult = cb }
    const onRollRequested = (cb: any) => { eventCallbacksRef.current.onRollRequested = cb }
    const onWhisperReceived = (cb: any) => { eventCallbacksRef.current.onWhisperReceived = cb }
    const onPrivateSceneUpdate = (cb: any) => { eventCallbacksRef.current.onPrivateSceneUpdate = cb }
    const onPlayerJoined = (cb: any) => { eventCallbacksRef.current.onPlayerJoined = cb }
    const onAnnounce = (cb: any) => { eventCallbacksRef.current.onAnnounce = cb }

    return {
        isConnected, // ✅ Return status
        onlineUsers,
        roomInfo,
        sendPlayerAction,
        sendGMUpdate,
        requestRoll,
        setPrivateScene,
        sendWhisper,
        setGlobalScene,
        giveItem,
        onGameStateUpdate,
        onPlayerAction,
        onChatMessage,
        onDiceResult,
        onRollRequested,
        onWhisperReceived,
        onPrivateSceneUpdate,
        onPlayerJoined,
        onAnnounce,
    }
}