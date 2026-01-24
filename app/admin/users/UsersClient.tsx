'use client'

import { useState } from 'react'
import { updateUserRole, deleteUser, banUserAction } from '@/app/actions/user'
import Link from 'next/link' // ✅ Import Link เพื่อใช้กดไปหน้า Detail

export default function UsersClient({ users }: { users: any[] }) {
    const [searchTerm, setSearchTerm] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [selectedUser, setSelectedUser] = useState<any>(null)

    const filteredUsers = users.filter(user =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleRoleToggle = async (userId: string, currentRole: string) => {
        const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN'
        const actionText = newRole === 'ADMIN' ? "Promote to Admin" : "Demote to User"

        if (!confirm(`Are you sure you want to ${actionText}?`)) return

        setIsLoading(true)
        const res = await updateUserRole(userId, newRole)
        setIsLoading(false)

        if (res.error) {
            alert(res.error)
        }
    }

    const handleDelete = async (userId: string) => {
        if (!confirm("Are you sure? This cannot be undone.")) return
        setIsLoading(true)
        const res = await deleteUser(userId)
        setIsLoading(false)
        if (res.error) alert(res.error)
    }

    return (
        <div className="space-y-6">
            {/* Search Bar */}
            <div className="flex gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
                <div className="flex-1 relative">
                    <input
                        type="text"
                        placeholder="Search users..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 pl-10 text-white outline-none focus:border-indigo-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <span className="absolute left-3 top-2.5 text-slate-500">🔍</span>
                </div>
            </div>

            {/* Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm text-slate-400">
                    <thead className="bg-slate-950 text-slate-500 uppercase font-bold text-xs">
                        <tr>
                            <th className="px-6 py-4">User</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Role</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {filteredUsers.map(user => {
                            const isBanned = user.bannedUntil && new Date(user.bannedUntil) > new Date()
                            return (
                                <tr key={user.id} className={`hover:bg-slate-800/30 transition-colors ${isBanned ? 'opacity-50 grayscale' : ''}`}>

                                    {/* User Info (Clickable Link to Detail Page) */}
                                    <td className="px-6 py-4">
                                        <Link href={`/admin/users/${user.id}`} className="flex items-center gap-3 group cursor-pointer">
                                            <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden shrink-0 group-hover:ring-2 group-hover:ring-indigo-500 transition-all">
                                                {user.image ? (
                                                    <img src={user.image} className="w-full h-full object-cover" alt={user.name} />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-xs">?</div>
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-bold text-white flex items-center gap-2 group-hover:text-indigo-400 transition-colors">
                                                    {user.name}
                                                    {isBanned && <span className="text-[10px] bg-red-600 text-white px-1 rounded">BANNED</span>}
                                                </div>
                                                <div className="text-xs text-slate-500">{user.email}</div>
                                            </div>
                                        </Link>
                                    </td>

                                    {/* Status */}
                                    <td className="px-6 py-4">
                                        {isBanned ? (
                                            <div className="text-xs text-red-400">Until: {new Date(user.bannedUntil).toLocaleDateString()}</div>
                                        ) : (
                                            <span className="text-emerald-500 text-xs font-bold">Active</span>
                                        )}
                                    </td>

                                    {/* Role */}
                                    <td className="px-6 py-4 text-xs font-mono">
                                        <span className={`px-2 py-1 rounded border ${user.role === 'ADMIN' ? 'border-purple-500 text-purple-400 bg-purple-900/20' : 'border-slate-700'}`}>
                                            {user.role}
                                        </span>
                                    </td>

                                    {/* Actions Buttons */}
                                    <td className="px-6 py-4 text-right space-x-2">
                                        {/* 1. ปุ่ม Detail (New) */}
                                        <Link
                                            href={`/admin/users/${user.id}`}
                                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded transition-all text-xs font-bold border border-slate-700 inline-block"
                                        >
                                            📄 Detail
                                        </Link>

                                        {/* 2. ปุ่มเปลี่ยน Role */}
                                        <button
                                            disabled={isLoading}
                                            onClick={() => handleRoleToggle(user.id, user.role)}
                                            className={`px-3 py-1.5 rounded text-xs font-bold border transition-all ${user.role === 'ADMIN'
                                                ? 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                                                : 'bg-indigo-900/30 text-indigo-400 border-indigo-800 hover:bg-indigo-900/50'
                                                }`}
                                        >
                                            {user.role === 'ADMIN' ? '▼ Demote' : '▲ Promote'}
                                        </button>

                                        {/* 3. ปุ่ม Ban */}
                                        <button
                                            onClick={() => setSelectedUser(user)}
                                            className="bg-slate-800 hover:bg-red-900/50 hover:text-red-400 text-slate-400 px-3 py-1.5 rounded transition-all text-xs font-bold border border-slate-700"
                                        >
                                            {isBanned ? 'Manage Ban' : 'Ban 🚫'}
                                        </button>

                                        {/* 4. ปุ่ม Delete */}
                                        <button
                                            onClick={() => handleDelete(user.id)}
                                            className="text-slate-600 hover:text-red-500 px-2 transition-colors"
                                            title="Delete User"
                                        >
                                            🗑
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* --- BAN MODAL --- */}
            {selectedUser && (
                <BanModal
                    user={selectedUser}
                    onClose={() => setSelectedUser(null)}
                />
            )}
        </div>
    )
}

function BanModal({ user, onClose }: { user: any, onClose: () => void }) {
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
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-1">
                    {isBanned ? 'Edit Ban / Unban' : 'Ban User'}
                </h2>
                <p className="text-slate-400 text-sm mb-6">User: <span className="text-white font-bold">{user.name}</span></p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Duration</label>
                        <select
                            value={duration}
                            onChange={(e) => setDuration(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none"
                        >
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
                            <input
                                type="date"
                                value={customDate}
                                onChange={(e) => setCustomDate(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white"
                            />
                        </div>
                    )}

                    {duration !== 'UNBAN' && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Reason</label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Violation of rules..."
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white text-sm h-24"
                            />
                        </div>
                    )}
                </div>

                <div className="flex gap-3 mt-8">
                    <button onClick={onClose} className="flex-1 py-3 rounded-xl text-slate-400 font-bold hover:bg-slate-800 transition-all">Cancel</button>
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className={`flex-[2] py-3 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 ${duration === 'UNBAN' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'}`}
                    >
                        {isLoading ? 'Processing...' : (duration === 'UNBAN' ? 'Confirm Unban' : 'Confirm Ban')}
                    </button>
                </div>
            </div>
        </div>
    )
}