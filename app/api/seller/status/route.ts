import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const sellerProfile = await prisma.sellerProfile.findUnique({
            where: { userId: session.user.id },
            select: { status: true }
        })

        if (!sellerProfile) {
            return NextResponse.json({ status: null })
        }

        return NextResponse.json({ status: sellerProfile.status })
    } catch (error) {
        console.error('Error fetching seller status:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
