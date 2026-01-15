'use server'

import { prisma } from '@/lib/prisma'

// 1. ดึงข้อมูล Campaign ทั้งหมด (เฉพาะที่ Publish แล้ว) สำหรับหน้า Create Room
export async function getPublishedCampaigns() {
    return await prisma.campaign.findMany({
        where: { isPublished: true },
        include: { creator: true }
    })
}

// 2. สร้างห้อง (Create Session) - สร้างห้องเปล่าๆ สถานะ WAITING
export async function createGameSession(campaignId: string) {
    // Gen รหัสห้อง 6 หลัก
    const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase()

    // สร้าง Session
    const session = await prisma.gameSession.create({
        data: {
            joinCode,
            campaignId: campaignId === 'CUSTOM' ? undefined : campaignId,
            status: 'WAITING' // เริ่มต้นให้รอคนครบก่อน
        }
    })

    return session.joinCode
}

// 3. ดึงข้อมูล Lobby (ใช้ทั้งหน้า Lobby และหน้า Board)
export async function getLobbyInfo(joinCode: string) {
    const session = await prisma.gameSession.findUnique({
        where: { joinCode },
        include: {
            campaign: {
                include: {
                    // ดึง Assets ทั้งหมดเตรียมไว้ (PreGens ไว้หน้า Lobby, Scenes/NPCs ไว้หน้า Board)
                    preGens: true,
                    scenes: true,
                    npcs: true,
                    items: true
                }
            },
            players: {
                orderBy: { createdAt: 'asc' } // เรียงตามลำดับการเข้าห้อง
            }
        }
    })
    return session
}

// 4. ลงชื่อเข้าห้อง (Step 1: Login Name & Role)
export async function joinLobby(joinCode: string, playerName: string, role: 'GM' | 'PLAYER') {
    const session = await prisma.gameSession.findUnique({ where: { joinCode } })
    if (!session) throw new Error("Room not found")

    // เช็คว่ามีชื่อนี้อยู่ในห้องแล้วหรือยัง (Re-join logic)
    const existingPlayer = await prisma.player.findFirst({
        where: {
            sessionId: session.id,
            name: playerName
        }
    })

    if (existingPlayer) {
        // ถ้ามีแล้ว ให้คืนค่า ID เดิมกลับไป (ถือว่าเป็นการ Re-login)
        return { success: true, playerId: existingPlayer.id, role: existingPlayer.role }
    }

    // สร้าง Player ใหม่
    // GM: เข้ามาแล้วถือว่า Ready เลย (เพราะไม่ต้องเลือกตัว)
    // Player: เข้ามาแล้วยังไม่ Ready (ต้องเลือกตัวก่อน)
    const player = await prisma.player.create({
        data: {
            name: playerName,
            sessionId: session.id,
            role: role,
            isReady: role === 'GM',
            characterData: '{}' // เริ่มต้นว่างๆ
        }
    })

    return { success: true, playerId: player.id, role: player.role }
}

// 5. ผู้เล่นเลือกตัวละครและกด Ready (Step 2: Select Char)
export async function setPlayerReady(playerId: string, preGenId: string) {
    // 1. ดึงข้อมูล Stat ของตัวละครต้นแบบ
    const preGen = await prisma.preGenCharacter.findUnique({ where: { id: preGenId } })
    if (!preGen) throw new Error("Character Template not found")

    // 2. อัปเดต Player:
    // - ผูกกับ PreGen ID
    // - Copy Stat มาใส่ characterData (เพื่อให้เป็น Stat ของตัวเอง แก้ไขได้ภายหลัง)
    // - เปลี่ยนสถานะเป็น Ready
    await prisma.player.update({
        where: { id: playerId },
        data: {
            isReady: true,
            preGenId: preGenId,
            characterData: preGen.stats || JSON.stringify({ hp: 10, maxHp: 10, mp: 10, inventory: [] })
        }
    })

    return { success: true }
}

// 6. GM กดเริ่มเกม (Trigger Start)
export async function startGame(joinCode: string) {
    // อัปเดตสถานะห้องเป็น ACTIVE
    // หน้า Lobby ฝั่ง Client ที่ Polling อยู่จะเห็นสถานะนี้แล้ว Redirect อัตโนมัติ
    await prisma.gameSession.update({
        where: { joinCode },
        data: { status: 'ACTIVE' }
    })

    return { success: true }
}