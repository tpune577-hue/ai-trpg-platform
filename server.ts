import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { Server as SocketIOServer } from 'socket.io'
import type {
    ServerToClientEvents,
    ClientToServerEvents,
    InterServerEvents,
    SocketData,
    UserProfile,
    PlayerActionData,
    GameStateUpdate,
    SocketChatMessage,
    RoomInfo,
} from './types/socket'
import { prisma } from './lib/prisma'
import { processGameTurn, type GameMasterResponse } from './lib/ai-game-master'
import { MessageType } from '@prisma/client'

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = parseInt(process.env.PORT || '3000', 10)

// Initialize Next.js
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

// Store active rooms and their connected users
const activeRooms = new Map<string, Set<string>>() // roomId -> Set of userIds
const userSockets = new Map<string, string>() // userId -> socketId

/**
 * Process player action with AI Game Master
 */
async function processActionWithAI(
    roomId: string,
    actionData: PlayerActionData,
    io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
) {
    try {
        console.log('[AI GM] Processing action with AI...')

        // Get campaign and characters from database
        const campaign = await prisma.campaign.findUnique({
            where: { id: roomId },
            include: {
                characters: {
                    where: { isActive: true },
                    include: { user: true },
                },
            },
        })

        if (!campaign) {
            console.error('[AI GM] Campaign not found')
            return
        }

        // Build game state for AI
        const gameState = {
            currentScene: (campaign.currentState as any)?.currentScene || 'Unknown Location',
            characters: campaign.characters.map((char: any) => ({
                id: char.id,
                name: char.name,
                hp: (char.stats as any)?.hp || 50,
                maxHp: (char.stats as any)?.maxHp || 100,
                ac: (char.stats as any)?.ac || 15,
                class: (char.stats as any)?.class || 'Adventurer',
                level: char.level,
            })),
            environment: (campaign.currentState as any)?.environment,
            recentEvents: (campaign.currentState as any)?.recentEvents || [],
        }

        // Extract actor's stats for dice roll modifiers
        const actorCharacter = campaign.characters.find((char: any) => char.id === actionData.actorId)
        const actorStats = actorCharacter ? {
            strength: (actorCharacter.stats as any)?.strength || 10,
            dexterity: (actorCharacter.stats as any)?.dexterity || 10,
            constitution: (actorCharacter.stats as any)?.constitution || 10,
            intelligence: (actorCharacter.stats as any)?.intelligence || 10,
            wisdom: (actorCharacter.stats as any)?.wisdom || 10,
            charisma: (actorCharacter.stats as any)?.charisma || 10,
        } : undefined

        // Call AI Game Master with character stats
        const aiResponse: GameMasterResponse = await processGameTurn(gameState, actionData, actorStats)

        console.log('[AI GM] AI response received:', aiResponse.narration.substring(0, 100) + '...')

        // Broadcast AI narration as a chat message
        const narrationMessage = await prisma.chatMessage.create({
            data: {
                content: aiResponse.narration,
                type: 'NARRATION' as any,
                senderId: campaign.gmId,
                senderName: 'Game Master',
                campaignId: roomId,
            },
        })

        io.to(roomId).emit('chat:message', {
            id: narrationMessage.id,
            content: narrationMessage.content,
            type: 'NARRATION' as any,
            senderId: narrationMessage.senderId,
            senderName: narrationMessage.senderName,
            timestamp: narrationMessage.createdAt,
        })

        // Apply HP updates
        if (aiResponse.hp_updates && aiResponse.hp_updates.length > 0) {
            for (const update of aiResponse.hp_updates) {
                const character = campaign.characters.find((c: any) => c.id === update.target_id)
                if (character) {
                    const currentHp = (character.stats as any)?.hp || 50
                    const newHp = Math.max(0, currentHp + update.amount)

                    await prisma.character.update({
                        where: { id: character.id },
                        data: {
                            stats: {
                                ...(character.stats as any),
                                hp: newHp,
                            },
                        },
                    })

                    console.log(`[AI GM] Updated ${character.name} HP: ${currentHp} -> ${newHp}`)
                }
            }

            // Broadcast HP updates to clients
            const characterUpdates: Record<string, any> = {}
            for (const update of aiResponse.hp_updates) {
                const character = campaign.characters.find((c) => c.id === update.target_id)
                if (character) {
                    const currentHp = (character.stats as any)?.hp || 50
                    const newHp = Math.max(0, currentHp + update.amount)
                    characterUpdates[update.target_id] = {
                        hp: newHp,
                        status: newHp === 0 ? 'unconscious' : newHp < 20 ? 'critical' : newHp < 50 ? 'wounded' : 'healthy',
                    }
                }
            }

            io.to(roomId).emit('game:state_update', {
                metadata: { characterUpdates },
            })
        }

        // Update campaign state with new scene if provided
        if (aiResponse.new_scene_prompt) {
            await prisma.campaign.update({
                where: { id: roomId },
                data: {
                    currentState: {
                        ...(campaign.currentState as any),
                        currentScene: aiResponse.new_scene_prompt,
                        lastUpdate: new Date().toISOString(),
                    },
                },
            })

            io.to(roomId).emit('game:state_update', {
                currentScene: aiResponse.new_scene_prompt,
            })
        }

        console.log('[AI GM] Action processed successfully')
    } catch (error: any) {
        console.error('[AI GM] Error processing action:', error)

        // Send error message to room
        io.to(roomId).emit('chat:message', {
            id: `error-${Date.now()}`,
            content: 'The Game Master is momentarily distracted... (AI processing error)',
            type: 'NARRATION' as any,
            senderId: 'system',
            senderName: 'System',
            timestamp: new Date(),
        })
    }
}

