'use server'

import { prisma } from '@/lib/prisma'

import { auth } from '@/auth'

// 1. ดึงข้อมูล Campaign ที่เป็นเจ้าของ (สร้างเอง หรือ ซื้อมา)
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

    // 1.2 Query Campaign (สร้างเอง OR ซื้อมา)
    return await prisma.campaign.findMany({
        where: {
            isPublished: true, // ยังคงเอาเฉพาะที่ Publish (หรือจะเอา Draft ด้วยถ้าเป็นของตัวเอง? ตาม Requirement เอาแค่ Published ก็เซฟดี)
            OR: [
                { creatorId: userId },
                { id: { in: purchasedIds } }
            ]
        },
        include: { creator: true },
        orderBy: { updatedAt: 'desc' }
    })
}

// 2. สร้างห้อง (Create Session)
// app/actions/game.ts

// ✅ ใช้ตัวนี้แทนตัวเก่าครับ
export async function createGameSession(campaignId?: string, roomName?: string) {
    try {
        // สุ่มรหัสห้อง 6 หลัก
        const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase()

        // ตั้งชื่อห้อง (ถ้าไม่มีชื่อส่งมา ให้ใช้ชื่อ Default)
        const finalName = roomName || (campaignId === 'CUSTOM' ? "Custom Sandbox" : "Adventure Session");

        console.log('📝 Creating GameSession:', { joinCode, finalName, campaignId })

        const session = await prisma.gameSession.create({
            data: {
                joinCode,
                name: finalName, // บันทึกชื่อห้องลง DB
                campaignId: (!campaignId || campaignId === 'CUSTOM') ? undefined : campaignId,
                status: 'WAITING',
                isAiGm: true
            }
        })

        console.log('✅ GameSession created successfully:', session.joinCode)
        return { success: true, joinCode: session.joinCode }
    } catch (error) {
        console.error('❌ Error creating GameSession:', error)
        throw error // Re-throw เพื่อให้ Frontend จับได้
    }
}

// 3. ดึงข้อมูล Lobby & Game State (ใช้ทั้งหน้า Lobby และ Board)
export async function getLobbyInfo(joinCode: string) {
    const session = await prisma.gameSession.findUnique({
        where: { joinCode },
        include: {
            campaign: {
                include: {
                    preGens: true,
                    scenes: true,
                    npcs: true,
                    items: true
                }
            },
            players: {
                orderBy: { createdAt: 'asc' }
            }
        }
    })
    return session
}

// 4. เข้าห้อง (Auto Role: คนแรก = GM, คนต่อไป = Player)
export async function joinLobby(joinCode: string, playerName: string) {
    const session = await prisma.gameSession.findUnique({
        where: { joinCode },
        include: { players: true }
    })

    if (!session) throw new Error("Room not found")

    // 4.1 เช็คว่ามีชื่อนี้อยู่แล้วไหม (Re-join)
    const existingPlayer = session.players.find(p => p.name === playerName)
    if (existingPlayer) {
        return { success: true, playerId: existingPlayer.id, role: existingPlayer.role }
    }

    // 4.2 เช็คว่ามี GM หรือยัง
    const hasGM = session.players.some(p => p.role === 'GM')
    const role = hasGM ? 'PLAYER' : 'GM'

    // GM พร้อมเสมอ, Player ต้องรอเลือกตัว
    const isReady = role === 'GM'

    // 4.3 สร้าง Player ใหม่
    const player = await prisma.player.create({
        data: {
            name: playerName,
            sessionId: session.id,
            role: role,
            isReady: isReady,
            characterData: '{}' // เริ่มต้นว่างๆ
        }
    })

    return { success: true, playerId: player.id, role: player.role }
}

// 5. Player เลือกตัวละครแล้วกด Ready (Pre-Gen)
export async function setPlayerReady(playerId: string, preGenId: string) {
    const preGen = await prisma.preGenCharacter.findUnique({ where: { id: preGenId } })
    if (!preGen) throw new Error("Character Template not found")

    // Parse existing stats and add character name
    const statsData = preGen.stats ? JSON.parse(preGen.stats) : { hp: 10, maxHp: 10, mp: 10 }
    statsData.name = preGen.name // Store character name in characterData

    await prisma.player.update({
        where: { id: playerId },
        data: {
            isReady: true,
            preGenId: preGenId,
            // Keep original player name, don't overwrite with character name
            sheetType: preGen.sheetType,
            characterData: JSON.stringify(statsData)
        }
    })

    return { success: true }
}

