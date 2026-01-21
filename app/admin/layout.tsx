// app/admin/layout.tsx
import Link from 'next/link'

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex h-screen bg-slate-950 text-slate-200">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
                <div className="p-6 border-b border-slate-800">
                    <h1 className="text-xl font-bold text-amber-500">🛡️ Admin Panel</h1>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <AdminLink href="/admin" icon="📊" label="Dashboard" />
                    <AdminLink href="/admin/sellers" icon="📝" label="Seller Verify" />
                    <AdminLink href="/admin/users" icon="👥" label="Users" />
                    <AdminLink href="/admin/campaigns" icon="📜" label="Campaigns" />
                    <AdminLink href="/admin/payouts" icon="💸" label="Payouts" />
                </nav>

                <div className="p-4 border-t border-slate-800 text-xs text-slate-500">
                    TRPG Platform Admin v1.0
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto bg-slate-950 p-8">
                {children}
            </main>
        </div>
    )
}

function AdminLink({ href, icon, label }: { href: string, icon: string, label: string }) {
    return (
        <Link href={href} className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors text-slate-300 hover:text-white">
            <span className="text-xl">{icon}</span>
            <span className="font-medium">{label}</span>
        </Link>
    )
}