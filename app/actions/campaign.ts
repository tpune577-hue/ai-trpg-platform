'use server'

import { prisma } from '@/lib/prisma'

export async function createCampaign(data: any) {
    // 1. Create Campaign
    const campaign = await prisma.campaign.create({
        data: {
            title: data.title,
            description: data.description,
            price: data.price || 0,
            storyIntro: data.storyIntro,
            storyMid: data.storyMid,
            storyEnd: data.storyEnd,
            isPublished: true, // Demo ให้ Publish เลย
            creator: {
                connectOrCreate: {
                    where: { email: 'demo@user.com' }, // ใช้ User สมมติไปก่อน
                    create: { email: 'demo@user.com', name: 'Demo Creator' }
                }
            }
        }
    })

    // 2. Create Scenes
    if (data.scenes?.length > 0) {
        await prisma.scene.createMany({
            data: data.scenes.map((s: any) => ({
                name: s.name,
                imageUrl: s.imageUrl,
                campaignId: campaign.id
            }))
        })
    }

    // 3. Create NPCs
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

    // 4. Create Pre-Gens
    if (data.preGens?.length > 0) {
        await prisma.preGenCharacter.createMany({
            data: data.preGens.map((c: any) => ({
                name: c.name,
                bio: c.bio,
                avatarUrl: c.avatarUrl,
                stats: c.stats,
                campaignId: campaign.id
            }))
        })
    }

    return { success: true, campaignId: campaign.id }
}