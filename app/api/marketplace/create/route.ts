import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

        // TEMPORARY: Get the first available user to act as creator
        // In production, this would use the authenticated user's ID
        let creator = await prisma.user.findFirst()

        if (!creator) {
            // Create a default user if none exists
            try {
                creator = await prisma.user.create({
                    data: {
                        email: 'demo@example.com',
                        name: 'Demo User',
                        role: 'CREATOR',
                    }
                })
            } catch (createError) {
                // Handle race condition or unique constraint if demo user exists but findFirst missed it (unlikely but safe)
                creator = await prisma.user.findUnique({ where: { email: 'demo@example.com' } })
            }
        }

        if (!creator) {
            return NextResponse.json({ error: 'Failed to identify creator' }, { status: 500 })
        }

        // Create marketplace item
        const item = await prisma.marketplaceItem.create({
            data: {
                title,
                description,
                type,
                price: Number(price), // Ensure price is a number/decimal
                creatorId: creator.id,
                isPublished: true,
                data: JSON.stringify({
                    imageUrl,
                    tags: tags || [],
                }),
            },
        })

        return NextResponse.json({ success: true, item })
    } catch (error) {
        console.error('Error creating marketplace item:', error)
        return NextResponse.json({ error: 'Failed to create item' }, { status: 500 })
    }
}
