'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function createProductAction(prevState: any, formData: FormData) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    // 1. ตรวจสอบว่าเป็น Seller จริงไหม
    const sellerProfile = await prisma.sellerProfile.findUnique({
        where: { userId: session.user.id }
    })

    if (!sellerProfile || sellerProfile.status !== 'APPROVED') {
        return { error: "You are not an approved seller yet." }
    }

    // 2. รับค่าจาก Form
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const price = Number(formData.get('price'))
    const type = formData.get('type') as string
    const imageUrl = formData.get('imageUrl') as string
    const fileUrl = formData.get('fileUrl') as string // ลิงก์ไฟล์จริง (Google Drive/S3)

    if (!name || !price) {
        return { error: "Name and Price are required." }
    }

    try {
        // 3. บันทึก (SQLite: images เก็บเป็น JSON String)
        await prisma.product.create({
            data: {
                sellerId: sellerProfile.id,
                name,
                description,
                price,
                type,
                images: JSON.stringify([imageUrl]), // เก็บเป็น Array String ในรูปแบบ JSON
                fileUrl,
                isPublished: true // ขายเลยทันที
            }
        })

        revalidatePath('/seller/products')
    } catch (error) {
        console.error(error)
        return { error: "Database Error: Failed to create product." }
    }

    // 4. สำเร็จแล้วเด้งกลับหน้ารายการสินค้า
    redirect('/seller/products')
}