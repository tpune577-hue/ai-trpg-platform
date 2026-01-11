'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { DEMO_GAME_STATE, DEMO_CHARACTER, GM_RESPONSE_TEMPLATES } from '@/lib/demo-data'

export const useGameSocket = (campaignId: string | null) => {
    const [isConnected, setIsConnected] = useState(false)

    // Callbacks refs
    const eventCallbacksRef = useRef<{
        onPlayerAction?: (action: any) => void
        onGameStateUpdate?: (state: any) => void
        onCharacterData?: (data: any) => void
        onChatMessage?: (message: any) => void
        onPlayerJoined?: (profile: any) => void
        onPlayerLeft?: (data: any) => void
        onDiceResult?: (result: any) => void
        onRollRequested?: (request: any) => void
    }>({})

    useEffect(() => {
        console.log('🔌 (SIMULATION) Connected')
        setIsConnected(true)
        const syncChannel = new BroadcastChannel('game_demo_channel')

        // ฟังวิทยุจากแท็บอื่น (Cross-tab communication)
        syncChannel.onmessage = (event) => {
            const { type, payload } = event.data

            // 1. ถ้า GM สั่งให้ทอยเต๋า (Player จะได้ยินอันนี้)
            if (type === 'GM_REQUEST_ROLL') {
                if (eventCallbacksRef.current.onRollRequested) {
                    eventCallbacksRef.current.onRollRequested(payload)
                }
            }

            // 2. ถ้ามีการอัปเดตเกม (GM จะได้ยินอันนี้)
            if (type === 'SYNC_UPDATE') {
                if (eventCallbacksRef.current.onGameStateUpdate) eventCallbacksRef.current.onGameStateUpdate(payload.newState)
                if (eventCallbacksRef.current.onChatMessage && payload.chatMessage) eventCallbacksRef.current.onChatMessage(payload.chatMessage)
                if (eventCallbacksRef.current.onDiceResult && payload.diceResult) eventCallbacksRef.current.onDiceResult(payload.diceResult)
            }
        }

        // เริ่มต้นระบบ (Initial Load)
        const timer = setTimeout(() => {
            // Load Scene
            if (eventCallbacksRef.current.onGameStateUpdate) eventCallbacksRef.current.onGameStateUpdate(DEMO_GAME_STATE)

            // Load Initial Chat
            if (eventCallbacksRef.current.onChatMessage) {
                eventCallbacksRef.current.onChatMessage({
                    id: 'welcome',
                    content: DEMO_GAME_STATE.currentScene,
                    type: 'NARRATION',
                    senderName: 'GM',
                    createdAt: new Date().toISOString()
                })
            }

            // Load Character for Player
            const mockEvent = new CustomEvent('player:character_data', { detail: DEMO_CHARACTER })
            window.dispatchEvent(mockEvent)

            // Fake Player Join (for GM view)
            if (eventCallbacksRef.current.onPlayerJoined) {
                eventCallbacksRef.current.onPlayerJoined({
                    id: 'demo-player-1',
                    name: 'Aragorn (Demo)',
                    role: 'PLAYER',
                    characterName: 'Aragorn',
                    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=player'
                })
            }
        }, 500)

        return () => {
            clearTimeout(timer)
            syncChannel.close()
            setIsConnected(false)
        }
    }, [campaignId])

    // --- Actions ---

    // 1. Player/GM ส่ง Action (รวมถึง Custom Narration)
    const sendPlayerAction = useCallback((actionData: any) => {
        // จำลอง Network Delay
        setTimeout(() => {
            let narration = GM_RESPONSE_TEMPLATES.default
            let diceResult = null

            // Logic เลือกคำตอบ
            if (actionData.actionType === 'dice_roll') {
                // กรณีเป็นการทอยเต๋าตอบกลับจาก Player
                const isSuccess = actionData.total >= (actionData.dc || 10) // เช็คกับค่า DC (ถ้าไม่มีให้เป็น 10)
                const resultText = isSuccess ? "(Success!)" : "(Failed...)"

                narration = `${actionData.actorName} rolled ${actionData.checkType}: ${actionData.total} ${resultText}`
                diceResult = { total: actionData.total, detail: `1d20 (${actionData.roll}) + ${actionData.mod}` }
            }
            else if (actionData.actionType === 'custom') {
                // กรณี GM พิมพ์เอง หรือ Player พิมพ์เอง
                narration = actionData.description
            }
            else if (actionData.actionType === 'attack') {
                narration = GM_RESPONSE_TEMPLATES.attack
                diceResult = { total: 15, detail: "1d20 (12) + STR (3)" }
            }
            else if (actionData.actionType === 'magic') narration = GM_RESPONSE_TEMPLATES.magic
            else if (actionData.actionType === 'heal') narration = GM_RESPONSE_TEMPLATES.heal
            else if (actionData.actionType === 'move') narration = GM_RESPONSE_TEMPLATES.move
            else if (actionData.actionType === 'talk') narration = GM_RESPONSE_TEMPLATES.talk
            else if (actionData.actionType === 'inspect') narration = GM_RESPONSE_TEMPLATES.explore

            // สร้าง State ใหม่
            const newState = { ...DEMO_GAME_STATE, currentScene: narration, recentEvents: [narration, ...DEMO_GAME_STATE.recentEvents] }

            // สร้าง Chat Message
            const newChatMessage = {
                // ✅ แก้ไขตรงนี้: สร้าง ID แบบสุ่มเพื่อให้ไม่ซ้ำกันแม้กดรัวๆ
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,

                content: narration,
                type: actionData.actionType === 'custom' && actionData.actorName === 'Game Master' ? 'NARRATION' : 'ACTION',
                senderName: actionData.actorName || 'GM',
                createdAt: new Date().toISOString()
            }

            // Update หน้าตัวเอง (Local Update)
            if (eventCallbacksRef.current.onGameStateUpdate) eventCallbacksRef.current.onGameStateUpdate(newState)
            if (eventCallbacksRef.current.onChatMessage) eventCallbacksRef.current.onChatMessage(newChatMessage)
            if (diceResult && eventCallbacksRef.current.onDiceResult) eventCallbacksRef.current.onDiceResult(diceResult)

            // ส่งสัญญาณบอกเพื่อน (Broadcast Update)
            const syncChannel = new BroadcastChannel('game_demo_channel')
            syncChannel.postMessage({ type: 'SYNC_UPDATE', payload: { newState, chatMessage: newChatMessage, diceResult } })
            syncChannel.close()
        }, 500)
        return Promise.resolve({ success: true })
    }, [])

    // 2. GM สั่งให้ทอยเต๋า (Request Roll with DC)
    const requestRoll = useCallback((checkType: string, dc: number = 10) => {
        console.log(`GM Requesting Roll: ${checkType} (DC: ${dc})`)
        const syncChannel = new BroadcastChannel('game_demo_channel')
        syncChannel.postMessage({
            type: 'GM_REQUEST_ROLL',
            payload: {
                checkType,
                dc, // ส่งค่า DC ไปด้วย
                timestamp: Date.now()
            }
        })
        syncChannel.close()
    }, [])

    // Listeners setters
    const onGameStateUpdate = useCallback((cb: any) => { eventCallbacksRef.current.onGameStateUpdate = cb; cb(DEMO_GAME_STATE) }, [])
    const onPlayerAction = useCallback((cb: any) => { eventCallbacksRef.current.onPlayerAction = cb }, [])
    const onChatMessage = useCallback((cb: any) => { eventCallbacksRef.current.onChatMessage = cb }, [])
    const onPlayerJoined = useCallback((cb: any) => { eventCallbacksRef.current.onPlayerJoined = cb }, [])
    const onPlayerLeft = useCallback((cb: any) => { eventCallbacksRef.current.onPlayerLeft = cb }, [])
    const onDiceResult = useCallback((cb: any) => { eventCallbacksRef.current.onDiceResult = cb }, [])
    const onRollRequested = useCallback((cb: any) => { eventCallbacksRef.current.onRollRequested = cb }, [])

    return {
        socket: null,
        isConnected,
        isInRoom: true,
        connectionError: null,
        sendPlayerAction,
        requestRoll,
        onGameStateUpdate,
        onPlayerAction,
        onChatMessage,
        onPlayerJoined,
        onPlayerLeft,
        onDiceResult,
        onRollRequested
    }
}