app.prepare().then(() => {
    const server = createServer(async (req, res) => {
        try {
            const parsedUrl = parse(req.url!, true)
            await handle(req, res, parsedUrl)
        } catch (err) {
            console.error('Error occurred handling', req.url, err)
            res.statusCode = 500
            res.end('internal server error')
        }
    })

    // Initialize Socket.io with type safety
    const io = new SocketIOServer<
        ClientToServerEvents,
        ServerToClientEvents,
        InterServerEvents,
        SocketData
    >(server, {
        cors: {
            origin: dev ? 'http://localhost:3000' : process.env.NEXTAUTH_URL,
            methods: ['GET', 'POST'],
            credentials: true,
        },
        pingTimeout: 60000,
        pingInterval: 25000,
    })

    // Middleware for session-based authentication
    io.use(async (socket, next) => {
        try {
            // Extract session token from handshake auth
            const sessionToken = socket.handshake.auth.sessionToken

            if (!sessionToken) {
                return next(new Error('Authentication required: No session token provided'))
            }

            // DEV ONLY: Bypass for demo
            if (process.env.NODE_ENV !== 'production' && sessionToken === 'demo-token') {
                console.log('[Socket.io Auth] DEV: Bypassing auth for demo user')
                socket.data.userId = 'player-1'
                socket.data.userName = 'Aragorn'
                socket.data.userRole = 'PLAYER' as any
                socket.data.userEmail = 'demo@example.com'
                return next()
            }

            // Verify session token in database
            const session = await prisma.session.findUnique({
                where: {
                    sessionToken: sessionToken,
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            role: true,
                            email: true,
                        },
                    },
                },
            })

            // Check if session exists and is valid
            if (!session) {
                return next(new Error('Authentication failed: Invalid session token'))
            }

            // Check if session has expired
            if (session.expires < new Date()) {
                return next(new Error('Authentication failed: Session expired'))
            }

            // Attach verified user data to socket
            socket.data.userId = session.user.id
            socket.data.userName = session.user.name || 'Unknown User'
            socket.data.userRole = session.user.role
            socket.data.userEmail = session.user.email

            console.log(`[Socket.io Auth] User authenticated: ${session.user.name} (${session.user.id})`)

            next()
        } catch (error) {
            console.error('[Socket.io Auth] Authentication error:', error)
            next(new Error('Authentication failed: Server error'))
        }
    })

    // Socket.io connection handler
    io.on('connection', (socket) => {
        console.log(`[Socket.io] User connected: ${socket.data.userName} (${socket.id})`)

        // Store socket mapping
        userSockets.set(socket.data.userId, socket.id)

        // Send connection established event
        socket.emit('connection:established')

        // Handle join_room event
        socket.on('join_room', async ({ roomId, userProfile }, callback) => {
            try {
                // Verify campaign exists and user has access
                const campaign = await prisma.campaign.findUnique({
                    where: { id: roomId },
                    include: {
                        gm: true,
                        players: {
                            include: {
                                player: true,
                            },
                        },
                    },
                })

                if (!campaign) {
                    // DEV ONLY: Bypass for demo room
                    if (process.env.NODE_ENV !== 'production' && roomId === 'demo') {
                        console.log('[Socket.io] DEV: Bypassing room check for demo')

                        // Join the socket room
                        await socket.join(roomId)
                        socket.data.currentRoomId = roomId
                        socket.data.characterId = 'char-1'

                        // Track active users in room
                        if (!activeRooms.has(roomId)) {
                            activeRooms.set(roomId, new Set())
                        }
                        activeRooms.get(roomId)!.add(userProfile.id)

                        const roomInfo: RoomInfo = {
                            roomId,
                            campaignTitle: 'Demo Campaign',
                            connectedPlayers: [],
                            gmId: 'gm-1',
                        }

                        // Notify the user they joined
                        socket.emit('room:joined', { roomInfo, userProfile })
                        callback?.({ success: true })
                        return
                    }

                    callback?.({ success: false, error: 'Campaign not found' })
                    return
                }

                // Check if user is GM or a player in this campaign
                const isGM = campaign.gmId === userProfile.id
                const isPlayer = campaign.players.some((p: any) => p.playerId === userProfile.id)

                if (!isGM && !isPlayer) {
                    callback?.({ success: false, error: 'Access denied to this campaign' })
                    return
                }

                // Join the socket room
                await socket.join(roomId)
                socket.data.currentRoomId = roomId
                socket.data.characterId = userProfile.characterId

                // Track active users in room
                if (!activeRooms.has(roomId)) {
                    activeRooms.set(roomId, new Set())
                }
                activeRooms.get(roomId)!.add(userProfile.id)

                // Get all connected players in this room
                const connectedPlayers: UserProfile[] = []
                const roomSockets = await io.in(roomId).fetchSockets()

                for (const roomSocket of roomSockets) {
                    if (roomSocket.data.userId !== userProfile.id) {
                        connectedPlayers.push({
                            id: roomSocket.data.userId,
                            name: roomSocket.data.userName,
                            role: roomSocket.data.userRole,
                            characterId: roomSocket.data.characterId,
                        })
                    }
                }

                const roomInfo: RoomInfo = {
                    roomId,
                    campaignTitle: campaign.title,
                    connectedPlayers,
                    gmId: campaign.gmId,
                }

                // Notify the user they joined
                socket.emit('room:joined', { roomInfo, userProfile })

                // Notify others in the room
                socket.to(roomId).emit('room:player_joined', { userProfile })

                console.log(`[Socket.io] ${userProfile.name} joined room: ${campaign.title}`)
                callback?.({ success: true })
            } catch (error) {
                console.error('[Socket.io] Error joining room:', error)
                callback?.({ success: false, error: 'Failed to join room' })
            }
        })

        // Handle leave_room event
        socket.on('leave_room', ({ roomId }) => {
            socket.leave(roomId)

            // Remove from active rooms
            activeRooms.get(roomId)?.delete(socket.data.userId)
            if (activeRooms.get(roomId)?.size === 0) {
                activeRooms.delete(roomId)
            }

            // Notify others
            socket.to(roomId).emit('room:player_left', {
                userId: socket.data.userId,
                userName: socket.data.userName,
            })

            socket.data.currentRoomId = undefined
            console.log(`[Socket.io] ${socket.data.userName} left room: ${roomId}`)
        })

        // Handle player_action event with AI Game Master
        socket.on('player_action', async ({ roomId, actionData }, callback) => {
            try {
                // Verify user is in the room
                if (socket.data.currentRoomId !== roomId) {
                    callback?.({ success: false, error: 'Not in this room' })
                    return
                }

                // Broadcast action to all players in the room immediately
                io.to(roomId).emit('game:action', actionData)

                // Save action to database as a chat message
                if (actionData.description) {
                    await prisma.chatMessage.create({
                        data: {
                            content: actionData.description,
                            type: MessageType.ACTION,
                            senderId: socket.data.userId,
                            senderName: actionData.actorName,
                            campaignId: roomId,
                        },
                    })
                }

                console.log(`[Socket.io] Action in ${roomId}: ${actionData.actionType} by ${actionData.actorName}`)

                // Process action with AI Game Master (async, don't block)
                processActionWithAI(roomId, actionData, io).catch((error) => {
                    console.error('[AI GM] Error processing action:', error)
                })

                callback?.({ success: true })
            } catch (error) {
                console.error('[Socket.io] Error handling player action:', error)
                callback?.({ success: false, error: 'Failed to process action' })
            }
        })

        // Handle gm_update event
        socket.on('gm_update', async ({ roomId, gameState }, callback) => {
            try {
                // Verify user is GM
                const campaign = await prisma.campaign.findUnique({
                    where: { id: roomId },
                })

                if (!campaign || campaign.gmId !== socket.data.userId) {
                    callback?.({ success: false, error: 'Only GM can update game state' })
                    return
                }

                // Update campaign state in database
                await prisma.campaign.update({
                    where: { id: roomId },
                    data: {
                        currentState: gameState as any,
                    },
                })

                // Broadcast state update to all players
                io.to(roomId).emit('game:state_update', gameState)

                // Handle turn changes
                if (gameState.currentTurn && gameState.turnOrder) {
                    io.to(roomId).emit('game:turn_change', {
                        currentTurn: gameState.currentTurn,
                        turnOrder: gameState.turnOrder,
                    })
                }

                console.log(`[Socket.io] GM updated game state in ${roomId}`)
                callback?.({ success: true })
            } catch (error) {
                console.error('[Socket.io] Error handling GM update:', error)
                callback?.({ success: false, error: 'Failed to update game state' })
            }
        })

        // Handle chat:send event
        socket.on('chat:send', async ({ roomId, content, type }, callback) => {
            try {
                if (socket.data.currentRoomId !== roomId) {
                    callback?.({ success: false, error: 'Not in this room' })
                    return
                }

                // Save message to database
                const message = await prisma.chatMessage.create({
                    data: {
                        content,
                        type,
                        senderId: socket.data.userId,
                        senderName: socket.data.userName,
                        campaignId: roomId,
                    },
                })

                // Broadcast to room
                const socketMessage: SocketChatMessage = {
                    id: message.id,
                    content: message.content,
                    type: message.type,
                    senderId: message.senderId,
                    senderName: message.senderName,
                    timestamp: message.createdAt,
                }

                io.to(roomId).emit('chat:message', socketMessage)

                callback?.({ success: true, messageId: message.id })
            } catch (error) {
                console.error('[Socket.io] Error sending chat message:', error)
                callback?.({ success: false, error: 'Failed to send message' })
            }
        })

        // Handle chat:typing event
        socket.on('chat:typing', ({ roomId, isTyping }) => {
            if (socket.data.currentRoomId === roomId) {
                socket.to(roomId).emit('chat:typing', {
                    userId: socket.data.userId,
                    userName: socket.data.userName,
                    isTyping,
                })
            }
        })

        // Handle ping for latency measurement
        socket.on('ping', (callback) => {
            callback(Date.now())
        })

        // Handle disconnect
        socket.on('disconnect', () => {
            console.log(`[Socket.io] User disconnected: ${socket.data.userName}`)

            // Clean up
            const roomId = socket.data.currentRoomId
            if (roomId) {
                activeRooms.get(roomId)?.delete(socket.data.userId)
                if (activeRooms.get(roomId)?.size === 0) {
                    activeRooms.delete(roomId)
                }

                // Notify room
                socket.to(roomId).emit('room:player_left', {
                    userId: socket.data.userId,
                    userName: socket.data.userName,
                })
            }

            userSockets.delete(socket.data.userId)
        })
    })

    // Start server
    server.listen(port, () => {
        console.log(`> Ready on http://${hostname}:${port}`)
        console.log(`> Socket.io server initialized`)
    })
})
