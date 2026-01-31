import Link from 'next/link'
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

export default async function SellerLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth()
    if (!session?.user) redirect('/')

    // เช็คสิทธิ์ก่อนเข้าหน้านี้
    const seller = await prisma.sellerProfile.findUnique({
        where: { userId: session.user.id }
    })

    if (!seller || (seller.status !== 'PRE_REGISTER' && seller.status !== 'APPROVED')) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-2">🚫 Access Denied</h1>
                    <p className="text-slate-400">You must be a registered seller to view this page.</p>
                    <Link href="/marketplace" className="mt-4 inline-block text-amber-500 hover:underline">Go to Marketplace</Link>
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-screen bg-slate-950 text-slate-200">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
                <div className="p-6 border-b border-slate-800">
                    <h1 className="text-xl font-bold text-emerald-500">🏪 Seller Studio</h1>
                    <p className="text-xs text-slate-500 mt-1">Manage your shop</p>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <SellerLink href="/seller/dashboard" icon="📊" label="Overview" />
                    <SellerLink href="/seller/products" icon="📦" label="My Products" />
                    <SellerLink href="/seller/orders" icon="📃" label="Orders" />
                    <SellerLink href="/seller/payouts" icon="💸" label="Payouts" />
                    <SellerLink href="/seller/settings" icon="⚙️" label="Settings" />
                </nav>
            </aside>

            {/* Content */}
            <main className="flex-1 overflow-y-auto bg-slate-950 p-8">
                {children}
            </main>
        </div>
    )
}

function SellerLink({ href, icon, label }: { href: string, icon: string, label: string }) {
    return (
        <Link href={href} className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors text-slate-300 hover:text-white">
            <span className="text-xl">{icon}</span>
            <span className="font-medium">{label}</span>
        </Link>
    )
}