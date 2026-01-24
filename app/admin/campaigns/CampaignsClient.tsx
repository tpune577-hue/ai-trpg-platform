'use client'

import { useState } from 'react'
import Link from 'next/link'
import { deleteCampaign, toggleCampaignStatus } from '@/app/actions/campaign'

export default function CampaignsClient({ campaigns }: { campaigns: any[] }) {
    const [searchTerm, setSearchTerm] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const filteredCampaigns = campaigns.filter(camp =>
        camp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        // ✅ Match creator name
        camp.creator?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to DELETE this campaign? This cannot be undone.")) return
        setIsLoading(true)
        const res = await deleteCampaign(id)
        setIsLoading(false)
        if (res.error) alert(res.error)
    }

    const handleToggleStatus = async (id: string, currentStatus: boolean) => {
        if (!confirm(`Are you sure you want to ${currentStatus ? 'UNPUBLISH' : 'PUBLISH'} this campaign?`)) return
        setIsLoading(true)
        await toggleCampaignStatus(id, currentStatus)
        setIsLoading(false)
    }

    return (
        <div className="space-y-6">
            {/* Search Bar */}
            <div className="flex gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
                <div className="flex-1 relative">
                    <input
                        type="text"
                        placeholder="Search by Title or Creator..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 pl-10 text-white outline-none focus:border-purple-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <span className="absolute left-3 top-2.5 text-slate-500">🔍</span>
                </div>
                <div className="flex items-center text-slate-400 text-sm font-bold px-2">
                    Total: {filteredCampaigns.length}
                </div>
            </div>

            {/* Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm text-slate-400">
                    <thead className="bg-slate-950 text-slate-500 uppercase font-bold text-xs">
                        <tr>
                            <th className="px-6 py-4">Campaign</th>
                            <th className="px-6 py-4">Creator</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Price</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {filteredCampaigns.map(camp => (
                            <tr key={camp.id} className="hover:bg-slate-800/30 transition-colors">

                                {/* Campaign Info */}
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-10 bg-slate-800 rounded overflow-hidden relative shrink-0 border border-slate-700">
                                            {/* ✅ Use standard img tag to avoid config issues */}
                                            {camp.coverImage ? (
                                                <img src={camp.coverImage} className="w-full h-full object-cover" alt="" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-xs text-slate-600">No IMG</div>
                                            )}
                                        </div>
                                        <div>
                                            {/* ✅ Link to Admin Detail Page */}
                                            <Link
                                                href={`/admin/campaigns/${camp.id}`}
                                                className="font-bold text-white line-clamp-1 max-w-[200px] hover:text-purple-400 hover:underline cursor-pointer"
                                                title={camp.title}
                                            >
                                                {camp.title}
                                            </Link>
                                            <div className="text-[10px] text-slate-500 uppercase">{camp.system || 'Unknown System'}</div>
                                        </div>
                                    </div>
                                </td>

                                {/* Creator (Link to User Detail) */}
                                <td className="px-6 py-4">
                                    <Link href={`/admin/users/${camp.creator?.id}`} className="flex items-center gap-2 hover:text-indigo-400 transition-colors group">
                                        <div className="w-6 h-6 rounded-full bg-slate-700 overflow-hidden relative">
                                            {camp.creator?.image ? <img src={camp.creator.image} className="w-full h-full object-cover" /> : null}
                                        </div>
                                        <span className="text-xs font-bold">{camp.creator?.name || 'Unknown'}</span>
                                    </Link>
                                </td>

                                {/* Status Toggle */}
                                <td className="px-6 py-4">
                                    <button
                                        disabled={isLoading}
                                        onClick={() => handleToggleStatus(camp.id, camp.isPublished)}
                                        className={`px-2 py-1 rounded text-[10px] font-bold border transition-all ${camp.isPublished
                                            ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800 hover:bg-red-900/30 hover:text-red-400 hover:border-red-800'
                                            : 'bg-slate-800 text-slate-500 border-slate-700 hover:bg-emerald-900/30 hover:text-emerald-400'
                                            }`}
                                    >
                                        {camp.isPublished ? '● Published' : '○ Draft / Hidden'}
                                    </button>
                                </td>

                                {/* Price */}
                                <td className="px-6 py-4 font-mono text-white">
                                    {camp.price > 0 ? `฿${camp.price.toLocaleString()}` : <span className="text-emerald-500">Free</span>}
                                </td>

                                {/* Actions */}
                                <td className="px-6 py-4 text-right space-x-2">
                                    {/* ✅ Link to Admin Detail Page (Analytics) */}
                                    <Link
                                        href={`/admin/campaigns/${camp.id}`}
                                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded transition-all text-xs font-bold border border-slate-700 inline-block"
                                    >
                                        📊 Analytics
                                    </Link>

                                    <button
                                        disabled={isLoading}
                                        onClick={() => handleDelete(camp.id)}
                                        className="bg-slate-800 hover:bg-red-900/50 hover:text-red-400 text-slate-500 px-3 py-1.5 rounded transition-all text-xs font-bold border border-slate-700 hover:border-red-900"
                                    >
                                        🗑
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filteredCampaigns.length === 0 && (
                            <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">No campaigns found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}