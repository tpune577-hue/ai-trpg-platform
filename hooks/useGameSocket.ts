'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Pusher from 'pusher-js'
import { DEMO_GAME_STATE, GM_RESPONSE_TEMPLATES } from '@/lib/demo-data'

export const useGameSocket = (campaignId: string | null) => {
    const [isConnected, setIsConnected] = useState(false)

    // State กลาง (เก็บไว้ที่ Client แต่ Sync ผ่าน Pusher Event)
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
        if (!campaignId) return

        // 1. Setup Pusher Connection
        const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        })

        const channelName = `campaign-${campaignId}`
        const channel = pusher.subscribe(channelName)

        console.log(`🔌 Connected to Pusher Channel: ${channelName}`)
        setIsConnected(true)

        // 2. Listen for Events
        channel.bind('game-event', (data: any) => {
            // เมื่อได้รับ Event จาก Pusher ให้มาประมวลผลที่นี่ (เหมือนตอนรับจาก BroadcastChannel)
            handleIncomingEvent(data)
        })

        // Initial Load
        const timer = setTimeout(() => {
            if (eventCallbacksRef.current.onGameStateUpdate) {
                eventCallbacksRef.current.onGameStateUpdate(currentGameStateRef.current)
            }
        }, 500)

        return () => {
            channel.unbind_all()
            channel.unsubscribe()
            pusher.disconnect()
            setIsConnected(false)
        }
    }, [campaignId])

    // --- Logic การประมวลผลข้อมูล (ย้ายมาจาก sendPlayerAction เดิม) ---
    const handleIncomingEvent = (actionData: any) => {

        // ถ้าเป็น Event ประเภทอื่นที่ไม่เกี่ยวกับ State เกม (เช่น Request Roll)
        if (actionData.type === 'GM_REQUEST_ROLL') { // แก้ key นิดหน่อยเพื่อให้รองรับข้อมูลดิบ
            if (eventCallbacksRef.current.onRollRequested) eventCallbacksRef.current.onRollRequested(actionData.payload)
            return
        }

        // ถ้าเป็น Player Action (เช่น Join Game) ส่งให้ Callback ฝั่ง Board ดู
        if (eventCallbacksRef.current.onPlayerAction && actionData.actionType === 'JOIN_GAME') {
            eventCallbacksRef.current.onPlayerAction(actionData)
        }

        // --- Logic อัปเดต State (เหมือนเดิมเป๊ะ) ---
        let narration = null
        let diceResult = null
        let baseText = ""

        let newState = { ...currentGameStateRef.current }

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
        else if (actionData.actionType === 'attack') baseText = "prepares to attack!"
        else if (actionData.actionType === 'move') baseText = "is moving to a new position."
        else if (actionData.actionType === 'talk') baseText = "tries to talk to someone."
        else if (actionData.actionType === 'inspect') baseText = "is looking around carefully."

        // ประกอบร่าง "Name : Action"
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

        // Update Ref & Trigger Callbacks
        currentGameStateRef.current = newState

        if (eventCallbacksRef.current.onGameStateUpdate) eventCallbacksRef.current.onGameStateUpdate(newState)
        if (newChatMessage && eventCallbacksRef.current.onChatMessage) eventCallbacksRef.current.onChatMessage(newChatMessage)
        if (diceResult && eventCallbacksRef.current.onDiceResult) eventCallbacksRef.current.onDiceResult(diceResult)
    }

    // --- Actions (เปลี่ยนจาก Broadcast เป็นยิง API) ---

    const sendPlayerAction = useCallback(async (actionData: any) => {
        // ยิงไปที่ API Route ของเรา
        try {
            const res = await fetch('/api/game/pusher', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: actionData,
                    campaignId: campaignId
                })
            })
            if (!res.ok) {
                const err = await res.json()
                console.error('❌ Pusher API Error:', err)
            }
        } catch (error) {
            console.error('❌ Network Error sending action:', error)
        }
        // หมายเหตุ: เราไม่ต้อง handleIncomingEvent() ที่นี่ เพราะเดี๋ยว Pusher จะส่ง Event กลับมาหาเราเอง (Round-trip)
        // ทำให้ State ของทุกคน Sync ตรงกัน 100%
    }, [campaignId])

    const requestRoll = useCallback(async (checkType: string, dc: number = 10) => {
        // ส่ง payload พิเศษสำหรับ Roll Request
        const payload = {
            type: 'GM_REQUEST_ROLL',
            payload: { checkType, dc, timestamp: Date.now() }
        }

        await fetch('/api/game/pusher', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: payload,
                campaignId: campaignId
            })
        })
    }, [campaignId])

    const onGameStateUpdate = useCallback((cb: any) => { eventCallbacksRef.current.onGameStateUpdate = cb }, [])
    const onPlayerAction = useCallback((cb: any) => { eventCallbacksRef.current.onPlayerAction = cb }, [])
    const onChatMessage = useCallback((cb: any) => { eventCallbacksRef.current.onChatMessage = cb }, [])
    const onPlayerJoined = useCallback((cb: any) => { eventCallbacksRef.current.onPlayerJoined = cb }, [])
    const onDiceResult = useCallback((cb: any) => { eventCallbacksRef.current.onDiceResult = cb }, [])
    const onRollRequested = useCallback((cb: any) => { eventCallbacksRef.current.onRollRequested = cb }, [])

    return { isConnected, sendPlayerAction, requestRoll, onGameStateUpdate, onPlayerAction, onChatMessage, onPlayerJoined, onDiceResult, onRollRequested }
}