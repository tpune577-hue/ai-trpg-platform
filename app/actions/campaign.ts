'use server'

import { auth } from "@/auth"
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

// --- 1. CREATE CAMPAIGN (Save & Publish) ---
export async function createCampaignAction(data: any) {
    const session = await auth()
    if (!session?.user?.email) return { error: "Unauthorized" }

    try {
        console.log("📝 Processing Campaign:", data.title)

        // 🛡️ 1. Seller Check: ถ้ามีการตั้งราคา ต้องเช็คว่าเป็น Seller ที่ Approved แล้วหรือไม่
        if (data.price && data.price > 0) {
            const user = await prisma.user.findUnique({
                where: { email: session.user.email },
                include: { sellerProfile: true }
            })

            if (!user?.sellerProfile || user.sellerProfile.status !== 'APPROVED') {
                return { error: "You must be a registered seller to sell paid campaigns." }
            }
        }

        // 2. Create Main Campaign Record
        const campaign = await prisma.campaign.create({
            data: {
                title: data.title,
                description: data.description,
                price: data.price || 0,
                coverImage: data.coverImage,
                isPublished: data.isPublished ?? false,
                system: data.system || 'STANDARD',
                storyIntro: data.storyIntro,
                storyMid: data.storyMid,
                storyEnd: data.storyEnd,
                // ✅ ใช้ Email ของ User ที่ Login จริงๆ แทน Demo
                creator: {
                    connect: { email: session.user.email }
                }
            }
        })

        // 3. Save Related Data (Scenes, NPCs, PreGens)
        if (data.scenes?.length > 0) {
            await prisma.scene.createMany({
                data: data.scenes.map((s: any) => ({
                    name: s.name, imageUrl: s.imageUrl, campaignId: campaign.id
                }))
            })
        }

        if (data.npcs?.length > 0) {
            await prisma.npc.createMany({
                data: data.npcs.map((n: any) => ({
                    name: n.name, type: n.type, avatarUrl: n.avatarUrl, campaignId: campaign.id
                }))
            })
        }

        if (data.preGens?.length > 0) {
            await prisma.preGenCharacter.createMany({
                data: data.preGens.map((c: any) => {
                    const bioText = c.data?.bio?.description || c.data?.description || ''
                    return {
                        name: c.name,
                        avatarUrl: c.imageUrl,
                        sheetType: c.sheetType || 'STANDARD',
                        bio: bioText,
                        stats: JSON.stringify(c.data),
                        campaignId: campaign.id
                    }
                })
            })
        }

        revalidatePath('/')
        return { success: true, campaignId: campaign.id }

    } catch (error) {
        console.error("❌ Create Campaign Error:", error)
        return { error: "Failed to create campaign" }
    }
}

// --- 2. GET CAMPAIGNS (Dashboard & Admin) ---
export async function getCampaigns() {
    try {
        const campaigns = await prisma.campaign.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                creator: { select: { name: true } },
                _count: {
                    select: { sessions: true, purchases: true } // หมายเหตุ: purchases ในที่นี้คือนับจำนวน relation
                }
            }
        })
        return campaigns
    } catch (error) {
        console.error("Failed to fetch campaigns:", error)
        return []
    }
}

// --- 3. GET CAMPAIGN BY ID ---
export async function getCampaignById(id: string) {
    try {
        const campaign = await prisma.campaign.findUnique({
            where: { id },
            include: {
                creator: { select: { name: true, email: true } },
                scenes: true,
                npcs: true,
                preGens: true
            }
        })
        return campaign
    } catch (error) {
        console.error("Failed to fetch campaign:", error)
        return null
    }
}

// --- 4. GET MY CAMPAIGNS ---
export async function getMyCampaigns() {
    const session = await auth()
    if (!session?.user?.email) return []

    try {
        // ✅ ใช้ Email จริงๆ ของ User
        const campaigns = await prisma.campaign.findMany({
            where: {
                creator: { email: session.user.email }
            },
            orderBy: { updatedAt: 'desc' },
            include: {
                _count: { select: { sessions: true, purchases: true } }
            }
        })
        return campaigns
    } catch (error) {
        console.error("Failed to fetch my campaigns:", error)
        return []
    }
}

