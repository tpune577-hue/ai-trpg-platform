'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

// ==========================================
// 1. CAMPAIGN & SESSION MANAGEMENT
// ==========================================

// ดึงข้อมูล Campaign ที่เป็นเจ้าของ (ใช้ตอนเลือกสร้างห้อง)
export async function getPublishedCampaigns() {
    const session = await auth()
    const userId = session?.user?.id

    if (!userId) return []

    // 1.1 หา ID ที่ซื้อมา
    const purchases = await prisma.purchase.findMany({
        where: { userId },
        select: { campaignId: true }
    })
    const purchasedIds = purchases.map(p => p.campaignId)

    // 1.2 Query Campaign (เลือกเฉพาะ Field ที่จำเป็นเพื่อความเร็ว)
    return await prisma.campaign.findMany({
        where: {
            isPublished: true,
            OR: [
                { creatorId: userId },
                { id: { in: purchasedIds } }
            ]
        },
        select: {
            id: true,
            title: true,
            description: true,
            system: true,
            coverImage: true,
            updatedAt: true,
            creator: {
                select: { name: true, image: true }
            }
        },
        orderBy: { updatedAt: 'desc' }
    })
}

// สร้างห้อง (Create Session)
export async function createGameSession(campaignId?: string, roomName?: string) {
    try {
        // สุ่มรหัสห้อง 6 หลัก
        const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase()

        // ตั้งชื่อห้อง
        const finalName = roomName || (campaignId === 'CUSTOM' ? "Custom Sandbox" : "Adventure Session");

        console.log('📝 Creating GameSession:', { joinCode, finalName, campaignId })

        const session = await prisma.gameSession.create({
            data: {
                joinCode,
                name: finalName,
                // ถ้าเป็น CUSTOM ไม่ต้องผูก campaignId
                campaignId: (!campaignId || campaignId === 'CUSTOM') ? undefined : campaignId,
                status: 'WAITING',
                isAiGm: true
            }
        })

        console.log('✅ GameSession created successfully:', session.joinCode)
        return { success: true, joinCode: session.joinCode }
    } catch (error) {
        console.error('❌ Error creating GameSession:', error)
        throw error
    }
}

// ==========================================
// 2. DATA FETCHING (OPTIMIZED) 🚀
// ==========================================

// ✅ 2.1 ดึงข้อมูล Lobby เบื้องต้น (Lightweight - โหลดเร็วมาก)
// ใช้สำหรับเปิดหน้า Lobby หรือ Board ครั้งแรก
export async function getLobbyInfo(joinCode: string) {
    const session = await prisma.gameSession.findUnique({
        where: { joinCode },
        select: {
            id: true,
            joinCode: true,
            name: true,
            status: true,
            currentSceneId: true,
            activeNpcs: true,
            customScenes: true,
            customNpcs: true,
            // isAiGm: true, 

            // 👇 สำคัญมาก! ต้องมี players ถึงจะหาย Error
            players: {
                orderBy: { createdAt: 'asc' },
                select: {
                    id: true,
                    name: true,
                    role: true,
                    isReady: true,
                    characterData: true,
                    // userId: true, 
                    // inventory: true 
                }
            },

            // 👇 ต้องมี campaign เพื่อดึง system
            campaign: {
                select: {
                    id: true,
                    title: true,
                    system: true,
                    coverImage: true,
                    storyIntro: true,
                    storyMid: true,
                    storyEnd: true,
                    creatorId: true,
                    aiEnabled: true,
                    aiName: true,
                    aiPersonality: true,
                    aiStyle: true,
                    description: true, // ✅ Restore Description
                    preGens: {         // ✅ Restore PreGens (Lightweight)
                        select: {
                            id: true,
                            name: true,
                            avatarUrl: true,
                            sheetType: true,
                            stats: true, // Needed for Modal details
                            bio: true
                        }
                    }
                }
            }
        }
    })
    return session
}

