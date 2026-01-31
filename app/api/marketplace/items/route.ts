import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth' // หรือ import { getServerSession } ตาม Config

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const session = await auth()
        const userId = session?.user?.id

        // Get pagination parameters from query string
        const { searchParams } = new URL(request.url)
        const limit = parseInt(searchParams.get('limit') || '20', 10)
        const offset = parseInt(searchParams.get('offset') || '0', 10)

        // ==========================================
        // 1. ดึงข้อมูลจากฐานข้อมูล (with pagination)
        // ==========================================

        // 1.1 MarketplaceItem (Asset & Session) - with pagination
        const newItemsPromise = prisma.marketplaceItem.findMany({
            where: { isPublished: true },
            include: {
                creator: {
                    select: {
                        name: true,
                        image: true
                    }
                },
                bookings: {
                    select: { id: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        })

        // 1.2 Campaign (Legacy) - with pagination
        const oldCampaignsPromise = prisma.campaign.findMany({
            where: { isPublished: true },
            include: {
                creator: {
                    select: {
                        name: true,
                        image: true
                    }
                },
                purchases: {
                    select: { id: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        })

        // Get total counts for pagination metadata
        const totalItemsPromise = prisma.marketplaceItem.count({
            where: { isPublished: true }
        })

        const totalCampaignsPromise = prisma.campaign.count({
            where: { isPublished: true }
        })

        const [newItems, oldCampaigns, totalItems, totalCampaigns] = await Promise.all([
            newItemsPromise,
            oldCampaignsPromise,
            totalItemsPromise,
            totalCampaignsPromise
        ])

        // ==========================================
        // 2. Ownership Check (User ID Required)
        // ==========================================
        let ownedIds: string[] = []

        if (userId) {
            try {
                // 2.1 Check Bookings + Selling Items
                const myBookings = await prisma.booking.findMany({
                    where: { userId },
                    select: { itemId: true }
                })
                const mySellingItems = await prisma.marketplaceItem.findMany({
                    where: { creatorId: userId },
                    select: { id: true }
                })

                // 2.2 Check Purchases + Created Campaigns
                const myPurchases = await prisma.purchase.findMany({
                    where: { userId },
                    select: { campaignId: true }
                })
                const myCreatedCampaigns = await prisma.campaign.findMany({
                    where: { creatorId: userId },
                    select: { id: true }
                })

                ownedIds = Array.from(new Set([
                    ...myBookings.map(b => b.itemId),
                    ...mySellingItems.map(i => i.id),
                    ...myPurchases.map(p => p.campaignId),
                    ...myCreatedCampaigns.map(c => c.id)
                ]))

            } catch (e) {
                console.error("Error checking ownership:", e)
            }
        }

        // ==========================================
        // 3. Mapping Data
        // ==========================================

        const formattedNewItems = newItems.map((item) => {
            return {
                id: item.id,
                title: item.title,
                description: item.description || '',
                price: item.price,
                imageUrl: item.imageUrl || 'https://placehold.co/600x400/1e293b/FFF?text=No+Image',
                type: item.type, // ProductType Enum

                // Session Info
                sessionDate: item.sessionDate,
                duration: item.duration,
                maxPlayers: item.maxPlayers,
                currentPlayers: item.currentPlayers,

                // Creator Info (Safe Access)
                creatorName: item.creator?.name || 'Unknown Seller',
                creatorImage: item.creator?.image || null,

                isOwner: ownedIds.includes(item.id),
                source: 'MARKETPLACE' as const
            }
        })

        const formattedOldCampaigns = oldCampaigns.map((camp) => {
            return {
                id: camp.id,
                title: camp.title,
                description: camp.description || '',
                price: camp.price,
                imageUrl: camp.coverImage || 'https://placehold.co/600x400/1e293b/FFF?text=Campaign',

                // Explicitly set type to 'CAMPAIGN'
                type: 'CAMPAIGN',

                // Nullify session fields for legacy items
                sessionDate: null,
                duration: null,
                maxPlayers: null,
                currentPlayers: 0,

                // Creator Info (Safe Access)
                creatorName: camp.creator?.name || 'Unknown GM',
                creatorImage: camp.creator?.image || null,

                isOwner: ownedIds.includes(camp.id),
                source: 'CAMPAIGN' as const
            }
        })

        // ==========================================
        // 4. Return Combined List with Pagination Metadata
        // ==========================================

        const allItems = [...formattedNewItems, ...formattedOldCampaigns]
        const totalCount = totalItems + totalCampaigns

        return NextResponse.json({
            items: allItems,
            purchasedAssets: ownedIds,
            pagination: {
                limit,
                offset,
                total: totalCount,
                hasMore: offset + limit < totalCount
            }
        })

    } catch (error) {
        console.error('❌ Error fetching marketplace items:', error)
        return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
    }
}
