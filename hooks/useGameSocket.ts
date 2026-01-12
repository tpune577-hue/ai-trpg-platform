'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { DEMO_GAME_STATE, GM_RESPONSE_TEMPLATES } from '@/lib/demo-data'

export const useGameSocket = (campaignId: string | null) => {
    const [isConnected, setIsConnected] = useState(false)

    // ✅ เก็บ State กลางไว้ที่นี่ เพื่อให้ Sync กันได้จริง
    // (ในของจริงคือ Database แต่ใน Mock เราใช้ Ref ช่วยจำค่าล่าสุดไว้)
    const currentGameStateRef = useRef<any>({
        ...DEMO_GAME_STATE,
        // ค่าเริ่มต้น
        sceneImageUrl: 'https://img.freepik.com/premium-photo/majestic-misty-redwood-forest-with-lush-green-ferns-sunlight-filtering-through-fog_996993-7424.jpg',
        activeNpcs: []
    })

    const eventCallbacksRef = useRef<{
        onPlayerAction?: (action: any) => void
        onGameStateUpdate?: (state: any) => void
        onChatMessage?: (message: any) => void
        onPlayerJoined?: (profile: any) => void
        onDiceResult?: (result: any) => void
        onRollRequested?: (request: any) => void
    }>({})

    useEffect(() => {
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
                // อัปเดต Ref กลางให้ตรงกันทุกหน้าต่าง
                currentGameStateRef.current = payload.newState
                if (eventCallbacksRef.current.onGameStateUpdate) eventCallbacksRef.current.onGameStateUpdate(payload.newState)
                if (eventCallbacksRef.current.onChatMessage && payload.chatMessage) eventCallbacksRef.current.onChatMessage(payload.chatMessage)
                if (eventCallbacksRef.current.onDiceResult && payload.diceResult) eventCallbacksRef.current.onDiceResult(payload.diceResult)
            }
        }

        // Initial Load
        const timer = setTimeout(() => {
            if (eventCallbacksRef.current.onGameStateUpdate) {
                eventCallbacksRef.current.onGameStateUpdate(currentGameStateRef.current)
            }

            // ... (Mock Players logic เดิม) ...
        }, 500)

        return () => {
            clearTimeout(timer)
            syncChannel.close()
            setIsConnected(false)
        }
    }, [campaignId])

    // --- Actions ---

    const sendPlayerAction = useCallback((actionData: any) => {
        const syncChannel = new BroadcastChannel('game_demo_channel')

        // ถ้าไม่ใช่คำสั่ง GM Update ให้ broadcast action ไปก่อน
        if (actionData.actionType !== 'GM_UPDATE_SCENE') {
            syncChannel.postMessage({ type: 'PLAYER_ACTION', payload: actionData })
        }

        setTimeout(() => {
            let narration = null
            let diceResult = null

            // ดึง State ล่าสุดมาตั้งต้น
            let newState = { ...currentGameStateRef.current }

            // ✅ LOGIC ใหม่: ถ้า GM สั่งเปลี่ยนฉาก/NPC
            if (actionData.actionType === 'GM_UPDATE_SCENE') {
                // อัปเดตข้อมูลฉากลงใน State กลาง
                if (actionData.payload.sceneImageUrl) newState.sceneImageUrl = actionData.payload.sceneImageUrl
                if (actionData.payload.activeNpcs) newState.activeNpcs = actionData.payload.activeNpcs

                // ไม่ต้องสร้าง Chat Log ก็ได้ หรือจะสร้างก็ได้ (ในที่นี้ไม่สร้างเพื่อให้เปลี่ยนเนียนๆ)
            }
            else if (actionData.actionType === 'JOIN_GAME') {
                narration = `${actionData.actorName} has joined the adventure.`
            }
            else if (actionData.actionType === 'dice_roll') {
                const isSuccess = actionData.total >= (actionData.dc || 10)
                const resultText = isSuccess ? "(Success!)" : "(Failed...)"
                narration = `${actionData.actorName} rolled ${actionData.checkType}: ${actionData.total} ${resultText}`
                diceResult = { total: actionData.total, detail: `1d20 (${actionData.roll}) + ${actionData.mod}` }
            }
            else if (actionData.actionType === 'custom') {
                narration = actionData.description
                newState.currentScene = narration // อัปเดต Text บรรยายฉากด้วย
            }
            // ... (Logic Action อื่นๆ เหมือนเดิม) ...
            else if (actionData.actionType === 'attack') { narration = GM_RESPONSE_TEMPLATES.attack; diceResult = { total: 15, detail: "1d20 (12) + STR (3)" } }
            else if (actionData.actionType === 'magic') narration = GM_RESPONSE_TEMPLATES.magic
            else if (actionData.actionType === 'heal') narration = GM_RESPONSE_TEMPLATES.heal
            else if (actionData.actionType === 'move') narration = GM_RESPONSE_TEMPLATES.move
            else if (actionData.actionType === 'talk') narration = GM_RESPONSE_TEMPLATES.talk
            else if (actionData.actionType === 'inspect') narration = GM_RESPONSE_TEMPLATES.explore

            // Create Chat Message (ถ้ามี narration)
            let newChatMessage = null
            if (narration) {
                newChatMessage = {
                    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    content: narration,
                    type: actionData.actionType === 'custom' && actionData.actorName === 'Game Master' ? 'NARRATION' : 'ACTION',
                    senderName: actionData.actorName || 'GM',
                    createdAt: new Date().toISOString()
                }
                newState.currentScene = narration // อัปเดต Text ปัจจุบัน
                newState.recentEvents = [narration, ...newState.recentEvents]
            }

            // Update Ref
            currentGameStateRef.current = newState

            // Trigger Local Callbacks
            if (eventCallbacksRef.current.onGameStateUpdate) eventCallbacksRef.current.onGameStateUpdate(newState)
            if (newChatMessage && eventCallbacksRef.current.onChatMessage) eventCallbacksRef.current.onChatMessage(newChatMessage)
            if (diceResult && eventCallbacksRef.current.onDiceResult) eventCallbacksRef.current.onDiceResult(diceResult)

            // Broadcast State Update ไปให้ทุกคน
            syncChannel.postMessage({ type: 'SYNC_UPDATE', payload: { newState, chatMessage: newChatMessage, diceResult } })
            syncChannel.close()
        }, 100)
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