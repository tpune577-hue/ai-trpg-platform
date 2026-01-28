// prisma/seed.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Mock Data Assets
const MOCK_SCENES = [
    { name: 'Misty Forest', imageUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2560&auto=format&fit=crop' },
    { name: 'Ancient Ruins', imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2568&auto=format&fit=crop' },
    { name: 'Tavern', imageUrl: 'https://images.unsplash.com/photo-1572061489729-373300b99c06?q=80&w=2670&auto=format&fit=crop' }
]

const MOCK_NPCS = [
    { name: 'Eldrin the Wise', type: 'FRIENDLY', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Eldrin' },
    { name: 'Shadow Stalker', type: 'ENEMY', avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Shadow' }
]

const MOCK_PREGENS = [
    {
        name: 'Valen the Knight',
        bio: 'A brave warrior seeking redemption.',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Valen',
        stats: JSON.stringify({ hp: 20, str: 15, dex: 10, int: 8 })
    },
    {
        name: 'Lyra the Mage',
        bio: 'Keeper of the ancient scrolls.',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lyra',
        stats: JSON.stringify({ hp: 12, str: 8, dex: 12, int: 16 })
    }
]

async function main() {
    console.log('🌱 Starting database seed...')

    // 1. Create Users (ตัด field role และ image ออกเพื่อให้ตรงกับ Schema)
    const gm = await prisma.user.upsert({
        where: { email: 'gm@ai-trpg.com' },
        update: {},
        create: {
            email: 'gm@ai-trpg.com',
            name: 'The Game Master'
        }
    })

    const player = await prisma.user.upsert({
        where: { email: 'player@ai-trpg.com' },
        update: {},
        create: {
            email: 'player@ai-trpg.com',
            name: 'Ready Player One'
        }
    })

    // 2. Create a Campaign (Product)
    const campaign = await prisma.campaign.create({
        data: {
            title: 'The Shadow Veil',
            description: 'An epic adventure into the unknown mist.',
            tags: 'Fantasy,Mystery,Horror',
            creatorId: gm.id,
            isPublished: true,
            price: 0, // Free

            // Story Details
            storyIntro: 'You wake up in a dense fog. The smell of damp earth fills your nose.',
            storyMid: 'The ruins reveal a dark secret about the kingdom.',
            storyEnd: 'The shadow is lifted, but at what cost?',

            // Assets
            scenes: { create: MOCK_SCENES },
            npcs: { create: MOCK_NPCS },
            preGens: { create: MOCK_PREGENS }, // ✅ เพิ่มตัวละครต้นแบบ

            items: {
                create: [
                    { name: 'Potion', type: 'CONSUMABLE', icon: '🧪', description: 'Heals 20 HP' },
                    { name: 'Iron Sword', type: 'WEAPON', icon: '⚔️', description: 'Basic damage' }
                ]
            }
        }
    })

    console.log(`✅ Campaign created: ${campaign.title} (ID: ${campaign.id})`)

    // 3. Player buys the campaign (Licensing)
    await prisma.purchase.create({
        data: {
            userId: player.id,
            campaignId: campaign.id
        }
    })
    console.log(`✅ Player purchased campaign`)

    console.log('🌱 Seed finished.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
// prisma/seed.ts (เพิ่มต่อท้าย)

// ... code เดิม ...

async function seedAudio() {
    console.log('🎵 Seeding Audio...')

    await prisma.audioTrack.createMany({
        data: [
            { name: "Epic Battle", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", type: "BGM", category: "Battle" },
            { name: "Tavern Ambience", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", type: "BGM", category: "Relax" },
            { name: "Sword Hit", url: "https://www.myinstants.com/media/sounds/minecraft-hit-sound.mp3", type: "SFX", category: "Combat" },
            { name: "Magic Spell", url: "https://www.myinstants.com/media/sounds/magic-spell.mp3", type: "SFX", category: "Magic" },
        ]
    })
}

// อย่าลืมเรียก seedAudio() ใน main()