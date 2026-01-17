'use server'

import { prisma } from '@/lib/prisma'

// 1. ดึงข้อมูล Campaign ทั้งหมด (สำหรับหน้า Create Room)
export async function getPublishedCampaigns() {
    return await prisma.campaign.findMany({
        where: { isPublished: true },
        include: { creator: true }
    })
}

// 2. สร้างห้อง (Create Session)
export async function createGameSession(campaignId?: string) { // ใส่ ? เพื่อให้เป็น Optional (รองรับกรณีสร้างห้องเปล่า)
    const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase()

    const session = await prisma.gameSession.create({
        data: {
            joinCode,
            // ถ้าส่ง campaignId มาให้ใส่ ถ้าไม่ส่ง (หรือเป็น 'CUSTOM') ให้เป็น undefined
            campaignId: (!campaignId || campaignId === 'CUSTOM') ? undefined : campaignId,
            status: 'WAITING',
            isAiGm: true // Default
        }
    })

    return { success: true, joinCode: session.joinCode }
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

    await prisma.player.update({
        where: { id: playerId },
        data: {
            isReady: true,
            preGenId: preGenId,
            name: preGen.name, // อัปเดตชื่อตามตัวละคร Pre-Gen
            sheetType: preGen.sheetType, // ✅ อัปเดต sheetType ด้วย
            // Copy Stats มาเป็นของตัวเอง
            characterData: preGen.stats || JSON.stringify({ hp: 10, maxHp: 10, mp: 10 })
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
                name: charName,
                sheetType: sheetType,
                // แปลง JSON เป็น String ก่อนบันทึก
                characterData: JSON.stringify(statsData)
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