'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

interface SellerLayoutClientProps {
    children: React.ReactNode
}

export default function SellerLayoutClient({ children }: SellerLayoutClientProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const pathname = usePathname()

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200">
            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-bold text-emerald-500">🏪 Seller Studio</h1>
                </div>
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                >
                    {isSidebarOpen ? (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    ) : (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    )}
                </button>
            </div>

            <div className="flex lg:h-screen pt-14 lg:pt-0">
                {/* Sidebar - Desktop */}
                <aside className="hidden lg:flex w-64 bg-slate-900 border-r border-slate-800 flex-col">
                    <div className="p-6 border-b border-slate-800">
                        <h1 className="text-xl font-bold text-emerald-500">🏪 Seller Studio</h1>
                        <p className="text-xs text-slate-500 mt-1">Manage your shop</p>
                    </div>

                    <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                        <SellerLink href="/seller/dashboard" icon="📊" label="Overview" pathname={pathname} />
                        <SellerLink href="/seller/products" icon="📦" label="My Products" pathname={pathname} />
                        <SellerLink href="/seller/orders" icon="📃" label="Orders" pathname={pathname} />
                        <SellerLink href="/seller/payouts" icon="💸" label="Payouts" pathname={pathname} />
                        <SellerLink href="/seller/settings" icon="⚙️" label="Settings" pathname={pathname} />
                    </nav>
                </aside>

                {/* Mobile Sidebar Overlay */}
                {isSidebarOpen && (
                    <>
                        <div
                            className="lg:hidden fixed inset-0 bg-black/50 z-40"
                            onClick={() => setIsSidebarOpen(false)}
                        />
                        <aside className="lg:hidden fixed top-14 left-0 bottom-0 w-64 bg-slate-900 border-r border-slate-800 z-50 flex flex-col">
                            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                                <SellerLink
                                    href="/seller/dashboard"
                                    icon="📊"
                                    label="Overview"
                                    pathname={pathname}
                                    onClick={() => setIsSidebarOpen(false)}
                                />
                                <SellerLink
                                    href="/seller/products"
                                    icon="📦"
                                    label="My Products"
                                    pathname={pathname}
                                    onClick={() => setIsSidebarOpen(false)}
                                />
                                <SellerLink
                                    href="/seller/orders"
                                    icon="📃"
                                    label="Orders"
                                    pathname={pathname}
                                    onClick={() => setIsSidebarOpen(false)}
                                />
                                <SellerLink
                                    href="/seller/payouts"
                                    icon="💸"
                                    label="Payouts"
                                    pathname={pathname}
                                    onClick={() => setIsSidebarOpen(false)}
                                />
                                <SellerLink
                                    href="/seller/settings"
                                    icon="⚙️"
                                    label="Settings"
                                    pathname={pathname}
                                    onClick={() => setIsSidebarOpen(false)}
                                />
                            </nav>
                        </aside>
                    </>
                )}

                {/* Content */}
                <main className="flex-1 overflow-y-auto bg-slate-950">
                    {children}
                </main>
            </div>
        </div>
    )
}

function SellerLink({
    href,
    icon,
    label,
    pathname,
    onClick
}: {
    href: string
    icon: string
    label: string
    pathname: string
    onClick?: () => void
}) {
    const isActive = pathname === href || pathname.startsWith(href + '/')

    return (
        <Link
            href={href}
            onClick={onClick}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
        >
            <span className="text-xl">{icon}</span>
            <span className="font-medium">{label}</span>
        </Link>
    )
}
