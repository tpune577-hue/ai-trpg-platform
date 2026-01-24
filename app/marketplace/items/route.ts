import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth' // ✅ ใช้ auth จริงแทน Mock

export async function GET(request: NextRequest) {
    try {
        const session = await auth()
        const userId = session?.user?.id

        // 1. Fetch Published Campaigns
        const campaignsPromise = prisma.campaign.findMany({
            where: { isPublished: true },
            include: {
                creator: { select: { name: true } },
                _count: { select: { purchases: true } }
            },
            orderBy: { createdAt: 'desc' }
        })

        // 2. Fetch Published Products (Assets, Art, Themes)
        const productsPromise = prisma.product.findMany({
            where: { isPublished: true },
            include: {
                seller: {
                    include: { user: { select: { name: true } } }
                },
                _count: { select: { orderItems: true } }
            },
            orderBy: { createdAt: 'desc' }
        })

        const [campaigns, products] = await Promise.all([campaignsPromise, productsPromise])

        // 3. Map Campaigns
        const campaignItems = campaigns.map((c) => ({
            id: c.id,
            title: c.title,
            description: c.description || '',
            type: 'CAMPAIGN',
            price: c.price,
            downloads: c._count.purchases,
            rating: 5.0,
            creatorName: c.creator.name || 'Unknown GM',
            imageUrl: c.coverImage || '/images/placeholder-campaign.jpg',
            tags: [c.system],
            createdAt: c.createdAt
        }))

        // 4. Map Products
        const productItems = products.map((p) => {
            let imageUrl = '/images/placeholder.jpg'
            try {
                // Parse JSON string for images (handling potential errors)
                const images = p.images ? JSON.parse(p.images) : []
                if (Array.isArray(images) && images.length > 0) imageUrl = images[0]
                else if (typeof images === 'string') imageUrl = images
            } catch (e) {
                console.error("Error parsing product images:", e)
            }

            // Map Product Type to Marketplace Type
            // 'ITEM', 'CHARACTER_ART', 'SCENE_ART', 'AUDIO', 'RULESET'
            let marketType = 'THEME'
            if (p.type.includes('ART') || p.type === 'ITEM') marketType = 'ART'

            return {
                id: p.id,
                title: p.name,
                description: p.description || '',
                type: marketType,
                price: p.price,
                downloads: p._count.orderItems, // Use order count for downloads
                rating: 4.8,
                creatorName: p.seller?.user?.name || 'Unknown Creator',
                imageUrl: imageUrl,
                tags: [p.type],
                createdAt: p.createdAt
            }
        })

        // 5. Combine and Sort by Date (Newest First)
        const allItems = [...campaignItems, ...productItems].sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )

        // 6. Get User Purchased IDs
        let purchasedIds: string[] = []
        if (userId) {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                include: {
                    ownedCampaigns: true,
                    inventory: true
                }
            })
            const campaignIds = user?.ownedCampaigns.map(p => p.campaignId) || []
            const productIds = user?.inventory.map(i => i.productId) || []
            purchasedIds = [...campaignIds, ...productIds]
        }

        return NextResponse.json({
            items: allItems,
            purchasedAssets: purchasedIds,
        })

    } catch (error) {
        console.error('Error fetching marketplace items:', error)
        return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
    }
}