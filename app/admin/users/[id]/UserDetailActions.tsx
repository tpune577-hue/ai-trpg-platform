'use client'

import { useState } from 'react'
import { banUserAction, updateUserRole } from '@/app/actions/user'
import { useRouter } from 'next/navigation'

export default function UserDetailActions({ user }: { user: any }) {
    const [isBanModalOpen, setIsBanModalOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const isBanned = user.bannedUntil && new Date(user.bannedUntil) > new Date()

    const handleRoleToggle = async () => {
        const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN'
        const actionText = newRole === 'ADMIN' ? "Promote to Admin" : "Demote to User"

        if (!confirm(`Are you sure you want to ${actionText}?`)) return

        setIsLoading(true)
        const res = await updateUserRole(user.id, newRole)
        setIsLoading(false)

        if (res.error) {
            alert(res.error)
        } else {
            router.refresh()
        }
    }

    return (
        <>
            <div className="flex gap-3 mt-4 pt-4 border-t border-slate-800">
                <button
                    disabled={isLoading}
                    onClick={handleRoleToggle}
                    className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all flex items-center gap-2 ${user.role === 'ADMIN'
                            ? 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                            : 'bg-indigo-900/30 text-indigo-400 border-indigo-800 hover:bg-indigo-900/50'
                        }`}
                >
                    {isLoading ? 'Processing...' : (user.role === 'ADMIN' ? '▼ Demote to User' : '▲ Promote to Admin')}
                </button>

                <button
                    onClick={() => setIsBanModalOpen(true)}
                    className="bg-slate-800 hover:bg-red-900/50 hover:text-red-400 text-slate-300 border border-slate-700 px-4 py-2 rounded-lg transition-all text-xs font-bold flex items-center gap-2"
                >
                    {isBanned ? '🔨 Manage Ban' : '🚫 Ban User'}
                </button>
            </div>

            {isBanModalOpen && (
                <BanModal
                    user={user}
                    onClose={() => setIsBanModalOpen(false)}
                    onSuccess={() => router.refresh()}
                />
            )}
        </>
    )
}

function BanModal({ user, onClose, onSuccess }: { user: any, onClose: () => void, onSuccess: () => void }) {
    const [duration, setDuration] = useState('7_DAYS')
    const [reason, setReason] = useState('')
    const [customDate, setCustomDate] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const isBanned = user.bannedUntil && new Date(user.bannedUntil) > new Date()

    const handleSubmit = async () => {
        setIsLoading(true)
        const finalDuration = duration === 'CUSTOM' ? customDate : duration
        await banUserAction(user.id, finalDuration, reason)
        setIsLoading(false)
        onSuccess()
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-1">{isBanned ? 'Edit Ban / Unban' : 'Ban User'}</h2>
                <p className="text-slate-400 text-sm mb-6">User: <span className="text-white font-bold">{user.name}</span></p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Duration</label>
                        <select value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none">
                            <option value="1_DAY">1 Day (Warning)</option>
                            <option value="7_DAYS">7 Days</option>
                            <option value="30_DAYS">30 Days</option>
                            <option value="PERMANENT">Permanent (Forever)</option>
                            <option value="CUSTOM">Custom Date...</option>
                            <option value="UNBAN" className="text-emerald-500 font-bold">🔓 Unban (Lift Ban)</option>
                        </select>
                    </div>
                    {duration === 'CUSTOM' && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2">Ban Until</label>
                            <input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white" />
                        </div>
                    )}
                    {duration !== 'UNBAN' && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Reason</label>
                            <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Violation of rules..." className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white text-sm h-24" />
                        </div>
                    )}
                </div>

                <div className="flex gap-3 mt-8">
                    <button onClick={onClose} className="flex-1 py-3 rounded-xl text-slate-400 font-bold hover:bg-slate-800 transition-all">Cancel</button>
                    <button onClick={handleSubmit} disabled={isLoading} className={`flex-[2] py-3 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 ${duration === 'UNBAN' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'}`}>
                        {isLoading ? 'Processing...' : (duration === 'UNBAN' ? 'Confirm Unban' : 'Confirm Ban')}
                    </button>
                </div>
            </div>
        </div>
    )
}