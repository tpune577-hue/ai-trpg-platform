// User profile for socket connections
export interface UserProfile {
    id: string
    name: string
    role: 'GM' | 'PLAYER' | 'CREATOR'
    characterId?: string
    characterName?: string
}

// Action types for player actions
export type ActionType = 'attack' | 'skill' | 'move' | 'item' | 'talk' | 'custom'

// Player action data
export interface PlayerActionData {
    actionType: ActionType
    actorId: string // character ID
    actorName: string
    targetId?: string
    targetName?: string
    skillName?: string
    itemName?: string
    position?: { x: number; y: number }
    damage?: number
    healing?: number
    description: string
    metadata?: Record<string, any>
}

// Game state update from GM/AI
export interface GameStateUpdate {
    currentScene?: string
    sessionNumber?: number
    gameTime?: {
        day?: number
        hour?: number
        season?: string
    }
    worldState?: Record<string, any>
    activeCharacters?: string[] // character IDs
    turnOrder?: string[]
    currentTurn?: string
    mapData?: any
    weather?: string
    ambience?: string
    metadata?: Record<string, any>
}

// Chat message for real-time
export interface SocketChatMessage {
    id: string
    content: string
    type: 'NARRATION' | 'TALK' | 'ACTION'
    senderId: string
    senderName: string
    timestamp: Date
}

// Room (campaign) info
export interface RoomInfo {
    roomId: string
    campaignTitle: string
    connectedPlayers: UserProfile[]
    gmId: string
}

// Error types
export interface SocketError {
    code: string
    message: string
    details?: any
}

// Server to Client Events
export interface ServerToClientEvents {
    // Connection events
    'room:joined': (data: { roomInfo: RoomInfo; userProfile: UserProfile }) => void
    'room:left': (data: { userId: string; userName: string }) => void
    'room:player_joined': (data: { userProfile: UserProfile }) => void
    'room:player_left': (data: { userId: string; userName: string }) => void

    // Private View & Whisper
    'player:private_scene_update': (data: { sceneId: string | null }) => void
    'player:whisper_received': (data: { sender: string; message: string }) => void

    // Game events
    'game:action': (data: PlayerActionData) => void
    'game:scene_update': (data: { sceneId: string }) => void
    'game:state_update': (data: GameStateUpdate) => void
    'game:turn_change': (data: { currentTurn: string; turnOrder: string[] }) => void
    'game:dice_result': (data: any) => void
    'player:character_data': (data: any) => void

    // Chat events
    'chat:message': (message: SocketChatMessage) => void
    'chat:typing': (data: { userId: string; userName: string; isTyping: boolean }) => void

    // Error events
    'error': (error: SocketError) => void

    // System events
    'connection:established': () => void
    'connection:reconnected': () => void
}

// Client to Server Events
export interface ClientToServerEvents {
    // Room management
    'join_room': (data: { campaignId: string }, callback?: (response: { success: boolean; error?: string }) => void) => void
    'leave_room': (data: { roomId: string }) => void

    // Game actions
    'player_action': (data: { campaignId: string; action: PlayerActionData }, callback?: (response: { success: boolean; error?: string }) => void) => void
    'gm_update': (data: { roomId: string; gameState: GameStateUpdate }, callback?: (response: { success: boolean; error?: string }) => void) => void

    // Chat
    'chat:send': (data: { roomId: string; content: string; type: 'NARRATION' | 'TALK' | 'ACTION' }, callback?: (response: { success: boolean; messageId?: string; error?: string }) => void) => void
    'chat:typing': (data: { roomId: string; isTyping: boolean }) => void

    // GM Controls
    'gm:set_private_scene': (data: { playerId: string; sceneId: string | null }) => void
    'gm:whisper': (data: { targetPlayerId: string; message: string }) => void
    'gm:set_global_scene': (data: { campaignId: string; sceneId: string }) => void

    // Ping for connection health
    'ping': (callback: (latency: number) => void) => void
}

// Inter-server events (for scaling)
export interface InterServerEvents {
    ping: () => void
}

// Socket data (stored on each socket connection)
export interface SocketData {
    userId: string
    userName: string
    userRole: string
    userEmail: string
    currentRoomId?: string
    characterId?: string
    user?: any
    campaignId?: string
}
