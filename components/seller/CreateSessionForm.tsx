'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CreateSessionForm() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    // Common Fields
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [price, setPrice] = useState('')
    const [imageUrl, setImageUrl] = useState('')

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
            if (sessionDate && sessionTime) {
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
                    type: 'LIVE_SESSION',
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

            router.push('/seller/products')
            router.refresh()
        } catch (error) {
            alert('Error creating product: ' + error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto">
            <form onSubmit={handleSubmit} className="space-y-6 bg-slate-900 p-6 rounded-xl border border-slate-700">

                <div className="bg-emerald-900/20 border border-emerald-900 rounded-lg p-4 mb-6 text-emerald-300 text-sm">
                    ✨ You are creating a ticket for a live game session. Players who purchase this will receive the game link and details via email.
                </div>

                {/* 1. Common Fields */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300">Session Title</label>
                        <input required value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-amber-500 outline-none" placeholder="e.g. The Curse of Strahd - Friday Night" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300">Description</label>
                        <textarea required value={description} onChange={e => setDescription(e.target.value)} rows={4} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-amber-500 outline-none" placeholder="Describe your campaign, playstyle, and requirements..." />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300">Price (THB)</label>
                            <input required type="number" min="0" value={price} onChange={e => setPrice(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-amber-500 outline-none" placeholder="0" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Cover Image URL</label>
                            <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white text-sm" placeholder="https://..." />
                        </div>
                    </div>
                </div>

                <hr className="border-slate-700" />

                {/* 2. Session Details */}
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
                        <p className="text-xs text-slate-500 mt-1">This link will be sent to players via email after purchase.</p>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-4 rounded-xl font-bold text-black shadow-lg transition-all active:scale-95 ${loading ? 'bg-slate-600 cursor-not-allowed' : 'bg-green-500 hover:bg-green-400'}`}
                >
                    {loading ? 'Creating...' : 'Create Session Ticket'}
                </button>

            </form>
        </div>
    )
}
