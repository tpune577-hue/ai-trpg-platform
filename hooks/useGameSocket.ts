'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { DEMO_GAME_STATE, GM_RESPONSE_TEMPLATES } from '@/lib/demo-data'

export const useGameSocket = (campaignId: string | null) => {
    const [isConnected, setIsConnected] = useState(false)

    const currentGameStateRef = useRef<any>({
        ...DEMO_GAME_STATE,
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
                currentGameStateRef.current = payload.newState
                if (eventCallbacksRef.current.onGameStateUpdate) eventCallbacksRef.current.onGameStateUpdate(payload.newState)
                if (eventCallbacksRef.current.onChatMessage && payload.chatMessage) eventCallbacksRef.current.onChatMessage(payload.chatMessage)
                if (eventCallbacksRef.current.onDiceResult && payload.diceResult) eventCallbacksRef.current.onDiceResult(payload.diceResult)
            }
        }

        const timer = setTimeout(() => {
            if (eventCallbacksRef.current.onGameStateUpdate) {
                eventCallbacksRef.current.onGameStateUpdate(currentGameStateRef.current)
            }
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

        if (actionData.actionType !== 'GM_UPDATE_SCENE') {
            syncChannel.postMessage({ type: 'PLAYER_ACTION', payload: actionData })
        }

        setTimeout(() => {
            let narration = null
            let diceResult = null
            let baseText = ""

            let newState = { ...currentGameStateRef.current }

            // --- 1. กำหนดข้อความพื้นฐาน ---
            if (actionData.actionType === 'GM_UPDATE_SCENE') {
                if (actionData.payload.sceneImageUrl) newState.sceneImageUrl = actionData.payload.sceneImageUrl
                if (actionData.payload.activeNpcs) newState.activeNpcs = actionData.payload.activeNpcs
            }
            else if (actionData.actionType === 'JOIN_GAME') {
                baseText = "has joined the adventure."
            }
            else if (actionData.actionType === 'dice_roll') {
                const isSuccess = actionData.total >= (actionData.dc || 10)
                const resultText = isSuccess ? "(Success!)" : "(Failed...)"
                baseText = `rolled ${actionData.checkType}: ${actionData.total} ${resultText}`
                diceResult = { total: actionData.total, detail: `1d20 (${actionData.roll}) + ${actionData.mod}` }
            }
            else if (actionData.actionType === 'custom') {
                baseText = actionData.description
            }
            // ✅ 4 Actions หลัก (แค่บอกว่าทำอะไร ไม่ต้องทอยเต๋า)
            else if (actionData.actionType === 'attack') baseText = "prepares to attack!"
            else if (actionData.actionType === 'move') baseText = "is moving to a new position."
            else if (actionData.actionType === 'talk') baseText = "tries to talk to someone."
            else if (actionData.actionType === 'inspect') baseText = "is looking around carefully."

            // --- 2. ประกอบร่าง "Name : Action" ---
            if (baseText) {
                if (actionData.actorName && actionData.actorName !== 'Game Master') {
                    if (actionData.actionType === 'custom') {
                        narration = `${actionData.actorName} : ${baseText}`
                    } else {
                        narration = `${actionData.actorName} : ${baseText}`
                    }
                } else {
                    narration = baseText
                }
            }

            // --- 3. Update State ---
            let newChatMessage = null
            if (narration) {
                newChatMessage = {
                    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    content: narration,
                    type: actionData.actionType === 'custom' && actionData.actorName === 'Game Master' ? 'NARRATION' : 'ACTION',
                    senderName: actionData.actorName || 'GM',
                    createdAt: new Date().toISOString()
                }

                if (actionData.actionType !== 'JOIN_GAME' && actionData.actionType !== 'dice_roll') {
                    newState.currentScene = narration
                }

                newState.recentEvents = [narration, ...newState.recentEvents]
            }

            currentGameStateRef.current = newState

            if (eventCallbacksRef.current.onGameStateUpdate) eventCallbacksRef.current.onGameStateUpdate(newState)
            if (newChatMessage && eventCallbacksRef.current.onChatMessage) eventCallbacksRef.current.onChatMessage(newChatMessage)
            if (diceResult && eventCallbacksRef.current.onDiceResult) eventCallbacksRef.current.onDiceResult(diceResult)

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