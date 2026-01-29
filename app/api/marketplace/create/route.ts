import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    try {
        const session = await auth()
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const {
            title,
            description,
            price,
            type, // 'DIGITAL_ASSET' | 'LIVE_SESSION'
            imageUrl,

            // Fields for Asset
            data, // link to file

            // Fields for Session
            sessionDate,
            duration,
            maxPlayers,
            gameLink
        } = body

        if (!title || !price || !type) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Validation ตามประเภทสินค้า
        if (type === 'LIVE_SESSION') {
            if (!sessionDate || !maxPlayers || !gameLink) {
                return NextResponse.json({ error: 'Sessions require date, max players, and game link' }, { status: 400 })
            }
        }

        const newItem = await prisma.marketplaceItem.create({
            data: {
                creatorId: session.user.id,
                title,
                description,
                price: parseFloat(price),
                imageUrl,
                type,

                // Asset Data
                data: type === 'DIGITAL_ASSET' ? data : undefined,

                // Session Data (แปลง date string กลับเป็น Date Object)
                sessionDate: sessionDate ? new Date(sessionDate) : undefined,
                duration: duration ? parseInt(duration) : undefined,
                maxPlayers: maxPlayers ? parseInt(maxPlayers) : undefined,
                gameLink: type === 'LIVE_SESSION' ? gameLink : undefined,

                isPublished: true,
            },
        })

        return NextResponse.json(newItem)
    } catch (error) {
        console.error('Create Item Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}