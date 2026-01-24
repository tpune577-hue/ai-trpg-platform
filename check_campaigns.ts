
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        const campaigns = await prisma.campaign.findMany({
            select: { id: true, title: true, isPublished: true, creator: { select: { email: true } } }
        })
        console.log("Total Campaigns:", campaigns.length)
        console.log("Campaigns:", JSON.stringify(campaigns, null, 2))

        const products = await prisma.product.findMany({ select: { id: true, name: true, isPublished: true } })
        console.log("Total Products:", products.length)
    } catch (e) {
        console.error(e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
