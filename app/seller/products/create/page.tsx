'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ImageUploader from '@/components/shared/ImageUploader'

export default function CreateProductPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [productType, setProductType] = useState<'DIGITAL_ASSET' | 'LIVE_SESSION'>('DIGITAL_ASSET')

    // Common Fields
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [price, setPrice] = useState('')
    const [imageUrl, setImageUrl] = useState('')

    // Asset Fields
    const [fileLink, setFileLink] = useState('')

    // Session Fields
    const [sessionDate, setSessionDate] = useState('')
    const [sessionTime, setSessionTime] = useState('')
    const [duration, setDuration] = useState('120') // minutes
    const [maxPlayers, setMaxPlayers] = useState('4')
    const [gameLink, setGameLink] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            // รวม Date + Time เข้าด้วยกัน
            let finalSessionDate = undefined
            if (productType === 'LIVE_SESSION' && sessionDate && sessionTime) {
                finalSessionDate = new Date(`${sessionDate}T${sessionTime}`).toISOString()
            }

            const res = await fetch('/api/marketplace/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    description,
                    price,
                    imageUrl,
                    type: productType,
                    // Asset Payload
                    data: fileLink,
                    // Session Payload
                    sessionDate: finalSessionDate,
                    duration,
                    maxPlayers,
                    gameLink
                }),
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Failed to create')
            }

            router.push('/marketplace') // หรือหน้า Dashboard ของคนขาย
        } catch (error) {
            alert('Error creating product: ' + error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto p-6">
            <h1 className="text-3xl font-bold text-amber-500 mb-6">Create New Listing</h1>

            <form onSubmit={handleSubmit} className="space-y-6 bg-slate-900 p-6 rounded-xl border border-slate-700">

                {/* 1. Product Type Selector */}
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">What are you selling?</label>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            type="button"
                            onClick={() => setProductType('DIGITAL_ASSET')}
                            className={`p-4 rounded-lg border-2 text-center transition-all ${productType === 'DIGITAL_ASSET'
                                    ? 'border-amber-500 bg-amber-500/10 text-amber-500'
                                    : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500'
                                }`}
                        >
                            📄 Digital Asset
                            <div className="text-[10px] mt-1 opacity-70">Campaign PDF, Maps, Music</div>
                        </button>
                        <button
                            type="button"
                            onClick={() => setProductType('LIVE_SESSION')}
                            className={`p-4 rounded-lg border-2 text-center transition-all ${productType === 'LIVE_SESSION'
                                    ? 'border-green-500 bg-green-500/10 text-green-500'
                                    : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500'
                                }`}
                        >
                            🎟️ Game Session
                            <div className="text-[10px] mt-1 opacity-70">Sell tickets for a live game</div>
                        </button>
                    </div>
                </div>

                {/* 2. Common Fields */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300">Title</label>
                        <input required value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-amber-500 outline-none" placeholder="e.g. The Curse of Strahd - Friday Night" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300">Description</label>
                        <textarea required value={description} onChange={e => setDescription(e.target.value)} rows={4} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-amber-500 outline-none" placeholder="Describe your campaign or session..." />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300">Price (THB)</label>
                            <input required type="number" min="0" value={price} onChange={e => setPrice(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-amber-500 outline-none" placeholder="0" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Cover Image</label>
                            {/* ใช้วิธีใส่ Link ไปก่อนเพื่อความง่าย หรือใช้ ImageUploader เดิมถ้ามี */}
                            <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white text-sm" placeholder="https://..." />
                        </div>
                    </div>
                </div>

                <hr className="border-slate-700" />

                {/* 3. Conditional Fields */}
                {productType === 'DIGITAL_ASSET' ? (
                    <div className="animate-in fade-in slide-in-from-top-2">
                        <h3 className="text-lg font-bold text-white mb-4">📄 File Details</h3>
                        <div>
                            <label className="block text-sm font-medium text-slate-300">Download Link (Google Drive / Dropbox)</label>
                            <input required value={fileLink} onChange={e => setFileLink(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-amber-500 outline-none" placeholder="https://..." />
                            <p className="text-xs text-slate-500 mt-1">Players will receive this link after purchase.</p>
                        </div>
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-top-2 space-y-4">
                        <h3 className="text-lg font-bold text-white mb-4">🎟️ Session Details</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300">Date</label>
                                <input required type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-green-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300">Time</label>
                                <input required type="time" value={sessionTime} onChange={e => setSessionTime(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-green-500 outline-none" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300">Duration (Minutes)</label>
                                <input required type="number" value={duration} onChange={e => setDuration(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-green-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300">Max Players</label>
                                <input required type="number" min="1" max="10" value={maxPlayers} onChange={e => setMaxPlayers(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-green-500 outline-none" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300">Game Link (Virtual Tabletop / Discord)</label>
                            <input required value={gameLink} onChange={e => setGameLink(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-green-500 outline-none" placeholder="https://discord.gg/..." />
                            <p className="text-xs text-slate-500 mt-1">This link will be sent to players via email.</p>
                        </div>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-4 rounded-xl font-bold text-black shadow-lg transition-all active:scale-95 ${loading ? 'bg-slate-600 cursor-not-allowed' : (
                            productType === 'LIVE_SESSION'
                                ? 'bg-green-500 hover:bg-green-400'
                                : 'bg-amber-500 hover:bg-amber-400'
                        )
                        }`}
                >
                    {loading ? 'Creating...' : (productType === 'LIVE_SESSION' ? 'Create Session Ticket' : 'Publish Asset')}
                </button>

            </form>
        </div>
    )
}