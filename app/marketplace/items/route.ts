import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

// บังคับไม่ให้ Cache (ดึงสดจาก DB เสมอ)
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const session = await auth()
        const userId = session?.user?.id

        // 1. ดึงข้อมูลจากตาราง 'Campaign' (เพราะใน Schema ไม่มี MarketplaceItem)
        const campaigns = await prisma.campaign.findMany({
            where: {
                isPublished: true, // ต้องเป็น Campaign ที่ Publish แล้ว
            },
            include: {
                creator: {
                    select: { name: true }, // ดึงชื่อคนสร้าง
                },
                purchases: {
                    select: { id: true } // ดึงรายการสั่งซื้อเพื่อนับยอด
                }
            },
            orderBy: {
                createdAt: 'desc',
            },
        })

        // 2. เช็คว่า User เคยซื้ออะไรไปแล้วบ้าง
        let purchasedIds: string[] = []
        if (userId) {
            try {
                // เช็คจากตาราง Purchase
                const purchases = await prisma.purchase.findMany({
                    where: { userId: userId },
                    select: { campaignId: true }
                })
                purchasedIds = purchases.map(p => p.campaignId)
            } catch (e) {
                console.error("Error checking purchases:", e)
            }
        }

        // 3. แปลงข้อมูลส่งกลับไปหน้าบ้าน
        const transformedItems = campaigns.map((campaign) => ({
            id: campaign.id,
            title: campaign.title,
            description: campaign.description || '',

            type: 'CAMPAIGN', // ส่งค่านี้เพื่อให้หน้าบ้าน Filter ถูกต้อง
            price: campaign.price,
            downloads: campaign.purchases ? campaign.purchases.length : 0,
            rating: 5.0,

            creatorName: campaign.creator?.name || 'Unknown GM',

            // ใน Schema คุณใช้ชื่อ 'coverImage' ต้องแปลงเป็น 'imageUrl' ให้หน้าบ้าน
            imageUrl: campaign.coverImage || 'https://placehold.co/600x400/1e293b/FFF?text=Campaign',

            // เอา system มาเป็น Tag
            tags: campaign.system ? [campaign.system] : []
        }))

        return NextResponse.json({
            items: transformedItems,
            purchasedAssets: purchasedIds,
        })

    } catch (error) {
        console.error('❌ Error fetching marketplace items:', error)
        return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
    }
}