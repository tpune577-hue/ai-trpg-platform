import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Mock user ID - replace with actual authentication
const MOCK_USER_ID = 'user-1'

export async function GET(request: NextRequest) {
    try {
        // Fetch all published marketplace items
        const items = await prisma.marketplaceItem.findMany({
            where: {
                isPublished: true,
            },
            include: {
                creator: {
                    select: {
                        name: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        })

        // Fetch user's purchased assets (mock for now)
        const user = await prisma.user.findUnique({
            where: { id: MOCK_USER_ID },
            select: { purchasedAssets: true },
        })

        // Transform items for frontend
        const transformedItems = items.map((item) => ({
            id: item.id,
            title: item.title,
            description: item.description,
            type: item.type,
            price: parseFloat(item.price.toString()),
            downloads: item.downloads,
            rating: item.rating ? parseFloat(item.rating.toString()) : undefined,
            creatorName: item.creator.name || 'Anonymous',
            imageUrl: (item.data as any)?.imageUrl || 'https://via.placeholder.com/800x450',
            tags: (item.data as any)?.tags || [],
        }))

        return NextResponse.json({
            items: transformedItems,
            purchasedAssets: user?.purchasedAssets || [],
        })
    } catch (error) {
        console.error('Error fetching marketplace items:', error)
        return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
    }
}
