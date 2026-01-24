import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const session = await auth()
        const userId = session?.user?.id

        // 1. ดึงข้อมูล Campaign ทั้งหมดที่ Published
        const campaigns = await prisma.campaign.findMany({
            where: { isPublished: true },
            include: {
                creator: { select: { name: true } },
                purchases: { select: { id: true } }
            },
            orderBy: { createdAt: 'desc' },
        })

        // 2. เช็คความเป็นเจ้าของ (ซื้อมา + สร้างเอง)
        let ownedIds: string[] = []
        if (userId) {
            try {
                // 2.1 ดึงรายการที่ "ซื้อมา"
                const purchases = await prisma.purchase.findMany({
                    where: { userId: userId },
                    select: { campaignId: true }
                })
                const purchasedIds = purchases.map(p => p.campaignId)

                // 2.2 ดึงรายการที่ "สร้างเอง" (ฉันเป็น Creator)
                const myCreations = await prisma.campaign.findMany({
                    where: { creatorId: userId },
                    select: { id: true }
                })
                const createdIds = myCreations.map(c => c.id)

                // 2.3 รวมกัน (และตัดตัวซ้ำออก)
                ownedIds = Array.from(new Set([...purchasedIds, ...createdIds]))

            } catch (e) {
                console.error("Error checking ownership:", e)
            }
        }

        // 3. Map ข้อมูลส่งกลับ
        const transformedItems = campaigns.map((campaign) => ({
            id: campaign.id,
            title: campaign.title,
            description: campaign.description || '',
            type: 'CAMPAIGN',
            price: campaign.price,
            downloads: campaign.purchases ? campaign.purchases.length : 0,
            rating: 5.0,
            creatorName: campaign.creator?.name || 'Unknown GM',
            imageUrl: campaign.coverImage || 'https://placehold.co/600x400/1e293b/FFF?text=Campaign',
            tags: campaign.system ? [campaign.system] : []
        }))

        return NextResponse.json({
            items: transformedItems,
            purchasedAssets: ownedIds, // ✅ ส่งรายการรวม (ซื้อ+สร้าง) กลับไป
        })

    } catch (error) {
        console.error('❌ Error fetching marketplace items:', error)
        return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
    }
}