// ✅ 2.2 ดึง Assets หนักๆ แยกต่างหาก (Lazy Load)
// ใช้ useEffect เรียกทีหลัง เพื่อให้หน้าจอไม่ค้าง
export async function getLobbyAssets(joinCode: string) {
    const session = await prisma.gameSession.findUnique({
        where: { joinCode },
        select: {
            campaign: {
                select: {
                    scenes: true,
                    npcs: true,
                    items: true,
                    preGens: true
                }
            },
            campaignId: true // เพิ่ม campaignId เพื่อใช้เช็ค
        }
    })

    // สร้าง Default Object (รวม audioTracks ด้วย)
    const emptyAssets = { scenes: [], npcs: [], items: [], preGens: [], audioTracks: [] }

    // ดึง Audio Tracks ทั้งหมด (เพราะเป็น Global Library)
    // ใช้ try-catch เผื่อยังไม่ได้ migrate หรือ table ไม่พร้อม
    let audioTracks: any[] = []
    try {
        audioTracks = await prisma.audioTrack.findMany({
            orderBy: { name: 'asc' }
        })
    } catch (e) {
        console.warn("⚠️ AudioTrack table might not exist yet. Run 'npx prisma db push'")
    }

    if (!session) return { ...emptyAssets, audioTracks }

    // Return แยกตาม category เพื่อให้ frontend ใช้ง่าย
    // ผสานข้อมูลจาก Campaign (ถ้ามี) กับ Audio Tracks ที่ดึงมาแยก
    return {
        scenes: session.campaign?.scenes || [],
        npcs: session.campaign?.npcs || [],
        items: session.campaign?.items || [],
        preGens: session.campaign?.preGens || [],
        audioTracks: audioTracks // ✅ ส่ง audioTracks กลับไปด้วย
    }
}

// ==========================================
// 3. PLAYER MANAGEMENT
// ==========================================

// เข้าห้อง (Auto Role)
export async function joinLobby(joinCode: string, playerName: string) {
    const session = await prisma.gameSession.findUnique({
        where: { joinCode },
        include: { players: true }
    })

    if (!session) throw new Error("Room not found")

    // 3.1 เช็คว่ามีชื่อนี้อยู่แล้วไหม (Re-join)
    const existingPlayer = session.players.find(p => p.name === playerName)
    if (existingPlayer) {
        return { success: true, playerId: existingPlayer.id, role: existingPlayer.role }
    }

    // 3.2 เช็คว่ามี GM หรือยัง
    const hasGM = session.players.some(p => p.role === 'GM')
    const role = hasGM ? 'PLAYER' : 'GM'
    const isReady = role === 'GM' // GM พร้อมเสมอ

    // 3.3 สร้าง Player ใหม่
    const player = await prisma.player.create({
        data: {
            name: playerName,
            sessionId: session.id,
            role: role,
            isReady: isReady,
            characterData: '{}'
        }
    })

    return { success: true, playerId: player.id, role: player.role }
}

// Player เลือกตัวละคร (Pre-Gen)
export async function setPlayerReady(playerId: string, preGenId: string) {
    const preGen = await prisma.preGenCharacter.findUnique({ where: { id: preGenId } })
    if (!preGen) throw new Error("Character Template not found")

    // Parse stats และใส่ชื่อตัวละครเข้าไป
    const statsData = preGen.stats ? JSON.parse(preGen.stats) : { hp: 10, maxHp: 10, mp: 10 }
    statsData.name = preGen.name

    await prisma.player.update({
        where: { id: playerId },
        data: {
            isReady: true,
            preGenId: preGenId,
            sheetType: preGen.sheetType,
            characterData: JSON.stringify(statsData)
        }
    })

    return { success: true }
}

