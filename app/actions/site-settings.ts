// app/actions/site-settings.ts
'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'

// ดึงค่า Config (ถ้าไม่มีให้สร้าง Default)
export async function getSiteConfig() {
    let config = await prisma.siteConfig.findUnique({ where: { id: 1 } })

    if (!config) {
        config = await prisma.siteConfig.create({
            data: {
                heroTitle: "The Guild Hall",
                heroSubtitle: "Gather your party and venture forth.",
                heroImageUrl: "https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?q=80&w=2544&auto=format&fit=crop" // รูป Default เท่ๆ
            }
        })
    }
    return config
}

// บันทึกค่า
export async function updateSiteConfig(data: any) {
    const session = await auth()
    // เช็คว่าเป็น Admin จริงไหม (ในระบบจริงควรเช็ค role)
    if (!session?.user) throw new Error("Unauthorized")

    await prisma.siteConfig.upsert({
        where: { id: 1 },
        update: {
            heroTitle: data.heroTitle,
            heroSubtitle: data.heroSubtitle,
            heroImageUrl: data.heroImageUrl,
            announcement: data.announcement
        },
        create: {
            id: 1,
            ...data
        }
    })

    revalidatePath('/') // สั่งให้หน้า Home โหลดใหม่ทันที
    return { success: true }
}