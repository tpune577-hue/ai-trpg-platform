// app/api/game/pusher/route.ts
import { NextResponse } from 'next/server'
import Pusher from 'pusher'

const pusher = new Pusher({
    appId: process.env.PUSHER_APP_ID!,
    key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
    secret: process.env.PUSHER_SECRET!,
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    useTLS: true,
})

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { action, campaignId } = body

        // ส่งข้อมูลไปที่ Channel ตาม campaignId
        // Event ชื่อ 'game-event'
        await pusher.trigger(`campaign-${campaignId}`, 'game-event', action)

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Pusher Error:', error)
        return NextResponse.json({ success: false, error: 'Failed to trigger event' }, { status: 500 })
    }
}