// app/api/game/pusher/route.ts
import { NextResponse } from 'next/server'
import Pusher from 'pusher'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const pusher = new Pusher({
    appId: process.env.PUSHER_APP_ID!,
    key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
    secret: process.env.PUSHER_SECRET!,
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    useTLS: true,
})

// Helper: Parse JSON safely
const parseJSON = (data: any) => {
    if (typeof data === 'string') {
        try { return JSON.parse(data) } catch (e) { return {} }
    }
    return data || {}
}

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { action, campaignId } = body

        if (!campaignId) {
            return NextResponse.json({ success: false, error: 'Campaign ID required' }, { status: 400 })
        }

        const channelName = `campaign-${campaignId}`
        console.log(`📡 Pusher Event:`, action?.type || action?.actionType, 'to', channelName)

        // Route based on action type
        const actionType = action?.type || action?.actionType

        switch (actionType) {
            // ========================================
            // GM CONTROLS
            // ========================================

            case 'PRIVATE_SCENE_UPDATE': {
                const { targetPlayerId, payload } = action
                const { sceneId } = payload || {}

                console.log(`🔒 Setting private scene for ${targetPlayerId} to ${sceneId}`)

                // Skip database update for demo (would need proper campaignPlayer records)
                // Just broadcast the event
                await pusher.trigger(channelName, 'game-event', {
                    type: 'PRIVATE_SCENE_UPDATE',
                    targetPlayerId,
                    payload: { sceneId }
                })
                break
            }

            case 'WHISPER': {
                const { targetPlayerId, message, sender } = action

                console.log(`💬 Sending whisper to ${targetPlayerId}: ${message}`)

                // Broadcast whisper (client will filter)
                await pusher.trigger(channelName, 'game-event', {
                    type: 'WHISPER',
                    targetPlayerId,
                    sender: sender || 'Game Master',
                    message
                })
                break
            }

            case 'GM_UPDATE_SCENE':
            case 'GM_SET_GLOBAL_SCENE': {
                const { payload } = action
                const sceneId = payload?.sceneId || payload?.currentScene
                console.log('🎬 GM_UPDATE_SCENE received:', {
                    campaignId,
                    sceneId,
                    hasPayload: !!payload,
                    payloadKeys: payload ? Object.keys(payload) : []
                })

                // Update global state in database (GameSession, not Campaign!)
                try {
                    const session = await prisma.gameSession.findUnique({
                        where: { joinCode: campaignId }
                    })

                    if (session) {
                        // Parse existing activeNpcs
                        let currentNpcs = []
                        try {
                            currentNpcs = session.activeNpcs ? JSON.parse(session.activeNpcs) : []
                        } catch (e) { }

                        const newState = {
                            currentScene: sceneId || session.currentSceneId,
                            sceneImageUrl: payload?.sceneImageUrl,
                            activeNpcs: payload?.activeNpcs !== undefined ? payload.activeNpcs : currentNpcs
                        }

                        // Update GameSession
                        await prisma.gameSession.update({
                            where: { joinCode: campaignId },
                            data: {
                                currentSceneId: newState.currentScene,
                                activeNpcs: JSON.stringify(newState.activeNpcs)
                            }
                        })

                        // Broadcast global scene update
                        console.log('📡 Broadcasting GM_UPDATE_SCENE:', {
                            channelName,
                            newState,
                            sceneId: newState.currentScene,
                            imageUrl: newState.sceneImageUrl
                        })
                        await pusher.trigger(channelName, 'game-event', {
                            actionType: 'GM_UPDATE_SCENE',
                            gameState: newState,
                            payload: newState
                        })
                    }
                } catch (dbError) {
                    console.error('DB error updating scene:', dbError)
                    // Still broadcast even if DB fails
                    const fallbackState = {
                        currentScene: sceneId,
                        sceneImageUrl: payload?.sceneImageUrl,
                        activeNpcs: payload?.activeNpcs || []
                    }
                    await pusher.trigger(channelName, 'game-event', {
                        actionType: 'GM_UPDATE_SCENE',
                        gameState: fallbackState,
                        payload: fallbackState
                    })
                }
                break
            }

            // ========================================
            // PLAYER ACTIONS
            // ========================================

            case 'move':
            case 'attack':
            case 'talk':
            case 'inspect':
            case 'custom':
            case 'JOIN_GAME': {
                // Broadcast player action to all
                await pusher.trigger(channelName, 'game-event', {
                    actionType: action.actionType,
                    actorId: action.actorId,
                    actorName: action.actorName,
                    description: action.description,
                    characterData: action.characterData,
                    payload: action.payload
                })
                break
            }

            // ========================================
            // DICE ROLLS
            // ========================================

            case 'dice_roll': {
                await pusher.trigger(channelName, 'game-event', {
                    actionType: 'dice_roll',
                    ...action
                })
                break
            }

            case 'GM_REQUEST_ROLL': {
                const { targetPlayerId, payload } = action
                console.log(`🎲 GM_REQUEST_ROLL - targetPlayerId: ${targetPlayerId}, payload:`, payload)

                await pusher.trigger(channelName, 'game-event', {
                    actionType: 'GM_REQUEST_ROLL',
                    targetPlayerId,
                    payload
                })
                break
            }

            // ========================================
            // DEFAULT: Broadcast as-is
            // ========================================

            default: {
                console.log(`📡 Broadcasting generic event:`, action)
                await pusher.trigger(channelName, 'game-event', action)
            }
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Pusher Error:', error)
        return NextResponse.json({
            success: false,
            error: 'Failed to trigger event',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}