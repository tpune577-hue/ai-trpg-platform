'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

// ✅ Export type นี้เพื่อให้ Client Component เรียกใช้ได้
export type SellerStatus = 'NEW' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'TERMINATED'

export async function verifySeller(sellerId: string, status: SellerStatus, reason?: string) {
    const session = await auth()
    if (session?.user?.role !== 'ADMIN') {
        throw new Error("Unauthorized")
    }

    // Validation
    if (status === 'REJECTED' && !reason) {
        return { success: false, error: "Reject reason is required" }
    }

    try {
        await prisma.sellerProfile.update({
            where: { id: sellerId },
            data: {
                status: status,
                rejectReason: status === 'REJECTED' ? reason : null,
                updatedAt: new Date()
            }
        })

        revalidatePath('/admin') // ✅ รีเฟรชหน้า Admin (รวมถึงตัวเลข Stats)
        return { success: true }
    } catch (error) {
        console.error("Failed to update seller status:", error)
        return { success: false, error: "Database error" }
    }
}

export async function getPendingSellers(page: number = 1, pageSize: number = 50) {
    const session = await auth()

    if (session?.user?.role !== 'ADMIN') {
        throw new Error('Unauthorized')
    }

    const skip = (page - 1) * pageSize

    const [sellers, totalCount] = await Promise.all([
        prisma.sellerProfile.findMany({
            where: { status: 'PENDING' },
            orderBy: { createdAt: 'desc' },
            skip,
            take: pageSize,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true
                    }
                }
            }
        }),
        prisma.sellerProfile.count({ where: { status: 'PENDING' } })
    ])

    return {
        sellers,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        currentPage: page,
        pageSize
    }
}
