// app/play/layout.tsx
import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function PlayLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // 1. ตรวจสอบว่าล็อกอินหรือยัง
    const session = await auth()

    // 2. ถ้าไม่มี Session -> ดีดกลับไปหน้าแรกทันที
    if (!session) {
        redirect("/")
    }

    // 3. ถ้าล็อกอินแล้ว -> อนุญาตให้เรนเดอร์เนื้อหาข้างในต่อได้
    return <>{children}</>
}