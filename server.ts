import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { Server } from 'socket.io'
import { PrismaClient } from '@prisma/client'
// import แบบนี้ถูกต้องสำหรับไฟล์ ai-game-master.ts ของคุณ
import { processGameTurn, type GameMasterResponse } from './lib/ai-game-master'

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()
const prisma = new PrismaClient()

// Helper: แปลงข้อมูลจาก DB (String) ให้เป็น Object
const parseJSON = (data: any) => {
    if (typeof data === 'string') {
        try { return JSON.parse(data) } catch (e) { return {} }
    }
    return data || {}
}

app.prepare().then(() => {
    const httpServer = createServer((req, res) => {
        const parsedUrl = parse(req.url!, true)
        handle(req, res, parsedUrl)
    })

    const io = new Server(httpServer, {
        cors: { origin: '*', methods: ['GET', 'POST'] }
    })

    // Middleware: ตรวจสอบสิทธิ์ (รองรับ Demo Token)
    io.use(async (socket, next) => {
        const token = socket.handshake.auth.sessionToken
        const campaignId = socket.handshake.auth.campaignId

        try {
            let user = null

            // 🔓 ทางลัดสำหรับ DEMO
            if (token === 'DEMO_GM_TOKEN') {
                user = await prisma.user.findUnique({ where: { email: 'gm@ai-trpg.com' } })
            } else if (token === 'DEMO_PLAYER_TOKEN') {
                user = await prisma.user.findUnique({ where: { email: 'demo@ai-trpg.com' } })
            } else if (token) {
                // กรณีมี Token อื่นๆ (เผื่ออนาคต)
                user = await prisma.user.findFirst({ where: { id: token } })
            }

            // ถ้าไม่มี User (หรือหาไม่เจอ)
            if (!user) {
                // Bypass แบบสุดๆ ถ้าหาไม่เจอจริงๆ ให้เป็น Guest (เพื่อให้ Demo รันผ่าน)
                console.log('⚠️ Auth warning: User not found, creating temporary session')
                socket.data.user = { id: 'guest', name: 'Guest', role: 'PLAYER' }
            } else {
                socket.data.user = user
            }

            socket.data.campaignId = campaignId
            next()
        } catch (error) {
            console.error('Auth Error:', error)
            next(new Error('Authentication failed'))
        }
    })

    io.on('connection', (socket) => {
        console.log(`👤 User connected: ${socket.data.user.name}`)

        // เข้าร่วมห้อง
        socket.on('join_room', async ({ campaignId }) => {
            socket.join(campaignId)
            console.log(`🏠 Joined room: ${campaignId}`)

            try {
                const campaign = await prisma.campaign.findUnique({
                    where: { id: campaignId },
                    include: { characters: true }
                })

                if (campaign) {
                    // ส่ง State ปัจจุบัน
                    const currentState = parseJSON(campaign.currentState)
                    socket.emit('game:state_update', currentState)

                    // ส่งข้อมูลตัวละคร (ถ้าเป็น Player)
                    if (socket.data.user.role === 'PLAYER') {
                        const myChar = campaign.characters.find(c => c.userId === socket.data.user.id)
                        if (myChar) {
                            const charData = {
                                ...myChar,
                                stats: parseJSON(myChar.stats),
                                inventory: parseJSON(myChar.inventory)
                            }
                            socket.emit('player:character_data', charData)
                        }
                    }
                }
            } catch (e) {
                console.error("Error fetching campaign:", e)
            }
        })

        // รับ Action จากผู้เล่น
        socket.on('player_action', async (data) => {
            const { campaignId, action } = data
            console.log(`⚔️ Action received:`, action)

            // แจ้งทุกคนในห้องว่ามี Action เกิดขึ้น
            io.to(campaignId).emit('game:action', {
                player: socket.data.user.name,
                action: action
            })

            // ให้ AI ประมวลผล
            await processActionWithAI(io, campaignId, action, socket.data.user)
        })

        socket.on('disconnect', () => {
            console.log('👋 User disconnected')
        })
    })

    // ฟังก์ชัน AI (แบบ Functional ที่ถูกต้อง)
    async function processActionWithAI(io: Server, campaignId: string, action: any, user: any) {
        try {
            // 1. ดึงข้อมูลล่าสุด
            const campaign = await prisma.campaign.findUnique({
                where: { id: campaignId },
                include: { characters: true }
            })
            if (!campaign) return

            // 2. เตรียมข้อมูล (แปลง String -> Object)
            const currentStateString = parseJSON(campaign.currentState)

            // แปลงข้อมูลให้อยู่ในรูปแบบที่ AI เข้าใจ (GameState Interface)
            const gameState = {
                currentScene: currentStateString.currentScene || "Unknown",
                environment: currentStateString.environment || "Unknown",
                recentEvents: currentStateString.recentEvents || [],
                characters: campaign.characters.map(c => ({
                    id: c.id,
                    name: c.name,
                    // แมพข้อมูลอื่นๆ ตามที่มีใน DB
                    hp: 20, // ค่าสมมติถ้าไม่มีใน DB
                    maxHp: 20,
                    ac: 10,
                    class: "Adventurer",
                    level: 1
                }))
            }

            // หา Stats ของคนทำ Action
            const character = campaign.characters.find(c => c.userId === user.id)
            const actorStats = character ? parseJSON(character.stats) : { strength: 10, dexterity: 10, intelligence: 10, wisdom: 10, charisma: 10, constitution: 10 }

            // 3. ให้ AI คิด (เรียก Function ตรงๆ ไม่ต้อง new Class)
            const result = await processGameTurn(
                gameState,
                {
                    actionType: action.type || 'move', // Default fallback
                    actorId: user.id,
                    actorName: user.name || 'Unknown',
                    description: action.detail || action.description || 'does something',
                    skillName: action.skillName,
                    itemName: action.itemName
                },
                actorStats
            )

            // 4. บันทึกผลลง DB (แปลง Object -> String)
            // อัปเดต State โดยรวม (Narrative)
            const newState = {
                ...currentStateString,
                recentEvents: [...(currentStateString.recentEvents || []), result.narration].slice(-5) // เก็บ 5 เหตุการณ์ล่าสุด
            }

            await prisma.campaign.update({
                where: { id: campaignId },
                data: { currentState: JSON.stringify(newState) }
            })

            // 5. ส่งผลลัพธ์กลับไปที่หน้าจอ
            io.to(campaignId).emit('game:state_update', newState)
            io.to(campaignId).emit('chat:message', {
                id: Date.now().toString(),
                content: result.narration,
                type: 'NARRATION',
                senderName: 'Game Master'
            })

            // ส่งผลลูกเต๋า (ถ้ามี)
            if (result.dice_results) {
                io.to(campaignId).emit('game:dice_result', result.dice_results)
            }

        } catch (error) {
            console.error('AI Processing Error:', error)
            // แจ้ง Error กลับไปที่ Client เพื่อไม่ให้เงียบหาย
            io.to(campaignId).emit('chat:message', {
                id: Date.now().toString(),
                content: "The Game Master is pondering... (AI Error, falling back to manual mode)",
                type: 'NARRATION',
                senderName: 'System'
            })
        }
    }

    const PORT = process.env.PORT || 3000
    httpServer.listen(PORT, () => {
        console.log(`> Ready on http://localhost:${PORT}`)
    })
})