// 6. GM กดเริ่มเกม
export async function startGame(joinCode: string) {
    await prisma.gameSession.update({
        where: { joinCode },
        data: { status: 'ACTIVE' }
    })
    return { success: true }
}

// 7. บันทึกสถานะเกม (Scene, NPCs) - ใช้ตอน GM เปลี่ยนฉาก
export async function updateGameSessionState(joinCode: string, gameState: any) {
    const session = await prisma.gameSession.findUnique({ where: { joinCode } })
    if (!session) throw new Error("Session not found")

    await prisma.gameSession.update({
        where: { joinCode },
        data: {
            currentSceneId: gameState.currentScene,
            activeNpcs: JSON.stringify(gameState.activeNpcs || [])
        }
    })

    return { success: true }
}

// 8. Kick Player (ลบออกจาก DB)
export async function kickPlayer(playerId: string) {
    try {
        await prisma.player.delete({
            where: { id: playerId }
        })
        return { success: true }
    } catch (error) {
        console.error("Kick failed:", error)
        return { success: false, error: "Failed to kick player" }
    }
}

// 8.1 Leave Lobby (ลบ Player ออกจาก Lobby เมื่อออกจากห้อง)
export async function leaveLobby(playerId: string) {
    try {
        // ดึงข้อมูล Player พร้อม Session
        const player = await prisma.player.findUnique({
            where: { id: playerId },
            include: { session: true }
        })

        if (!player) {
            return { success: false, error: "Player not found" }
        }

        // ✅ เฉพาะ WAITING เท่านั้นที่ลบทิ้ง (ถ้า PAUSED/ACTIVE ให้เก็บไว้สำหรับ Resume)
        if (player.session.status === 'WAITING') {
            await prisma.player.delete({
                where: { id: playerId }
            })
            console.log(`🚪 Player ${player.name} left lobby (WAITING session)`)
            return { success: true, removed: true }
        } else {
            // ถ้าเกมเริ่มแล้ว (ACTIVE/PAUSED) ไม่ลบ เก็บไว้ให้ Re-join ได้
            console.log(`🔄 Player ${player.name} disconnected but kept in ${player.session.status} session`)
            return { success: true, removed: false }
        }
    } catch (error) {
        console.error("Leave lobby failed:", error)
        return { success: false, error: "Failed to leave lobby" }
    }
}


// 9. Pause Session (บันทึกและเปลี่ยนสถานะ)
export async function pauseGameSession(joinCode: string) {
    await prisma.gameSession.update({
        where: { joinCode },
        data: { status: 'PAUSED' }
    })
    return { success: true }
}

// 10. ดึงรายการ Session ที่ยังเล่นไม่จบ (สำหรับหน้า Resume)
export async function getResumableSessions() {
    return await prisma.gameSession.findMany({
        where: {
            status: { in: ['ACTIVE', 'PAUSED'] }
        },
        include: {
            campaign: true,
            players: true
        },
        orderBy: { createdAt: 'desc' }
    })
}

// 11. Resume Game (เปลี่ยนจาก PAUSED -> ACTIVE)
export async function resumeGame(joinCode: string) {
    await prisma.gameSession.update({
        where: { joinCode },
        data: { status: 'ACTIVE' }
    })
    return { success: true }
}

// 12. End Game Session (จบเกมถาวร)
export async function endGameSession(joinCode: string) {
    await prisma.gameSession.update({
        where: { joinCode },
        data: { status: 'ENDED' }
    })
    return { success: true }
}

// 13. ส่ง Review ให้ GM
export async function submitReview(joinCode: string, rating: number, comment: string, reviewerName: string) {
    const session = await prisma.gameSession.findUnique({
        where: { joinCode },
        include: { campaign: true }
    })

    if (!session || !session.campaign) {
        throw new Error("Session or Campaign not found")
    }

    const gmId = session.campaign.creatorId

    await prisma.review.create({
        data: {
            rating,
            comment,
            reviewerName,
            targetUserId: gmId,
            sessionCode: joinCode
        }
    })

    return { success: true }
}

