// app/admin/settings/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { getSiteConfig, updateSiteConfig } from '@/app/actions/site-settings'
import ImageUploader from '@/components/shared/ImageUploader' // ใช้ Component เดิมที่มี

export default function AdminSettingsPage() {
    const [config, setConfig] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        getSiteConfig().then(data => {
            setConfig(data)
            setLoading(false)
        })
    }, [])

    const handleSave = async () => {
        setSaving(true)
        await updateSiteConfig(config)
        setSaving(false)
        alert("Guild Hall Updated! 🏰")
    }

    if (loading) return <div className="p-8 text-amber-500">Loading Scrolls...</div>

    return (
        <div className="p-6 bg-slate-900 min-h-screen text-slate-200">
            <h1 className="text-3xl font-bold text-amber-500 mb-6 flex items-center gap-2">
                🏰 Guild Hall Settings
            </h1>

            <div className="max-w-2xl space-y-6 bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">

                {/* Banner Image */}
                <div>
                    <label className="block text-sm font-bold text-slate-400 mb-2">Grand Hall Banner</label>
                    <ImageUploader
                        value={config.heroImageUrl || ''}
                        onChange={(url) => setConfig({ ...config, heroImageUrl: url })}
                        label="Upload Epic Banner"
                        aspectRatio="aspect-video"
                    />
                </div>

                {/* Titles */}
                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-400 mb-2">Welcome Title</label>
                        <input
                            value={config.heroTitle}
                            onChange={(e) => setConfig({ ...config, heroTitle: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-amber-400 font-bold text-xl focus:border-amber-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-400 mb-2">Subtitle / Slogan</label>
                        <input
                            value={config.heroSubtitle}
                            onChange={(e) => setConfig({ ...config, heroSubtitle: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-slate-300 focus:border-amber-500 outline-none"
                        />
                    </div>
                </div>

                {/* Announcement */}
                <div>
                    <label className="block text-sm font-bold text-slate-400 mb-2">Town Crier Announcement (Optional)</label>
                    <textarea
                        value={config.announcement || ''}
                        onChange={(e) => setConfig({ ...config, announcement: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-emerald-400 h-24 focus:border-emerald-500 outline-none"
                        placeholder="e.g. Double XP Weekend! New Dragon spotted in the North!"
                    />
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-amber-600 hover:bg-amber-500 text-black font-bold py-4 rounded-lg shadow-lg active:scale-95 transition-all text-lg"
                >
                    {saving ? 'Forging...' : '💾 Save Changes'}
                </button>
            </div>
        </div>
    )
}