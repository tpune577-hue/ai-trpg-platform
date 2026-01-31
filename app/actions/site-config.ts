'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

/**
 * Get seller terms and conditions
 */
export async function getSellerTerms() {
    try {
        const config = await prisma.siteConfig.findUnique({
            where: { id: 1 },
            select: { sellerTermsConditions: true }
        })

        return config?.sellerTermsConditions || ""
    } catch (error) {
        console.error("Error fetching seller terms:", error)
        return ""
    }
}

/**
 * Update seller terms (Admin only)
 */
export async function updateSellerTerms(terms: string) {
    const session = await auth()

    // Check if user is admin
    if (session?.user?.role !== 'ADMIN') {
        return { error: 'Unauthorized - Admin access required' }
    }

    try {
        await prisma.siteConfig.upsert({
            where: { id: 1 },
            update: { sellerTermsConditions: terms },
            create: {
                id: 1,
                sellerTermsConditions: terms,
                heroTitle: "Welcome, Traveler",
                heroSubtitle: "Your adventure begins here. Choose your destiny."
            }
        })

        revalidatePath('/admin/settings')
        return { success: true }
    } catch (error) {
        console.error("Error updating seller terms:", error)
        return { error: 'Failed to update terms' }
    }
}

/**
 * Accept seller terms - creates PRE_REGISTER profile
 */
export async function acceptSellerTerms(userId: string) {
    try {
        // Check if already has profile
        const existing = await prisma.sellerProfile.findUnique({
            where: { userId }
        })

        if (existing) {
            return { error: "You already have a seller profile" }
        }

        // Create PRE_REGISTER profile
        await prisma.sellerProfile.create({
            data: {
                userId,
                status: 'PRE_REGISTER'
            }
        })

        revalidatePath('/marketplace')
        revalidatePath('/seller')
        return { success: true }
    } catch (error) {
        console.error("Error accepting seller terms:", error)
        return { error: "Failed to create seller profile" }
    }
}
