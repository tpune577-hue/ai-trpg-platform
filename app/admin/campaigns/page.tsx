import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import CampaignsClient from "./CampaignsClient"

export const dynamic = 'force-dynamic'

export default async function CampaignManagementPage() {
    const session = await auth()
    if (session?.user?.role !== 'ADMIN') redirect('/')

    // ดึง Campaign ทั้งหมด + ชื่อคนสร้าง
    const campaigns = await prisma.campaign.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            // ✅ แก้จาก user เป็น creator
            creator: {
                select: { id: true, name: true, image: true }
            }
        },
        take: 50
    })

    return (
        <div className="min-h-screen bg-slate-950 text-white p-8">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center gap-4 mb-4">
                    <Link href="/admin" className="p-2 bg-slate-900 rounded-lg text-slate-400 hover:text-white transition-colors">
                        &larr; Back
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black text-white uppercase tracking-widest">Campaigns</h1>
                        <p className="text-slate-400">Manage all content, remove violations.</p>
                    </div>
                </div>

                {/* Client Component */}
                <CampaignsClient campaigns={campaigns} />

            </div>
        </div>
    )
}