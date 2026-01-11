import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Mock user ID - replace with actual authentication
const MOCK_USER_ID = 'user-1'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { itemId } = body

        if (!itemId) {
            return NextResponse.json({ error: 'Item ID required' }, { status: 400 })
        }

        // Check if item exists
        const item = await prisma.marketplaceItem.findUnique({
            where: { id: itemId },
        })

        if (!item) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 })
        }

        // Get user
        const user = await prisma.user.findUnique({
            where: { id: MOCK_USER_ID },
            select: { purchasedAssets: true },
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Parse existing assets or start empty
        const currentAssets = user.purchasedAssets ? JSON.parse(user.purchasedAssets as unknown as string) : []

        // Check if already purchased
        if (currentAssets.includes(itemId)) {
            return NextResponse.json({ error: 'Already purchased' }, { status: 400 })
        }

        // Add to purchased assets
        const newAssets = [...currentAssets, itemId]

        await prisma.user.update({
            where: { id: MOCK_USER_ID },
            data: {
                purchasedAssets: JSON.stringify(newAssets),
            },
        })

        // Increment download count
        await prisma.marketplaceItem.update({
            where: { id: itemId },
            data: {
                downloads: {
                    increment: 1,
                },
            },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error purchasing item:', error)
        return NextResponse.json({ error: 'Purchase failed' }, { status: 500 })
    }
}
