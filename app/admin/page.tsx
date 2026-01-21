import { prisma } from "@/lib/prisma"
import Link from "next/link"

export const dynamic = 'force-dynamic' // ✅ บังคับให้โหลดข้อมูลใหม่ทุกครั้งที่เข้าหน้า

export default async function AdminDashboard() {
    // 1. ดึงข้อมูลสถิติจริงจาก Database (รัน Parallel เพื่อความเร็ว)
    const [
        userCount,
        campaignCount,
        pendingSellersCount,
        activeSellersCount,
        recentPendingSellers
    ] = await Promise.all([
        prisma.user.count(),
        prisma.campaign.count(),
        prisma.sellerProfile.count({ where: { status: 'PENDING' } }),
        prisma.sellerProfile.count({ where: { status: 'APPROVED' } }),
        // ดึงรายการ Seller ที่รออนุมัติล่าสุด 5 คน
        prisma.sellerProfile.findMany({
            where: { status: 'PENDING' },
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: { user: true }
        })
    ])

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold text-white mb-2">Dashboard Overview</h2>
                <p className="text-slate-400">Welcome back, Admin. Here's what's happening today.</p>
            </div>

            {/* --- STATS GRID --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Users */}
                <StatCard
                    title="Total Users"
                    value={userCount}
                    icon="👥"
                    color="bg-blue-900/20 border-blue-800 text-blue-400"
                />

                {/* Total Campaigns */}
                <StatCard
                    title="Total Campaigns"
                    value={campaignCount}
                    icon="📜"
                    color="bg-purple-900/20 border-purple-800 text-purple-400"
                />

                {/* Pending Sellers (งานที่ต้องทำ) */}
                <StatCard
                    title="Pending Verify"
                    value={pendingSellersCount}
                    icon="⏳"
                    color="bg-amber-900/20 border-amber-800 text-amber-400"
                    highlight={pendingSellersCount > 0} // ถ้ามีงานค้าง ให้กระพริบเตือน
                />

                {/* Active Sellers (ร้านค้าในระบบ) */}
                <StatCard
                    title="Active Sellers"
                    value={activeSellersCount}
                    icon="🏪"
                    color="bg-emerald-900/20 border-emerald-800 text-emerald-400"
                />
            </div>

            {/* --- ACTION SECTION: PENDING SELLERS --- */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <span>📝</span> Verification Requests
                        {pendingSellersCount > 0 && (
                            <span className="bg-amber-600 text-black text-xs px-2 py-0.5 rounded-full font-bold">{pendingSellersCount}</span>
                        )}
                    </h3>
                    <Link href="/admin/sellers" className="text-sm text-amber-500 hover:text-amber-400 font-bold hover:underline">
                        View All &rarr;
                    </Link>
                </div>

                <div className="p-0">
                    {recentPendingSellers.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                            ✅ All caught up! No pending requests.
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm text-slate-400">
                            <thead className="bg-slate-950 text-slate-500 uppercase font-bold text-xs">
                                <tr>
                                    <th className="px-6 py-3">User</th>
                                    <th className="px-6 py-3">Real Name</th>
                                    <th className="px-6 py-3">Date</th>
                                    <th className="px-6 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {recentPendingSellers.map((seller) => (
                                    <tr key={seller.id} className="hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden">
                                                {seller.user.image ? (
                                                    <img src={seller.user.image} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-xs">?</div>
                                                )}
                                            </div>
                                            {seller.user.name || seller.user.email}
                                        </td>
                                        <td className="px-6 py-4">{seller.realName || '-'}</td>
                                        <td className="px-6 py-4">{new Date(seller.createdAt).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-right">
                                            <Link href="/admin/sellers" className="bg-slate-800 hover:bg-amber-600 hover:text-black text-white px-3 py-1.5 rounded transition-colors font-bold text-xs border border-slate-700">
                                                Review
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    )
}

// Component ย่อยสำหรับการ์ดตัวเลข
function StatCard({ title, value, icon, color, highlight = false }: any) {
    return (
        <div className={`p-6 rounded-xl border ${color} flex items-center justify-between relative overflow-hidden group hover:scale-[1.02] transition-transform`}>
            {highlight && (
                <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full animate-ping m-2"></div>
            )}
            <div className="z-10">
                <div className="text-xs font-bold uppercase opacity-70 mb-1 tracking-wider">{title}</div>
                <div className="text-4xl font-black text-white">{value}</div>
            </div>
            <div className="text-5xl opacity-20 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300 transform translate-x-2 translate-y-2">
                {icon}
            </div>
        </div>
    )
}