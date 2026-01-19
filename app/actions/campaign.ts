'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

// --- 1. CREATE CAMPAIGN (Save & Publish) ---
export async function createCampaignAction(data: any) {
    try {
        console.log("📝 Processing Campaign:", data.title)
        console.log("Status:", data.isPublished ? "PUBLISHED" : "DRAFT")

        // 1. Create Main Campaign Record
        const campaign = await prisma.campaign.create({
            data: {
                title: data.title,
                description: data.description,
                price: data.price || 0,
                coverImage: data.coverImage,
                isPublished: data.isPublished ?? false, // ✅ รองรับ Draft

                // ✅ เพิ่ม System Field (รับค่าจากหน้า Create Campaign)
                system: data.system || 'STANDARD',

                // Story Details
                storyIntro: data.storyIntro,
                storyMid: data.storyMid,
                storyEnd: data.storyEnd,

                // Creator (Hardcoded Demo User for now)
                creator: {
                    connectOrCreate: {
                        where: { email: 'demo@gm.com' },
                        create: { email: 'demo@gm.com', name: 'Demo GM' }
                    }
                }
            }
        })

        // 2. Save Scenes
        if (data.scenes?.length > 0) {
            await prisma.scene.createMany({
                data: data.scenes.map((s: any) => ({
                    name: s.name,
                    imageUrl: s.imageUrl,
                    campaignId: campaign.id
                }))
            })
        }

        // 3. Save NPCs
        if (data.npcs?.length > 0) {
            await prisma.npc.createMany({
                data: data.npcs.map((n: any) => ({
                    name: n.name,
                    type: n.type,
                    avatarUrl: n.avatarUrl,
                    campaignId: campaign.id
                }))
            })
        }

        // 4. Save Pre-Gen Characters (Complex Logic)
        if (data.preGens?.length > 0) {
            await prisma.preGenCharacter.createMany({
                data: data.preGens.map((c: any) => {
                    // หา Description มาใส่ใน Bio (รองรับทั้ง Standard และ Role & Roll)
                    const bioText = c.data?.bio?.description || c.data?.description || ''

                    return {
                        name: c.name,
                        avatarUrl: c.imageUrl, // Map จาก UI (imageUrl) ไป DB (avatarUrl)
                        sheetType: c.sheetType || 'STANDARD',
                        bio: bioText,
                        stats: JSON.stringify(c.data), // ✅ เก็บก้อน JSON ทั้งหมด
                        campaignId: campaign.id
                    }
                })
            })
        }

        // Revalidate หน้าแรก (Dashboard) เพื่อให้ข้อมูลใหม่เด้งขึ้นมา
        revalidatePath('/')

        return { success: true, campaignId: campaign.id }

    } catch (error) {
        console.error("❌ Create Campaign Error:", error)
        throw new Error("Failed to create campaign")
    }
}

// --- 2. GET CAMPAIGNS (Dashboard) ---
export async function getCampaigns() {
    try {
        const campaigns = await prisma.campaign.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                creator: { select: { name: true } },
                _count: {
                    select: { sessions: true, purchases: true }
                }
            }
        })
        return campaigns
    } catch (error) {
        console.error("Failed to fetch campaigns:", error)
        return []
    }
}

// --- 3. GET CAMPAIGN BY ID (Detail Page) ---
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

// --- 4. GET MY CAMPAIGNS (ดึงเฉพาะของฉัน) ---
export async function getMyCampaigns() {
    try {
        // Hardcode email ไว้ก่อนเพื่อให้ตรงกับตอน Create
        const userEmail = 'demo@gm.com'

        const campaigns = await prisma.campaign.findMany({
            where: {
                creator: { email: userEmail }
            },
            orderBy: { updatedAt: 'desc' }, // เรียงตามที่แก้ล่าสุด
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

// --- 5. DELETE CAMPAIGN ---
export async function deleteCampaign(id: string) {
    try {
        await prisma.campaign.delete({
            where: { id }
        })

        revalidatePath('/campaign/my') // Refresh หน้า My Campaign
        revalidatePath('/') // Refresh หน้า Marketplace

        return { success: true }
    } catch (error) {
        console.error("Failed to delete campaign:", error)
        throw new Error("Failed to delete campaign")
    }
}

// --- 6. UPDATE CAMPAIGN ---
export async function updateCampaignAction(campaignId: string, data: any) {
    try {
        console.log("📝 Updating Campaign:", campaignId)

        // 1. Update Main Info
        await prisma.campaign.update({
            where: { id: campaignId },
            data: {
                title: data.title,
                description: data.description,
                price: data.price || 0,
                coverImage: data.coverImage,
                isPublished: data.isPublished,

                // ✅ อัปเดต System
                system: data.system || 'STANDARD',

                storyIntro: data.storyIntro,
                storyMid: data.storyMid,
                storyEnd: data.storyEnd,
            }
        })

        // 2. Update Scenes (ลบของเก่าแล้วสร้างใหม่ ง่ายสุดสำหรับความ Consistency)
        await prisma.scene.deleteMany({ where: { campaignId } })
        if (data.scenes?.length > 0) {
            await prisma.scene.createMany({
                data: data.scenes.map((s: any) => ({
                    name: s.name,
                    imageUrl: s.imageUrl,
                    campaignId: campaignId
                }))
            })
        }

        // 3. Update NPCs
        await prisma.npc.deleteMany({ where: { campaignId } })
        if (data.npcs?.length > 0) {
            await prisma.npc.createMany({
                data: data.npcs.map((n: any) => ({
                    name: n.name,
                    type: n.type,
                    avatarUrl: n.avatarUrl,
                    campaignId: campaignId
                }))
            })
        }

        // 4. Update Pre-Gens
        await prisma.preGenCharacter.deleteMany({ where: { campaignId } })
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
                        campaignId: campaignId
                    }
                })
            })
        }

        revalidatePath('/')
        revalidatePath('/campaign/my')

        return { success: true }

    } catch (error) {
        console.error("❌ Update Campaign Error:", error)
        throw new Error("Failed to update campaign")
    }
}