// Kick Player
export async function kickPlayer(playerId: string) {
    try {
        await prisma.player.delete({ where: { id: playerId } })
        return { success: true }
    } catch (error) {
        console.error("Kick failed:", error)
        return { success: false, error: "Failed to kick player" }
    }
}

// Leave Lobby (ออกจากห้อง)
export async function leaveLobby(playerId: string) {
    try {
        const player = await prisma.player.findUnique({
            where: { id: playerId },
            include: { session: true }
        })

        if (!player) return { success: false, error: "Player not found" }

        // ✅ เฉพาะ WAITING เท่านั้นที่ลบทิ้ง
        if (player.session.status === 'WAITING') {
            await prisma.player.delete({ where: { id: playerId } })
            console.log(`🚪 Player ${player.name} left lobby (WAITING)`)
            return { success: true, removed: true }
        } else {
            console.log(`🔄 Player ${player.name} disconnected (Game Active)`)
            return { success: true, removed: false }
        }
    } catch (error) {
        console.error("Leave lobby failed:", error)
        return { success: false, error: "Failed to leave lobby" }
    }
}

// ==========================================
// 4. GAMEFLOW & STATE
// ==========================================

export async function startGame(joinCode: string) {
    await prisma.gameSession.update({
        where: { joinCode },
        data: { status: 'ACTIVE' }
    })
    return { success: true }
}

export async function pauseGameSession(joinCode: string) {
    await prisma.gameSession.update({
        where: { joinCode },
        data: { status: 'PAUSED' }
    })
    return { success: true }
}

export async function resumeGame(joinCode: string) {
    await prisma.gameSession.update({
        where: { joinCode },
        data: { status: 'ACTIVE' }
    })
    return { success: true }
}

export async function endGameSession(joinCode: string) {
    await prisma.gameSession.update({
        where: { joinCode },
        data: { status: 'ENDED' }
    })
    return { success: true }
}

// บันทึกสถานะเกม (Current Scene, Active NPCs)
export async function updateGameSessionState(joinCode: string, gameState: any) {
    // ตรวจสอบข้อมูลก่อนบันทึกเพื่อความปลอดภัย
    const activeNpcsString = gameState.activeNpcs ? JSON.stringify(gameState.activeNpcs) : '[]'

    await prisma.gameSession.update({
        where: { joinCode },
        data: {
            currentSceneId: gameState.currentScene,
            activeNpcs: activeNpcsString
        }
    })
    return { success: true }
}

