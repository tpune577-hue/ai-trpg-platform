import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import AdminDashboardClient from "./AdminDashboardClient"

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
    const session = await auth()

    // Check Admin Role
    if (session?.user?.role !== 'ADMIN') {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-950 text-white">
                <h1 className="text-2xl font-bold">🚫 Access Denied</h1>
            </div>
        )
    }

    // Parallel Data Fetching
    const [
        userCount,
        campaignCount,
        pendingSellersCount,
        activeSellersCount,
        pendingSellersList
    ] = await Promise.all([
        prisma.user.count(),
        prisma.campaign.count(),
        prisma.sellerProfile.count({ where: { status: 'PENDING' } }),
        prisma.sellerProfile.count({ where: { status: 'APPROVED' } }),
        prisma.sellerProfile.findMany({
            where: { status: 'PENDING' },
            orderBy: { createdAt: 'desc' },
            include: { user: true }
        })
    ])

    return (
        <div className="space-y-8 min-h-screen bg-slate-950 text-white p-8">
            <div>
                <h2 className="text-3xl font-bold text-white mb-2">Dashboard Overview</h2>
                <p className="text-slate-400">Welcome back, {session.user.name}.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Users" value={userCount} icon="👥" color="bg-blue-900/20 border-blue-800 text-blue-400" />
                <StatCard title="Total Campaigns" value={campaignCount} icon="📜" color="bg-purple-900/20 border-purple-800 text-purple-400" />
                <StatCard title="Pending Verify" value={pendingSellersCount} icon="⏳" color="bg-amber-900/20 border-amber-800 text-amber-400" highlight={pendingSellersCount > 0} />
                <StatCard title="Active Sellers" value={activeSellersCount} icon="🏪" color="bg-emerald-900/20 border-emerald-800 text-emerald-400" />
            </div>

            {/* Client Component (Table + Modal) */}
            <AdminDashboardClient pendingSellers={pendingSellersList} />
        </div>
    )
}

function StatCard({ title, value, icon, color, highlight = false }: any) {
    return (
        <div className={`p-6 rounded-xl border ${color} flex items-center justify-between relative overflow-hidden group hover:scale-[1.02] transition-transform`}>
            {highlight && <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full animate-ping m-2"></div>}
            <div className="z-10">
                <div className="text-xs font-bold uppercase opacity-70 mb-1 tracking-wider">{title}</div>
                <div className="text-4xl font-black text-white">{value}</div>
            </div>
            <div className="text-5xl opacity-20 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300 transform translate-x-2 translate-y-2">{icon}</div>
        </div>
    )
}