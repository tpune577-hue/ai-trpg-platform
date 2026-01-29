import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth' // หรือ import { getServerSession } ตาม Config

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const session = await auth()
        const userId = session?.user?.id

        // ==========================================
        // 1. ดึงข้อมูลจากฐานข้อมูล
        // ==========================================

        // 1.1 MarketplaceItem (Asset & Session)
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
        })

        // 1.2 Campaign (Legacy)
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
        })

        const [newItems, oldCampaigns] = await Promise.all([newItemsPromise, oldCampaignsPromise])

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
        // 4. Return Combined List
        // ==========================================

        const allItems = [...formattedNewItems, ...formattedOldCampaigns]

        return NextResponse.json({
            items: allItems,
            purchasedAssets: ownedIds,
        })

    } catch (error) {
        console.error('❌ Error fetching marketplace items:', error)
        return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
    }
}