// ดึง Session ที่เล่นค้างไว้
export async function getResumableSessions() {
    return await prisma.gameSession.findMany({
        where: { status: { in: ['ACTIVE', 'PAUSED'] } },
        include: {
            campaign: { select: { title: true, coverImage: true } },
            players: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' }
    })
}

// ==========================================
// 5. CHARACTER DATA (REALTIME SAVE)
// ==========================================

// Save Character Sheet (ใช้บ่อย)
export async function saveCharacterSheet(playerId: string, characterData: any) {
    try {
        const charName = characterData.name || "Unknown Adventurer";
        const sheetType = characterData.sheetType || "STANDARD";
        const statsData = characterData.data || characterData || {};

        await prisma.player.update({
            where: { id: playerId },
            data: {
                isReady: true,
                sheetType: sheetType,
                characterData: JSON.stringify({ ...statsData, name: charName })
            }
        })
        return { success: true }
    } catch (error) {
        console.error("❌ Save Character Failed:", error);
        throw new Error("Failed to save character.")
    }
}

// Update character stats (HP/MP/Will)
export async function updateCharacterStats(playerId: string, statsUpdate: any) {
    try {
        const player = await prisma.player.findUnique({
            where: { id: playerId },
            select: { characterData: true } // ดึงแค่ field นี้พอ
        })

        if (!player || !player.characterData) throw new Error("Data not found")

        const charData = JSON.parse(player.characterData)
        const currentStats = charData.stats || {}
        const newStats = { ...currentStats }

        // Merge Standard
        Object.keys(statsUpdate).forEach(key => {
            if (key !== 'vitals') newStats[key] = statsUpdate[key]
        })

        // Merge Vitals (Deep)
        if (statsUpdate.vitals) {
            newStats.vitals = { ...(newStats.vitals || {}), ...statsUpdate.vitals }
        }

        charData.stats = newStats

        await prisma.player.update({
            where: { id: playerId },
            data: { characterData: JSON.stringify(charData) }
        })

        return { success: true }
    } catch (error) {
        console.error("❌ Update Stats Failed:", error)
        return { success: false } // ไม่ throw error เพื่อไม่ให้ UI พัง แต่ return false
    }
}

// Update Inventory
export async function updatePlayerInventory(playerId: string, inventory: any[]) {
    try {
        const player = await prisma.player.findUnique({
            where: { id: playerId },
            select: { characterData: true }
        })

        if (!player || !player.characterData) throw new Error("Player not found")

        const charData = JSON.parse(player.characterData)
        charData.inventory = inventory

        await prisma.player.update({
            where: { id: playerId },
            data: { characterData: JSON.stringify(charData) }
        })

        return { success: true }
    } catch (error) {
        console.error("❌ Update Inventory Failed:", error)
        return { success: false }
    }
}

// ==========================================
// 6. MISC (REVIEWS, QUICK ADD, CAMPAIGN)
// ==========================================

export async function submitReview(joinCode: string, rating: number, comment: string, reviewerName: string) {
    const session = await prisma.gameSession.findUnique({
        where: { joinCode },
        select: { campaign: { select: { creatorId: true } } }
    })

    if (!session || !session.campaign) throw new Error("Session invalid")

    await prisma.review.create({
        data: {
            rating,
            comment,
            reviewerName,
            targetUserId: session.campaign.creatorId,
            sessionCode: joinCode
        }
    })
    return { success: true }
}

export async function createCampaign(data: any) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    try {
        const campaign = await prisma.campaign.create({
            data: {
                title: data.title,
                description: data.description,
                system: data.system || 'STANDARD',
                coverImage: data.coverImage,
                storyIntro: data.storyIntro,
                storyMid: data.storyMid,
                storyEnd: data.storyEnd,
                aiEnabled: data.aiEnabled || false,
                aiName: data.aiName || "The Narrator",
                aiPersonality: data.aiPersonality,
                aiStyle: data.aiStyle,
                aiCustomPrompt: data.aiCustomPrompt,
                creatorId: session.user.id,
                isPublished: true
            }
        })
        return { success: true, campaignId: campaign.id }
    } catch (error) {
        console.error("Create Campaign Error:", error)
        return { success: false, error: "Failed to create campaign" }
    }
}

// Quick Add Temporary Assets
export async function addTemporaryAsset(joinCode: string, type: 'SCENE' | 'NPC', data: { name: string, imageUrl: string }) {
    const session = await prisma.gameSession.findUnique({
        where: { joinCode },
        select: { customScenes: true, customNpcs: true } // ดึงแค่นี้พอ
    })
    if (!session) throw new Error("Session not found")

    if (type === 'SCENE') {
        const currentScenes = session.customScenes ? JSON.parse(session.customScenes) : []
        const newScene = { id: `custom-scene-${Date.now()}`, ...data }
        await prisma.gameSession.update({
            where: { joinCode },
            data: { customScenes: JSON.stringify([...currentScenes, newScene]) }
        })
        return { success: true, asset: newScene }
    } else {
        const currentNpcs = session.customNpcs ? JSON.parse(session.customNpcs) : []
        const newNpc = { id: `custom-npc-${Date.now()}`, ...data, type: 'NEUTRAL' }
        await prisma.gameSession.update({
            where: { joinCode },
            data: { customNpcs: JSON.stringify([...currentNpcs, newNpc]) }
        })
        return { success: true, asset: newNpc }
    }
}