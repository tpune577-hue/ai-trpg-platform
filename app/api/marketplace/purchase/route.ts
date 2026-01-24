import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

export async function POST(request: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { itemId } = body

        if (!itemId) {
            return NextResponse.json({ error: 'Item ID required' }, { status: 400 })
        }

        // 1. Check if campaign exists
        const campaign = await prisma.campaign.findUnique({
            where: { id: itemId },
        })

        if (!campaign) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 })
        }

        // 2. Check if already purchased
        const existingPurchase = await prisma.purchase.findUnique({
            where: {
                userId_campaignId: {
                    userId: session.user.id,
                    campaignId: itemId,
                },
            },
        })

        if (existingPurchase) {
            return NextResponse.json({ error: 'Already purchased' }, { status: 400 })
        }

        // 3. Create purchase record
        await prisma.purchase.create({
            data: {
                userId: session.user.id,
                campaignId: itemId,
            },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error purchasing item:', error)
        return NextResponse.json({ error: 'Purchase failed' }, { status: 500 })
    }
}
