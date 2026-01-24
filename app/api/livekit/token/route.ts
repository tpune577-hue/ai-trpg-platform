import { AccessToken } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const room = req.nextUrl.searchParams.get('room');
        const username = req.nextUrl.searchParams.get('username');

        if (!room || !username) {
            return NextResponse.json({ error: 'Missing room or username' }, { status: 400 });
        }

        const apiKey = process.env.LIVEKIT_API_KEY;
        const apiSecret = process.env.LIVEKIT_API_SECRET;
        const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

        // ✅ เช็คว่า Key มาครบมั้ย ถ้าไม่ครบให้แจ้ง Error
        if (!apiKey || !apiSecret || !wsUrl) {
            console.error("❌ LiveKit Keys Missing! Check your .env file.");
            return NextResponse.json({ error: 'Server misconfigured: Missing LiveKit Keys' }, { status: 500 });
        }

        const at = new AccessToken(apiKey, apiSecret, { identity: username });
        at.addGrant({ roomJoin: true, room: room, canPublish: true, canSubscribe: true });

        const token = await at.toJwt();

        return NextResponse.json({ token });
    } catch (error) {
        console.error("❌ Token Generation Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}