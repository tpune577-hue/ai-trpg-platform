'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { DEMO_GAME_STATE, DEMO_CHARACTER, GM_RESPONSE_TEMPLATES } from '@/lib/demo-data'

export const useGameSocket = (campaignId: string | null) => {
    const [isConnected, setIsConnected] = useState(false)

    const eventCallbacksRef = useRef<{
        onPlayerAction?: (action: any) => void
        onGameStateUpdate?: (state: any) => void
        onChatMessage?: (message: any) => void
        onPlayerJoined?: (profile: any) => void
        onDiceResult?: (result: any) => void
        onRollRequested?: (request: any) => void
    }>({})

    useEffect(() => {
        console.log('🔌 (SIMULATION) Connected')
        setIsConnected(true)
        const syncChannel = new BroadcastChannel('game_demo_channel')

        syncChannel.onmessage = (event) => {
            const { type, payload } = event.data

            if (type === 'PLAYER_ACTION') {
                if (eventCallbacksRef.current.onPlayerAction) eventCallbacksRef.current.onPlayerAction(payload)
            }
            if (type === 'GM_REQUEST_ROLL') {
                if (eventCallbacksRef.current.onRollRequested) eventCallbacksRef.current.onRollRequested(payload)
            }
            if (type === 'SYNC_UPDATE') {
                if (eventCallbacksRef.current.onGameStateUpdate) eventCallbacksRef.current.onGameStateUpdate(payload.newState)
                if (eventCallbacksRef.current.onChatMessage && payload.chatMessage) eventCallbacksRef.current.onChatMessage(payload.chatMessage)
                if (eventCallbacksRef.current.onDiceResult && payload.diceResult) eventCallbacksRef.current.onDiceResult(payload.diceResult)
            }
        }

        // Initial Load & Mock Data
        const timer = setTimeout(() => {
            if (eventCallbacksRef.current.onGameStateUpdate) eventCallbacksRef.current.onGameStateUpdate(DEMO_GAME_STATE)

            // Welcome Message
            if (eventCallbacksRef.current.onChatMessage) {
                eventCallbacksRef.current.onChatMessage({
                    id: 'welcome',
                    content: DEMO_GAME_STATE.currentScene,
                    type: 'NARRATION',
                    senderName: 'GM',
                    createdAt: new Date().toISOString()
                })
            }

            // ✅ MOCK PLAYERS: สร้างตัวละครจำลอง 2 ตัว (Aragorn & Legolas) ให้ GM เห็นทันที
            const mockPlayers = [
                {
                    id: 'mock-p1',
                    name: 'Aragorn',
                    role: 'WARRIOR',
                    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aragorn',
                    hp: 120, maxHp: 120, mp: 20, maxMp: 20,
                    stats: { STR: 16, DEX: 12, CON: 15, INT: 8, WIS: 10, CHA: 10 }
                },
                {
                    id: 'mock-p2',
                    name: 'Legolas',
                    role: 'ROGUE',
                    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Legolas',
                    hp: 80, maxHp: 80, mp: 40, maxMp: 40,
                    stats: { STR: 10, DEX: 18, CON: 12, INT: 12, WIS: 14, CHA: 10 }
                }
            ]

            // ส่ง Mock Players เข้าไปในระบบ (ผ่าน onPlayerAction เหมือนตอนคน Join จริง)
            if (eventCallbacksRef.current.onPlayerAction) {
                mockPlayers.forEach(p => {
                    eventCallbacksRef.current.onPlayerAction!({
                        actionType: 'JOIN_GAME',
                        characterData: p
                    })
                })
            }

        }, 500)

        return () => {
            clearTimeout(timer)
            syncChannel.close()
            setIsConnected(false)
        }
    }, [campaignId])

    // --- Actions --- (ส่วนนี้เหมือนเดิม)
    const sendPlayerAction = useCallback((actionData: any) => {
        const syncChannel = new BroadcastChannel('game_demo_channel')
        syncChannel.postMessage({ type: 'PLAYER_ACTION', payload: actionData })

        setTimeout(() => {
            let narration = GM_RESPONSE_TEMPLATES.default
            let diceResult = null

            if (actionData.actionType === 'JOIN_GAME') {
                narration = `${actionData.actorName} has joined the adventure.`
            }
            else if (actionData.actionType === 'dice_roll') {
                const isSuccess = actionData.total >= (actionData.dc || 10)
                const resultText = isSuccess ? "(Success!)" : "(Failed...)"
                narration = `${actionData.actorName} rolled ${actionData.checkType}: ${actionData.total} ${resultText}`
                diceResult = { total: actionData.total, detail: `1d20 (${actionData.roll}) + ${actionData.mod}` }
            }
            else if (actionData.actionType === 'custom') narration = actionData.description
            else if (actionData.actionType === 'attack') { narration = GM_RESPONSE_TEMPLATES.attack; diceResult = { total: 15, detail: "1d20 (12) + STR (3)" } }
            else if (actionData.actionType === 'magic') narration = GM_RESPONSE_TEMPLATES.magic
            else if (actionData.actionType === 'heal') narration = GM_RESPONSE_TEMPLATES.heal
            else if (actionData.actionType === 'move') narration = GM_RESPONSE_TEMPLATES.move
            else if (actionData.actionType === 'talk') narration = GM_RESPONSE_TEMPLATES.talk
            else if (actionData.actionType === 'inspect') narration = GM_RESPONSE_TEMPLATES.explore

            const newState = { ...DEMO_GAME_STATE, currentScene: narration, recentEvents: [narration, ...DEMO_GAME_STATE.recentEvents] }

            const newChatMessage = {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                content: narration,
                type: actionData.actionType === 'custom' && actionData.actorName === 'Game Master' ? 'NARRATION' : 'ACTION',
                senderName: actionData.actorName || 'GM',
                createdAt: new Date().toISOString()
            }

            if (eventCallbacksRef.current.onGameStateUpdate) eventCallbacksRef.current.onGameStateUpdate(newState)
            if (eventCallbacksRef.current.onChatMessage) eventCallbacksRef.current.onChatMessage(newChatMessage)
            if (diceResult && eventCallbacksRef.current.onDiceResult) eventCallbacksRef.current.onDiceResult(diceResult)

            syncChannel.postMessage({ type: 'SYNC_UPDATE', payload: { newState, chatMessage: newChatMessage, diceResult } })
            syncChannel.close()
        }, 500)
        return Promise.resolve({ success: true })
    }, [])

    const requestRoll = useCallback((checkType: string, dc: number = 10) => {
        const syncChannel = new BroadcastChannel('game_demo_channel')
        syncChannel.postMessage({ type: 'GM_REQUEST_ROLL', payload: { checkType, dc, timestamp: Date.now() } })
        syncChannel.close()
    }, [])

    const onGameStateUpdate = useCallback((cb: any) => { eventCallbacksRef.current.onGameStateUpdate = cb }, [])
    const onPlayerAction = useCallback((cb: any) => { eventCallbacksRef.current.onPlayerAction = cb }, [])
    const onChatMessage = useCallback((cb: any) => { eventCallbacksRef.current.onChatMessage = cb }, [])
    const onPlayerJoined = useCallback((cb: any) => { eventCallbacksRef.current.onPlayerJoined = cb }, [])
    const onDiceResult = useCallback((cb: any) => { eventCallbacksRef.current.onDiceResult = cb }, [])
    const onRollRequested = useCallback((cb: any) => { eventCallbacksRef.current.onRollRequested = cb }, [])

    return { isConnected, sendPlayerAction, requestRoll, onGameStateUpdate, onPlayerAction, onChatMessage, onPlayerJoined, onDiceResult, onRollRequested }
}