// --- 5. DELETE CAMPAIGN (Admin & Owner) ---
export async function deleteCampaign(id: string) {
    const session = await auth()
    if (!session?.user) return { error: "Unauthorized" }

    const isAdmin = session.user.role === 'ADMIN'

    try {
        if (isAdmin) {
            await prisma.campaign.delete({ where: { id } })
        } else {
            // ถ้าไม่ใช่ Admin ต้องเช็คว่าเป็นเจ้าของหรือไม่
            const campaign = await prisma.campaign.findUnique({
                where: { id },
                include: { creator: true }
            })

            if (campaign?.creator?.email !== session.user.email) {
                return { error: "You are not authorized to delete this campaign." }
            }

            await prisma.campaign.delete({ where: { id } })
        }

        revalidatePath('/admin/campaigns')
        revalidatePath('/campaign/my')
        revalidatePath('/')
        return { success: true }
    } catch (error) {
        console.error("Failed to delete campaign:", error)
        return { error: "Failed to delete campaign. It might have active orders." }
    }
}

// --- 6. UPDATE CAMPAIGN ---
export async function updateCampaignAction(campaignId: string, data: any) {
    const session = await auth()
    if (!session?.user?.email) return { error: "Unauthorized" }

    try {
        console.log("📝 Updating Campaign:", campaignId)

        // 🛡️ Seller Check สำหรับการแก้ไขด้วย
        if (data.price && data.price > 0) {
            const user = await prisma.user.findUnique({
                where: { email: session.user.email },
                include: { sellerProfile: true }
            })

            if (!user?.sellerProfile || user.sellerProfile.status !== 'APPROVED') {
                return { error: "You must be a registered seller to sell paid campaigns." }
            }
        }

        // ตรวจสอบความเป็นเจ้าของ (ถ้าไม่ใช่ Admin)
        if (session.user.role !== 'ADMIN') {
            const existingCampaign = await prisma.campaign.findUnique({
                where: { id: campaignId },
                include: { creator: true }
            })
            if (existingCampaign?.creator?.email !== session.user.email) {
                return { error: "Unauthorized" }
            }
        }

        await prisma.campaign.update({
            where: { id: campaignId },
            data: {
                title: data.title,
                description: data.description,
                price: data.price || 0,
                coverImage: data.coverImage,
                isPublished: data.isPublished,
                system: data.system || 'STANDARD',
                storyIntro: data.storyIntro,
                storyMid: data.storyMid,
                storyEnd: data.storyEnd,
            }
        })

        // Re-create relations logic
        await prisma.scene.deleteMany({ where: { campaignId } })
        if (data.scenes?.length > 0) {
            await prisma.scene.createMany({
                data: data.scenes.map((s: any) => ({
                    name: s.name, imageUrl: s.imageUrl, campaignId: campaignId
                }))
            })
        }

        await prisma.npc.deleteMany({ where: { campaignId } })
        if (data.npcs?.length > 0) {
            await prisma.npc.createMany({
                data: data.npcs.map((n: any) => ({
                    name: n.name, type: n.type, avatarUrl: n.avatarUrl, campaignId: campaignId
                }))
            })
        }

        await prisma.preGenCharacter.deleteMany({ where: { campaignId } })
        if (data.preGens?.length > 0) {
            await prisma.preGenCharacter.createMany({
                data: data.preGens.map((c: any) => {
                    const bioText = c.data?.bio?.description || c.data?.description || ''
                    return {
                        name: c.name, avatarUrl: c.imageUrl, sheetType: c.sheetType || 'STANDARD',
                        bio: bioText, stats: JSON.stringify(c.data), campaignId: campaignId
                    }
                })
            })
        }

        revalidatePath('/')
        revalidatePath('/campaign/my')
        return { success: true }

    } catch (error) {
        console.error("❌ Update Campaign Error:", error)
        return { error: "Failed to update campaign" }
    }
}

// --- 7. TOGGLE CAMPAIGN STATUS (Admin) ---
export async function toggleCampaignStatus(campaignId: string, currentStatus: boolean) {
    const session = await auth()
    if (session?.user?.role !== 'ADMIN') return { error: "Unauthorized" }

    try {
        await prisma.campaign.update({
            where: { id: campaignId },
            data: { isPublished: !currentStatus }
        })
        revalidatePath('/admin/campaigns')
        return { success: true }
    } catch (error) {
        return { error: "Failed to update status" }
    }
}

// --- 8. REVOKE ACCESS (Admin) ---
export async function revokeAccess(purchaseId: string) {
    const session = await auth()
    if (session?.user?.role !== 'ADMIN') return { error: "Unauthorized" }

    try {
        // ✅ ใช้ Purchase Table เพราะหน้า Admin Analytics Query มาจากตารางนี้
        await prisma.purchase.delete({
            where: { id: purchaseId }
        })

        revalidatePath('/admin/campaigns/[id]')
        return { success: true }
    } catch (error) {
        console.error(error)
        return { error: "Failed to revoke access" }
    }
}