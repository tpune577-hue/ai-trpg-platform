'use client'

import { useState } from 'react'
import { revokeAccess } from '@/app/actions/campaign'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Buyer {
    orderItemId: string
    purchaseDate: Date
    price: number
    user: {
        id: string
        name: string | null
        email: string | null
        image: string | null
    }
}

export default function CampaignBuyers({ buyers, campaignId }: { buyers: Buyer[], campaignId: string }) {
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const handleRevoke = async (orderItemId: string, userName: string) => {
        if (!confirm(`⚠️ Are you sure you want to REVOKE access for "${userName}"?\nThey will lose access to this content immediately.`)) return

        setIsLoading(true)
        const res = await revokeAccess(orderItemId)
        setIsLoading(false)

        if (res.error) {
            alert(res.error)
        } else {
            router.refresh()
        }
    }

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mt-8">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                <h3 className="font-bold text-white text-lg">💰 Buyers List ({buyers.length})</h3>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-400">
                    <thead className="bg-slate-950 text-slate-500 uppercase font-bold text-xs">
                        <tr>
                            <th className="px-6 py-4">User</th>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Price Paid</th>
                            <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {buyers.map((item) => (
                            <tr key={item.orderItemId} className="hover:bg-slate-800/30 transition-colors">
                                <td className="px-6 py-4">
                                    <Link href={`/admin/users/${item.user.id}`} className="flex items-center gap-3 group">
                                        <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden shrink-0">
                                            {/* ใช้ img ธรรมดาเพื่อความชัวร์ */}
                                            {item.user.image ? <img src={item.user.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold">{item.user.name?.[0]}</div>}
                                        </div>
                                        <div>
                                            <div className="font-bold text-white group-hover:text-indigo-400 transition-colors">{item.user.name}</div>
                                            <div className="text-xs text-slate-500">{item.user.email}</div>
                                        </div>
                                    </Link>
                                </td>
                                <td className="px-6 py-4 text-xs">
                                    {new Date(item.purchaseDate).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 font-mono text-emerald-400">
                                    ฿{item.price.toLocaleString()}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        disabled={isLoading}
                                        onClick={() => handleRevoke(item.orderItemId, item.user.name || 'User')}
                                        className="bg-red-900/20 hover:bg-red-900/50 text-red-400 hover:text-red-200 border border-red-900/30 px-3 py-1.5 rounded text-xs font-bold transition-all"
                                    >
                                        Revoke ❌
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {buyers.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-slate-500">No purchases yet.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}