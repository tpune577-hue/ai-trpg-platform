// 📄 ไฟล์: app/actions/quick-add.ts
'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function addCustomAsset(
    sessionId: string,
    type: 'SCENE' | 'NPC',
    name: string,
    imageUrl: string
) {
    try {
        // 1. ดึงข้อมูล Session ปัจจุบัน
        const session = await prisma.gameSession.findUnique({
            where: { id: sessionId },
            select: { customScenes: true, customNpcs: true, joinCode: true }
        })

        if (!session) throw new Error("Session not found")

        // 2. เตรียมข้อมูลใหม่
        const newItem = {
            id: `temp_${Date.now()}`, // สร้าง ID ชั่วคราวที่ไม่ซ้ำ
            name,
            imageUrl, // สำหรับ Scene
            avatarUrl: imageUrl, // สำหรับ NPC (ใส่ทั้งสอง key กันพลาด)
            isCustom: true // แปะป้ายไว้ว่าเป็นของ Custom
        }

        // 3. อ่านของเก่า + เพิ่มของใหม่ลง DB
        if (type === 'SCENE') {
            const current = session.customScenes ? JSON.parse(session.customScenes) : []
            const updated = [...current, newItem]

            await prisma.gameSession.update({
                where: { id: sessionId },
                data: { customScenes: JSON.stringify(updated) }
            })
        } else {
            // NPC
            const current = session.customNpcs ? JSON.parse(session.customNpcs) : []
            const updated = [...current, newItem]

            await prisma.gameSession.update({
                where: { id: sessionId },
                data: { customNpcs: JSON.stringify(updated) }
            })
        }

        // 4. สั่งให้หน้าเว็บโหลดข้อมูลใหม่ทันที
        // ใช้ joinCode เพื่อ revalidate path ที่ถูกต้อง
        if (session.joinCode) {
            revalidatePath(`/play/${session.joinCode}/board`)
        }

        return { success: true, item: newItem }

    } catch (error) {
        console.error("Quick Add Error:", error)
        return { success: false, error: String(error) }
    }
}