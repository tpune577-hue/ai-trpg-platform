'use client'

import { useState } from 'react'
import { verifySeller } from '@/app/actions/admin' // Import Action ใหม่

export default function AdminDashboardClient({ pendingSellers }: { pendingSellers: any[] }) {
    const [selectedSeller, setSelectedSeller] = useState<any>(null)

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mt-8">
            {/* Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <span>📝</span> Verification Requests
                    {pendingSellers.length > 0 && (
                        <span className="bg-amber-600 text-black text-xs px-2 py-0.5 rounded-full font-bold">
                            {pendingSellers.length}
                        </span>
                    )}
                </h3>
            </div>

            {/* Table */}
            <div className="p-0">
                {pendingSellers.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                        ✅ All caught up! No pending requests.
                    </div>
                ) : (
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="bg-slate-950 text-slate-500 uppercase font-bold text-xs">
                            <tr>
                                <th className="px-6 py-3">User</th>
                                <th className="px-6 py-3">Real Name</th>
                                <th className="px-6 py-3">Date</th>
                                <th className="px-6 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {pendingSellers.map((seller) => (
                                <tr key={seller.id} className="hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden">
                                            {seller.user.image ? <img src={seller.user.image} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-xs">?</div>}
                                        </div>
                                        {seller.user.name || seller.user.email}
                                    </td>
                                    <td className="px-6 py-4">{seller.realName || '-'}</td>
                                    <td className="px-6 py-4">{new Date(seller.createdAt).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => setSelectedSeller(seller)}
                                            className="bg-slate-800 hover:bg-emerald-600 hover:text-white text-emerald-400 border border-slate-700 hover:border-emerald-500 px-4 py-2 rounded transition-all font-bold text-xs active:scale-95 shadow-lg"
                                        >
                                            🔍 Review
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal Popup */}
            {selectedSeller && (
                <VerificationModal
                    seller={selectedSeller}
                    onClose={() => setSelectedSeller(null)}
                />
            )}
        </div>
    )
}

// --- SUB-COMPONENT: MODAL ---
function VerificationModal({ seller, onClose }: { seller: any, onClose: () => void }) {
    const [isRejecting, setIsRejecting] = useState(false)
    const [rejectReason, setRejectReason] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    // ✅ ใช้ verifySeller('APPROVED')
    const handleApprove = async () => {
        if (!confirm("Confirm Approve this seller?")) return
        setIsLoading(true)

        const res = await verifySeller(seller.id, 'APPROVED')

        setIsLoading(false)
        if (res.success) {
            onClose()
        } else {
            alert(res.error)
        }
    }

    // ✅ ใช้ verifySeller('REJECTED', reason)
    const handleReject = async () => {
        if (!rejectReason.trim()) return alert("Please enter a reason.")
        setIsLoading(true)

        const res = await verifySeller(seller.id, 'REJECTED', rejectReason)

        setIsLoading(false)
        if (res.success) {
            onClose()
        } else {
            alert(res.error)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex justify-between items-start bg-slate-950">
                    <div>
                        <h2 className="text-xl font-bold text-white">Review Application</h2>
                        <p className="text-slate-400 text-sm mt-1">Applicant: <span className="text-amber-500">{seller.realName}</span></p>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white text-2xl leading-none">&times;</button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                    {/* Identity Info */}
                    <div className="bg-slate-800/50 p-4 rounded-xl space-y-3 border border-slate-700/50">
                        <h3 className="text-emerald-400 font-bold text-xs uppercase tracking-wider">Identity Information</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div><span className="block text-slate-500 text-xs">ID Card Number</span><span className="text-white font-mono">{seller.idCardNumber}</span></div>
                            <div><span className="block text-slate-500 text-xs">Address</span><span className="text-white">{seller.address}</span></div>
                        </div>
                        <div>
                            <span className="block text-slate-500 text-xs mb-2">ID Card Image</span>
                            <div className="aspect-video bg-black rounded-lg border border-slate-700 flex items-center justify-center overflow-hidden">
                                {seller.idCardImage ? (
                                    <a href={seller.idCardImage} target="_blank"><img src={seller.idCardImage} className="w-full h-full object-contain" /></a>
                                ) : <span className="text-slate-600 text-xs">No Image</span>}
                            </div>
                        </div>
                    </div>

                    {/* Financial Info */}
                    <div className="bg-slate-800/50 p-4 rounded-xl space-y-3 border border-slate-700/50">
                        <h3 className="text-amber-400 font-bold text-xs uppercase tracking-wider">Financial Information</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div><span className="block text-slate-500 text-xs">Bank Name</span><span className="text-white">{seller.bankName}</span></div>
                            <div><span className="block text-slate-500 text-xs">Account Number</span><span className="text-white font-mono">{seller.bankAccount}</span></div>
                        </div>
                        <div>
                            <span className="block text-slate-500 text-xs mb-2">Book Bank Image</span>
                            <div className="aspect-video bg-black rounded-lg border border-slate-700 flex items-center justify-center overflow-hidden">
                                {seller.bookBankImage ? (
                                    <a href={seller.bookBankImage} target="_blank"><img src={seller.bookBankImage} className="w-full h-full object-contain" /></a>
                                ) : <span className="text-slate-600 text-xs">No Image</span>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-6 border-t border-slate-800 bg-slate-950">
                    {!isRejecting ? (
                        <div className="flex gap-4">
                            <button
                                onClick={() => setIsRejecting(true)}
                                disabled={isLoading}
                                className="flex-1 bg-slate-800 hover:bg-red-900/50 text-slate-300 hover:text-red-200 border border-slate-700 hover:border-red-900 font-bold py-3 rounded-xl transition-all"
                            >
                                ❌ Reject
                            </button>
                            <button
                                onClick={handleApprove}
                                disabled={isLoading}
                                className="flex-[2] bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-900/20 transition-all active:scale-95"
                            >
                                {isLoading ? 'Processing...' : '✅ Approve Seller'}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3 animate-in slide-in-from-bottom-2">
                            <label className="block text-xs font-bold text-red-400 uppercase">Reason for Rejection (Required)</label>
                            <textarea
                                value={rejectReason}
                                onChange={e => setRejectReason(e.target.value)}
                                className="w-full bg-slate-900 border border-red-900/50 rounded-lg p-3 text-white text-sm focus:border-red-500 outline-none"
                                placeholder="e.g. ID Card image is blurry..."
                                rows={2}
                                autoFocus
                            />
                            <div className="flex gap-3">
                                <button onClick={() => setIsRejecting(false)} className="px-4 py-2 text-slate-400 text-sm hover:text-white">Cancel</button>
                                <button
                                    onClick={handleReject}
                                    disabled={isLoading}
                                    className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded-lg shadow-lg"
                                >
                                    {isLoading ? 'Rejecting...' : 'Confirm Reject'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}