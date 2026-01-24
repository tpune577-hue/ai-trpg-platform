'use server'

import { auth } from "@/auth"
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { redirect } from "next/navigation"

// --- ACTION: กดซื้อหรือกดรับ Campaign ---
export async function acquireCampaignAction(campaignId: string) {
    const session = await auth()

    // 1. เช็ค Login
    if (!session?.user?.id) {
        return { error: "Please login to continue." }
    }

    try {
        // 2. ดึงข้อมูล Campaign
        const campaign = await prisma.campaign.findUnique({
            where: { id: campaignId }
        })

        if (!campaign) return { error: "Campaign not found." }

        // 3. เช็คว่าเคยซื้อ/รับไปหรือยัง?
        const existingPurchase = await prisma.purchase.findFirst({
            where: {
                userId: session.user.id,
                campaignId: campaignId
            }
        })

        if (existingPurchase) {
            return { error: "You already own this campaign." }
        }

        // ==========================================
        // ✅ CASE 1: ของฟรี (Price = 0) -> ให้เลยทันที
        // ==========================================
        if (campaign.price === 0) {
            await prisma.purchase.create({
                data: {
                    userId: session.user.id,
                    campaignId: campaignId,
                    // purchasedAt จะเป็น default now()
                }
            })

            revalidatePath(`/campaign/${campaignId}`) // Refresh หน้า Campaign
            revalidatePath('/library') // Refresh หน้า Library ของ user

            return { success: true, message: "Added to library!" }
        }

        // ==========================================
        // 💰 CASE 2: ของขาย (Price > 0) -> ต้องจ่ายเงิน
        // ==========================================
        else {
            // ในอนาคต: ตรงนี้จะ Redirect ไป Stripe / Payment Gateway
            // แต่ตอนนี้เรา Return บอก Client ว่า "ไปจ่ายเงินนะ"

            console.log(`User ${session.user.id} wants to buy Campaign ${campaignId} for ${campaign.price} THB`)

            // TODO: Integrate Payment Gateway Here
            return {
                requiresPayment: true,
                price: campaign.price,
                campaignId: campaignId
            }
        }

    } catch (error) {
        console.error("Acquire Error:", error)
        return { error: "Something went wrong." }
    }
}