// ✅ 14. บันทึกข้อมูลตัวละคร (Save Character Sheet) - Robust Version
export async function saveCharacterSheet(playerId: string, characterData: any) {
    try {
        console.log("💾 Saving Character Sheet...");
        console.log("👉 PlayerID:", playerId);
        console.log("📦 Received Data:", JSON.stringify(characterData, null, 2));

        // 1. ตรวจสอบและเตรียมข้อมูล (Defensive Programming)
        // ถ้าไม่มีชื่อ ให้ใช้ชื่อ Default
        const charName = characterData.name || "Unknown Adventurer";

        // ถ้าไม่มี sheetType ให้ใช้ STANDARD
        const sheetType = characterData.sheetType || "STANDARD";

        // ถ้า characterData.data มีค่า ให้ใช้ตัวนั้น (Nested) ถ้าไม่มีให้ใช้ตัว characterData เอง
        const statsData = characterData.data || characterData || {};

        // 2. บันทึกลง Database
        await prisma.player.update({
            where: { id: playerId },
            data: {
                isReady: true,
                // Keep original player name, don't overwrite
                sheetType: sheetType,
                // Store character name inside characterData
                characterData: JSON.stringify({ ...statsData, name: charName })
            }
        })

        console.log("✅ Save Success!");
        return { success: true }

    } catch (error) {
        // Log Error ตัวจริงออกมาดูใน Terminal
        console.error("❌ Save Character Failed (Details):", error);
        throw new Error("Failed to save character. Check server terminal for details.")
    }
}

// Update character stats (e.g., WILL Power after use)
export async function updateCharacterStats(playerId: string, statsUpdate: any) {
    'use server'

    try {
        const player = await prisma.player.findUnique({
            where: { id: playerId }
        })

        if (!player || !player.characterData) {
            throw new Error("Player or character data not found")
        }

        const charData = JSON.parse(player.characterData)

        // ✅ SAFE DEEP MERGE: Prevent partial vitals update from wiping other fields
        const currentStats = charData.stats || {}
        const newStats = { ...currentStats }

        // 1. Merge Standard Props
        Object.keys(statsUpdate).forEach(key => {
            if (key !== 'vitals') newStats[key] = statsUpdate[key]
        })

        // 2. Merge Vitals Deeply
        if (statsUpdate.vitals) {
            newStats.vitals = {
                ...(newStats.vitals || {}),
                ...statsUpdate.vitals
            }
        }

        charData.stats = newStats

        await prisma.player.update({
            where: { id: playerId },
            data: {
                characterData: JSON.stringify(charData)
            }
        })

        return { success: true }
    } catch (error) {
        console.error("❌ Update Stats Failed:", error)
        throw new Error("Failed to update character stats")
    }
}

// ✅ 16. Update Player Inventory (Persist Items)
export async function updatePlayerInventory(playerId: string, inventory: any[]) {
    try {
        const player = await prisma.player.findUnique({
            where: { id: playerId }
        })

        if (!player || !player.characterData) {
            throw new Error("Player not found")
        }

        const charData = JSON.parse(player.characterData)

        // Update inventory field
        charData.inventory = inventory

        await prisma.player.update({
            where: { id: playerId },
            data: {
                characterData: JSON.stringify(charData)
            }
        })

        return { success: true }
    } catch (error) {
        console.error("❌ Update Inventory Failed:", error)
        return { success: false, error: "Failed to update inventory" }
    }
}
// app/actions/game.ts

// ... imports

export async function createCampaign(data: any) { // หรือระบุ Type ให้ชัดเจน
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    try {
        const campaign = await prisma.campaign.create({
            data: {
                title: data.title,
                description: data.description,
                system: data.system || 'STANDARD',
                coverImage: data.coverImage,

                // ... field อื่นๆ ...
                storyIntro: data.storyIntro,
                storyMid: data.storyMid,
                storyEnd: data.storyEnd,

                // ✅ เพิ่มส่วน AI Config
                aiEnabled: data.aiEnabled || false,
                aiName: data.aiName || "The Narrator",
                aiPersonality: data.aiPersonality, // เช่น "ดุดัน, เข้มงวด"
                aiStyle: data.aiStyle,             // เช่น "Dark Fantasy"
                aiCustomPrompt: data.aiCustomPrompt, // Advanced Prompt

                creatorId: session.user.id,
                isPublished: true // หรือ false ถ้าอยากให้ Draft ก่อน
            }
        })

        return { success: true, campaignId: campaign.id }
    } catch (error) {
        console.error("Create Campaign Error:", error)
        return { success: false, error: "Failed to create campaign" }
    }
}

// 15. Quick Add Temporary Assets (Scene/NPC)
export async function addTemporaryAsset(joinCode: string, type: 'SCENE' | 'NPC', data: { name: string, imageUrl: string }) {
    const session = await prisma.gameSession.findUnique({ where: { joinCode } })
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

