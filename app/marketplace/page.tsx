// app/marketplace/page.tsx
import { auth } from "@/auth"
import MarketplaceView from "@/components/marketplace/MarketplaceView"

export default async function MarketplacePage() {
    // 1. ดึงข้อมูล User ฝั่ง Server
    const session = await auth()
    const user = session?.user || null

    // 2. ส่ง User ไปให้ Client Component ตัดสินใจว่าจะโชว์ปุ่มไหม
    return <MarketplaceView user={user} />
}