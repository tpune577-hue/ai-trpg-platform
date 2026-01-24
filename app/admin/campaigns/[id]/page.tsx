import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import CampaignBuyers from "./CampaignBuyers"

export const dynamic = 'force-dynamic'

interface Props {
    params: Promise<{ id: string }>
}

export default async function CampaignAdminDetailPage({ params }: Props) {
    const session = await auth()
    if (session?.user?.role !== 'ADMIN') redirect('/')

    const { id: campaignId } = await params

    // 1. Fetch Campaign และ Purchases (ผู้ที่ซื้อไปแล้ว)
    const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
            creator: { select: { id: true, name: true, email: true } },
            _count: {
                select: { sessions: true }
            },
            // ✅ แก้ไข: Query ตรงไปที่ตาราง Purchase
            purchases: {
                orderBy: { purchasedAt: 'desc' }, // เรียงตามวันที่ซื้อล่าสุด
                include: {
                    user: true // ดึงข้อมูลคนซื้อ
                }
            }
        }
    })

    if (!campaign) return notFound()

    // 2. ใช้ข้อมูลจาก campaign.purchases
    const salesItems = campaign.purchases

    // 3. คำนวณตัวเลข
    const totalBuyers = salesItems.length

    // เนื่องจากตาราง Purchase อาจจะไม่มีราคาที่ซื้อเก็บไว้ (ดูจาก Error log)
    // เราจึงใช้ราคาปัจจุบันของ Campaign * จำนวนคนซื้อ เพื่อประมาณการรายได้
    // หรือถ้าในอนาคต Purchase มี field price ค่อยมาแก้ตรงนี้ครับ
    const totalRevenue = totalBuyers * campaign.price

    // 4. แปลงข้อมูลเพื่อส่งให้ Client Component
    const buyerList = salesItems.map(item => ({
        // ส่ง ID ของ Purchase ไป (ใช้สำหรับ Revoke)
        orderItemId: item.id,
        purchaseDate: item.purchasedAt,
        price: campaign.price, // ใช้ราคา Campaign
        user: {
            id: item.user.id,
            name: item.user.name,
            email: item.user.email,
            image: item.user.image,
        }
    }))

    return (
        <div className="min-h-screen bg-slate-950 text-white p-8">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center gap-6 border-b border-slate-800 pb-6">
                    <Link href="/admin/campaigns" className="p-3 bg-slate-900 rounded-xl text-slate-400 hover:text-white transition-colors">
                        &larr; Back
                    </Link>
                    <div className="w-20 h-20 rounded-lg bg-slate-800 overflow-hidden border border-slate-700 relative shrink-0">
                        {/* ใช้ img ธรรมดาเพื่อความชัวร์เรื่อง Config */}
                        {campaign.coverImage ? (
                            <img src={campaign.coverImage} className="w-full h-full object-cover" alt="" />
                        ) : (
                            <div className="flex items-center justify-center h-full text-xs text-slate-500">No IMG</div>
                        )}
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white">{campaign.title}</h1>
                        <div className="text-slate-400 text-sm mt-1">
                            Created by: <Link href={`/admin/users/${campaign.creator?.id}`} className="text-indigo-400 hover:underline">{campaign.creator?.name}</Link>
                        </div>
                        <div className={`mt-2 inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${campaign.isPublished ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                            {campaign.isPublished ? 'PUBLISHED' : 'DRAFT'}
                        </div>
                    </div>
                </div>

                {/* --- STATS CARDS --- */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Card 1: Revenue (Estimated) */}
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl group-hover:scale-110 transition-transform">💰</div>
                        <div className="text-slate-400 text-xs font-bold uppercase mb-1">Total Revenue</div>
                        <div className="text-3xl font-black text-emerald-400">฿{totalRevenue.toLocaleString()}</div>
                        <div className="text-xs text-slate-500 mt-2">Estimated earnings</div>
                    </div>

                    {/* Card 2: Buyers */}
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl group-hover:scale-110 transition-transform">🛒</div>
                        <div className="text-slate-400 text-xs font-bold uppercase mb-1">Total Buyers</div>
                        <div className="text-3xl font-black text-white">{totalBuyers}</div>
                        <div className="text-xs text-slate-500 mt-2">Active access</div>
                    </div>

                    {/* Card 3: Sessions (Play Count) */}
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl group-hover:scale-110 transition-transform">🎲</div>
                        <div className="text-slate-400 text-xs font-bold uppercase mb-1">Play Sessions</div>
                        <div className="text-3xl font-black text-purple-400">{campaign._count.sessions}</div>
                        <div className="text-xs text-slate-500 mt-2">Games started</div>
                    </div>
                </div>

                {/* --- BUYERS TABLE (Client Component) --- */}
                <CampaignBuyers buyers={buyerList} campaignId={campaignId} />

            </div>
        </div>
    )
}