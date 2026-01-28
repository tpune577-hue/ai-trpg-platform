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

    // ✅ เพิ่ม Ref สำหรับติดตามสถานะการเชื่อมต่อ (เพื่อใช้ใน broadcast ได้ทันที)
    const isChannelConnectedRef = useRef(false)

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

        // Reset status เมื่อเริ่ม connect ใหม่
        setIsConnected(false)
        isChannelConnectedRef.current = false

        const channel = supabase.channel(channelName, {
            config: {
                broadcast: { self: true },
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
                console.log(`📡 Supabase Realtime Event [${data.actionType || data.type}]:`, data)
                const currentUserId = options.userId || options.sessionToken

                // ... (Logic การจัดการ Event ทั้งหมดเหมือนเดิม) ...

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
                if (['move', 'attack', 'talk', 'inspect', 'custom', 'JOIN_GAME', 'GM_MANAGE_INVENTORY'].includes(data.actionType)) {
                    eventCallbacksRef.current.onPlayerAction(data)
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
                const handledActions = ['GM_UPDATE_SCENE', 'GM_REQUEST_ROLL', 'dice_roll', 'rnr_roll', 'chat', 'whisper', 'WHISPER', 'PRIVATE_SCENE_UPDATE', 'ANNOUNCE', 'GM_MANAGE_INVENTORY', 'JOIN_GAME']
                if (!handledActions.includes(data.actionType)) {
                    eventCallbacksRef.current.onPlayerAction(data)
                }
            })
            .subscribe(async (status) => {
                // ✅ อัปเดตสถานะการเชื่อมต่อเมื่อ Subscribe สำเร็จ
                if (status === 'SUBSCRIBED') {
                    console.log(`🔌 Supabase Realtime Subscribed: ${channelName}`)
                    setIsConnected(true)
                    isChannelConnectedRef.current = true // Update Ref

                    if (options.userId) {
                        await channel.track({
                            userId: options.userId,
                            onlineAt: new Date().toISOString()
                        })
                    }
                } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                    setIsConnected(false)
                    isChannelConnectedRef.current = false
                }
            })

        channelRef.current = channel

        return () => {
            if (channelRef.current) {
                console.log(`🔌 Supabase Realtime Unsubscribed: ${channelName}`)
                channelRef.current.unsubscribe()
                isChannelConnectedRef.current = false
            }
        }
    }, [campaignId, options.userId, options.sessionToken])

    // --- การส่งข้อมูล (Send Actions) ---

    const broadcast = async (data: any) => {
        // ✅ เช็คสถานะจาก Ref ก่อนส่ง เพื่อป้องกัน Warning "falling back to REST API"
        if (channelRef.current && isChannelConnectedRef.current) {
            await channelRef.current.send({
                type: 'broadcast',
                event: 'game-event',
                payload: data,
            })
        } else {
            console.warn("⚠️ Socket not connected yet. Action queued or skipped:", data.actionType)
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

    return {
        isConnected,
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

        measureLatency: () => { },
        sendChatMessage: async (content: string) => { },
        sendTypingIndicator: () => { }
    }
}