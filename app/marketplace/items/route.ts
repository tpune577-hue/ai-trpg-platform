import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth' // ✅ ใช้ auth จริงแทน Mock

export async function GET(request: NextRequest) {
    try {
        const session = await auth()
        const userId = session?.user?.id

        // 1. ดึง Campaign ที่ Published แล้ว
        const campaigns = await prisma.campaign.findMany({
            where: {
                isPublished: true,
            },
            include: {
                creator: {
                    select: { name: true },
                },
                _count: {
                    select: { purchases: true } // ✅ นับยอดซื้อ/โหลด
                }
            },
            orderBy: {
                createdAt: 'desc',
            },
        })

        // 2. หาว่า User ปัจจุบันซื้ออะไรไปแล้วบ้าง (ถ้า Login)
        let purchasedIds: string[] = []
        if (userId) {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                include: { ownedCampaigns: true }
            })
            purchasedIds = user?.ownedCampaigns.map(p => p.campaignId) || []
        }

        // 3. แปลงข้อมูลให้ตรงกับ Format ของ Frontend
        const items = campaigns.map((c) => ({
            id: c.id,
            title: c.title,
            description: c.description,
            type: 'CAMPAIGN', // ✅ กำหนด Type ให้เป็น CAMPAIGN
            price: c.price,
            downloads: c._count.purchases,
            rating: 5.0, // (อนาคตค่อยผูกกับ Review)
            creatorName: c.creator.name || 'Unknown GM',
            imageUrl: c.coverImage || '/images/placeholder-campaign.jpg', // ใส่รูป Default ถ้าไม่มี
            tags: [c.system] // ใช้ชื่อระบบเกมเป็น Tag
        }))

        return NextResponse.json({
            items: items,
            purchasedAssets: purchasedIds,
        })

    } catch (error) {
        console.error('Error fetching marketplace items:', error)
        return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
    }
}