'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getMyCampaigns, deleteCampaign } from '@/app/actions/campaign'

export default function MyCampaignsPage() {
    const router = useRouter()
    const [campaigns, setCampaigns] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    // Fetch Data
    const fetchData = async () => {
        try {
            const data = await getMyCampaigns()
            setCampaigns(data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    // Handle Delete
    const handleDelete = async (id: string, title: string) => {
        if (!confirm(`Are you sure you want to delete "${title}"?\nThis action cannot be undone.`)) return

        setDeletingId(id)
        try {
            await deleteCampaign(id)
            // ลบสำเร็จ -> ดึงข้อมูลใหม่ หรือ ลบออกจาก State
            setCampaigns(prev => prev.filter(c => c.id !== id))
        } catch (error) {
            alert("Failed to delete campaign")
        } finally {
            setDeletingId(null)
        }
    }

    if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading...</div>

    return (
        <div className="min-h-screen bg-slate-950 text-white p-8 lg:p-12">
            <div className="max-w-6xl mx-auto">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                    <div>
                        <h1 className="text-4xl font-black text-amber-500 uppercase tracking-tight">My Campaigns</h1>
                        <p className="text-slate-400 mt-2">Manage your adventures and drafts.</p>
                    </div>
                    <Link
                        href="/campaign/create"
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8 py-4 rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-2"
                    >
                        <span className="text-xl">✨</span> Create New
                    </Link>
                </div>

                {/* Campaign List */}
                <div className="grid grid-cols-1 gap-6">
                    {campaigns.map((campaign) => (
                        <div key={campaign.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row gap-6 hover:border-slate-600 transition-all group shadow-lg">

                            {/* Image */}
                            <div className="w-full md:w-64 aspect-video bg-black rounded-xl overflow-hidden border border-slate-700 shrink-0 relative">
                                {campaign.coverImage ? (
                                    <img src={campaign.coverImage} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-600 bg-slate-950">No Cover</div>
                                )}

                                {/* Status Badge */}
                                <div className="absolute top-3 left-3">
                                    <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border shadow-md ${campaign.isPublished ? 'bg-emerald-900/90 text-emerald-400 border-emerald-500/50' : 'bg-slate-800/90 text-slate-300 border-slate-600'}`}>
                                        {campaign.isPublished ? 'Published' : 'Draft'}
                                    </span>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start">
                                        <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-amber-500 transition-colors">{campaign.title}</h2>
                                        <div className="text-xs text-slate-500 font-mono">Last updated: {new Date(campaign.updatedAt).toLocaleDateString()}</div>
                                    </div>
                                    <p className="text-slate-400 line-clamp-2 mb-4">{campaign.description || "No description provided."}</p>

                                    {/* Stats */}
                                    <div className="flex gap-4 text-sm text-slate-500">
                                        <div className="flex items-center gap-1 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
                                            <span>🎮</span> Sessions: <b className="text-white">{campaign._count?.sessions || 0}</b>
                                        </div>
                                        <div className="flex items-center gap-1 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
                                            <span>💰</span> Price: <b className="text-white">{campaign.price === 0 ? 'Free' : campaign.price}</b>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 mt-6 pt-6 border-t border-slate-800">
                                    <Link
                                        href={`/campaign/create?id=${campaign.id}`} // ส่ง ID ไปเพื่อ Edit (เดี๋ยวเราต้องไปทำ Logic รับ ID ที่หน้า Create)
                                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-lg text-center transition-colors border border-slate-700"
                                    >
                                        ✏️ Edit
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(campaign.id, campaign.title)}
                                        disabled={deletingId === campaign.id}
                                        className="px-6 bg-red-900/20 hover:bg-red-900/40 text-red-400 hover:text-red-300 font-bold py-3 rounded-lg border border-red-900/30 transition-colors disabled:opacity-50"
                                    >
                                        {deletingId === campaign.id ? 'Deleting...' : '🗑️ Delete'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {campaigns.length === 0 && (
                        <div className="text-center py-24 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
                            <h3 className="text-2xl font-bold text-slate-500 mb-2">No Campaigns Found</h3>
                            <p className="text-slate-600 mb-8">You haven't created any adventures yet.</p>
                            <Link
                                href="/campaign/create"
                                className="bg-amber-600 hover:bg-amber-500 text-black font-bold px-8 py-3 rounded-xl inline-block"
                            >
                                Start Creating
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}