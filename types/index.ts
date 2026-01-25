import { User, Campaign, MarketplaceItem } from '@prisma/client'

// Define Character interface since it doesn't exist in Prisma schema
export interface Character {
    id: string
    name: string
    userId: string
    campaignId: string
    stats: any
    inventory: any
    createdAt: Date
    updatedAt: Date
}

// Define ChatMessage interface since it doesn't exist in Prisma schema
export interface ChatMessage {
    id: string
    campaignId: string
    userId: string
    content: string
    type: string
    createdAt: Date
}

// Manually define Enums as String Unions for SQLite compatibility
export type UserRole = 'GM' | 'PLAYER' | 'CREATOR'
export const UserRole = {
    GM: 'GM',
    PLAYER: 'PLAYER',
    CREATOR: 'CREATOR'
} as const

export type MessageType = 'TALK' | 'NARRATION' | 'ACTION'
export const MessageType = {
    TALK: 'TALK',
    NARRATION: 'NARRATION',
    ACTION: 'ACTION'
} as const

export type ItemType = 'ART' | 'THEME'
export const ItemType = {
    ART: 'ART',
    THEME: 'THEME'
} as const

// Extended types with relations
export type UserWithRelations = User & {
    characters?: Character[]
    gmCampaigns?: Campaign[]
    marketplaceItems?: MarketplaceItem[]
}

export type CampaignWithRelations = Campaign & {
    gm?: User
    characters?: Character[]
    chatMessages?: ChatMessage[]
    players?: { player: User }[]
}

export type CharacterWithRelations = Character & {
    user?: User
    campaign?: Campaign
}

// Type-safe JSONB field types
export interface CharacterStats {
    [key: string]: number | string | boolean
    // Example for D&D 5e:
    // strength?: number
    // dexterity?: number
    // constitution?: number
    // intelligence?: number
    // wisdom?: number
    // charisma?: number
}

export interface CharacterInventory {
    items?: InventoryItem[]
    gold?: number
    equipment?: {
        weapon?: string
        armor?: string
        accessory?: string
        [key: string]: string | undefined
    }
    [key: string]: any
}

export interface InventoryItem {
    id: string
    name: string
    description?: string
    quantity: number
    weight?: number
    value?: number
    type?: string
}

export interface CampaignState {
    currentScene?: string
    sessionNumber?: number
    gameTime?: {
        day?: number
        hour?: number
        season?: string
    }
    worldState?: {
        [key: string]: any
    }
    questLog?: Quest[]
    [key: string]: any
}

export interface Quest {
    id: string
    title: string
    description: string
    status: 'active' | 'completed' | 'failed'
    rewards?: string[]
}

export interface MarketplaceItemData {
    imageUrl?: string
    previewUrl?: string
    downloadUrl?: string
    tags?: string[]
    metadata?: {
        [key: string]: any
    }
    version?: string
    compatibility?: string[]
}

// API Response types
export interface ApiResponse<T = any> {
    success: boolean
    data?: T
    error?: string
    message?: string
}

// Socket.io event types
export interface ServerToClientEvents {
    'message:new': (message: ChatMessage) => void
    'campaign:update': (campaign: Campaign) => void
    'character:update': (character: Character) => void
    'player:joined': (userId: string) => void
    'player:left': (userId: string) => void
}

export interface ClientToServerEvents {
    'message:send': (data: { campaignId: string; content: string; type: MessageType }) => void
    'campaign:join': (campaignId: string) => void
    'campaign:leave': (campaignId: string) => void
    'character:update': (characterId: string, updates: Partial<Character>) => void
}

// Form types
export interface CreateCampaignInput {
    title: string
    description?: string
    theme?: string
    maxPlayers?: number
}

export interface CreateCharacterInput {
    name: string
    description?: string
    campaignId: string
    stats: CharacterStats
    inventory?: CharacterInventory
}

export interface CreateMarketplaceItemInput {
    title: string
    description?: string
    type: ItemType
    price: number
    data: MarketplaceItemData
}
