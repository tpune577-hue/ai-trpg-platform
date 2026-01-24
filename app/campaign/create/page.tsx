// 📄 ไฟล์: app/campaign/create/page.tsx
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import CreateCampaignForm from "./CreateCampaignForm" // ✅ เรียกใช้ไฟล์ Form ที่เราแยกไว้

export const dynamic = 'force-dynamic'

export default async function CreateCampaignPage() {
    // 1. เช็ค Login
    const session = await auth()
    if (!session?.user?.email) {
        redirect("/")
    }

    // 2. ดึงข้อมูล User และสถานะ Seller จาก Database จริงๆ
    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: { sellerProfile: true }
    })

    // 3. เช็คว่าเป็น APPROVED หรือไม่
    const isApprovedSeller = user?.sellerProfile?.status === 'APPROVED'

    // 4. ส่งค่า isApprovedSeller ไปให้ Form
    return (
        <CreateCampaignForm isApprovedSeller={isApprovedSeller} />
    )
}