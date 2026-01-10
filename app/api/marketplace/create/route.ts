import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Mock user ID - replace with actual authentication
const MOCK_USER_ID = 'user-1'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { title, description, type, price, imageUrl, tags } = body

        // Validate required fields
        if (!title || !type || price === undefined || !imageUrl) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        // Create marketplace item
        const item = await prisma.marketplaceItem.create({
            data: {
                title,
                description,
                type,
                price,
                creatorId: MOCK_USER_ID,
                isPublished: true,
                data: {
                    imageUrl,
                    tags: tags || [],
                },
            },
        })

        return NextResponse.json({ success: true, item })
    } catch (error) {
        console.error('Error creating marketplace item:', error)
        return NextResponse.json({ error: 'Failed to create item' }, { status: 500 })
    }
}
