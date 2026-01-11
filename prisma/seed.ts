import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Starting database seed (Safe Mode)...')

    // 1. GM (ใช้ upsert: ถ้ามีแล้วก็ใช้ตัวเดิม)
    const gm = await prisma.user.upsert({
        where: { email: 'gm@ai-trpg.com' },
        update: {},
        create: {
            email: 'gm@ai-trpg.com',
            name: 'The Game Master',
            role: 'GM',
            image: 'https://api.dicebear.com/7.x/bottts/svg?seed=gm',
        },
    })
    console.log('✅ GM Ready:', gm.id)

    // 2. Player (ใช้ upsert)
    const player = await prisma.user.upsert({
        where: { email: 'demo@ai-trpg.com' },
        update: {},
        create: {
            email: 'demo@ai-trpg.com',
            name: 'Demo Player',
            role: 'PLAYER',
            image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=player',
        },
    })
    console.log('✅ Player Ready:', player.id)

    // 3. Campaign (ใช้ upsert โดยเช็คจาก inviteCode)
    const campaign = await prisma.campaign.upsert({
        where: { inviteCode: 'DEMO123' },
        update: {}, // ถ้ามีอยู่แล้ว ไม่ต้องทำอะไร
        create: {
            title: 'The Cursed Forest (Demo)',
            description: 'ป่าต้องสาปที่เต็มไปด้วยหมอกและความลับ...',
            theme: 'Dark Fantasy',
            gmId: gm.id,
            inviteCode: 'DEMO123',
            isActive: true,
            currentState: JSON.stringify({
                currentScene: 'คุณยืนอยู่หน้าทางเข้าป่าที่เต็มไปด้วยหมอกหนาทึบ เสียงกิ่งไม้หักดังมาจากความมืด...',
                environment: 'Misty, Dark, Mysterious',
            }),
        },
    })
    console.log('✅ Campaign Ready:', campaign.title)

    // 4. Character (ลบตัวเก่าทิ้งก่อนกันเบิ้ล แล้วสร้างใหม่)
    // ลบตัวละครชื่อ Aragorn ที่เป็นของ Demo Player ทิ้งก่อน (ถ้ามี)
    await prisma.character.deleteMany({
        where: {
            userId: player.id,
            name: 'Aragorn'
        }
    })

    // สร้างใหม่
    const character = await prisma.character.create({
        data: {
            name: 'Aragorn',
            userId: player.id,
            campaignId: campaign.id,
            stats: JSON.stringify({
                strength: 16,
                dexterity: 14,
                constitution: 14,
                intelligence: 10,
                wisdom: 12,
                charisma: 10,
            }),
            inventory: JSON.stringify({
                gold: 10,
                items: ['Sword', 'Potion', 'Torch'],
            }),
        },
    })
    console.log('✅ Character Ready:', character.name)

    console.log('🎉 Seed completed successfully!')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
