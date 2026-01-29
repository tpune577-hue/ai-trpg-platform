import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic' // บังคับไม่ให้ Cache

export async function GET() {
    const key = process.env.STRIPE_SECRET_KEY

    return NextResponse.json({
        message: "Debugging Environment Variables",
        check: {
            // 1. เช็คว่าตัวแปรมีอยู่จริงไหม
            hasStripeKey: !!key,

            // 2. เช็คความยาว (ถ้ามีค่า แต่ยาว 0 แปลว่าค่าว่าง)
            keyLength: key ? key.length : 0,

            // 3. เช็ค 3 ตัวแรก (ต้องขึ้นต้นด้วย sk_)
            prefix: key ? key.substring(0, 3) + '...' : 'none',

            // 4. ดูว่า Node Environment คืออะไร
            nodeEnv: process.env.NODE_ENV,
        },
        // 5. ลิสต์รายชื่อตัวแปรทั้งหมดที่มี (เฉพาะชื่อ Key ไม่เอา Value)
        allAvailableKeys: Object.keys(process.env).filter(k => !k.includes('SECRET') && !k.includes('KEY'))
    })
}