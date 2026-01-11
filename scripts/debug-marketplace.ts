
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Starting marketplace item creation debug...')

    try {
        // 1. Fetch or Create User
        console.log('1. Attempting to get/create creator...')
        let creator = await prisma.user.findFirst()

        if (!creator) {
            console.log(' - No user found, creating demo user...')
            try {
                creator = await prisma.user.create({
                    data: {
                        email: 'demo@example.com',
                        name: 'Demo User',
                        role: 'CREATOR',
                    }
                })
                console.log(' - Demo user created:', creator.id)
            } catch (e: any) {
                console.log(' - Failed to create demo user (might exist):', e.message)
                creator = await prisma.user.findUnique({ where: { email: 'demo@example.com' } })
                console.log(' - Found existing demo user:', creator?.id)
            }
        } else {
            console.log(' - Found existing user:', creator.id)
        }

        if (!creator) {
            throw new Error('Failed to resolve a creator user.')
        }

        // 2. Create Marketplace Item
        console.log('2. Attempting to create item...')
        const itemData = {
            title: 'Debug Item',
            description: 'Test description',
            type: 'ART' as const,
            price: 10.99, // Passing number
            creatorId: creator.id,
            isPublished: true,
            data: JSON.stringify({
                imageUrl: 'https://example.com/test.jpg',
                tags: ['debug', 'test'],
            }),
        }

        const item = await prisma.marketplaceItem.create({
            data: itemData,
        })

        console.log('SUCCESS! Item created:', item.id)

    } catch (error: any) {
        console.error('ERROR FAILED:', error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
