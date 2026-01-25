'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { registerSellerAction } from "@/app/actions/seller"
import ImageUploader from '@/components/shared/ImageUploader'

function RegisterSellerForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const isResubmit = searchParams.get('resubmit') === 'true'

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string>()

    // Form state
    const [realName, setRealName] = useState('')
    const [idCardNumber, setIdCardNumber] = useState('')
    const [address, setAddress] = useState('')
    const [idCardImage, setIdCardImage] = useState('')
    const [bankName, setBankName] = useState('KBANK')
    const [bankAccount, setBankAccount] = useState('')
    const [bookBankImage, setBookBankImage] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(undefined)
        setIsSubmitting(true)

        try {
            // Create FormData to pass to server action
            const formData = new FormData()
            formData.append('realName', realName)
            formData.append('idCardNumber', idCardNumber)
            formData.append('address', address)
            formData.append('idCardImage', idCardImage)
            formData.append('bankName', bankName)
            formData.append('bankAccount', bankAccount)
            formData.append('bookBankImage', bookBankImage)

            const result = await registerSellerAction(null, formData)

            if (result?.error) {
                setError(result.error)
                setIsSubmitting(false)
            }
            // If no error, the action will redirect automatically
        } catch (err: any) {
            setError(err.message || 'Failed to submit application')
            setIsSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">

                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black text-white uppercase tracking-widest">
                        {isResubmit ? 'Resubmit Application' : 'Become a Seller'}
                    </h1>
                    <p className="text-slate-400 mt-2 text-sm">
                        {isResubmit ? 'Update your information and try again.' : 'Join our marketplace and start earning.'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Identity Info */}
                    <div className="space-y-4">
                        <h3 className="text-emerald-500 font-bold text-xs uppercase tracking-wider border-b border-slate-800 pb-2">1. Identity Verification</h3>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1">Real Name (Legal Name)</label>
                            <input
                                value={realName}
                                onChange={e => setRealName(e.target.value)}
                                required
                                placeholder="John Doe"
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none transition-all text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1">ID Card Number</label>
                            <input
                                value={idCardNumber}
                                onChange={e => setIdCardNumber(e.target.value)}
                                required
                                placeholder="x-xxxx-xxxxx-xx-x"
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none transition-all text-sm"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ImageUploader
                                value={idCardImage}
                                onChange={setIdCardImage}
                                label="ID Card Image"
                                aspectRatio="aspect-video"
                                placeholder="Upload ID card photo"
                            />

                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">Address</label>
                                <textarea
                                    value={address}
                                    onChange={e => setAddress(e.target.value)}
                                    placeholder="123 Street..."
                                    rows={4}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none transition-all text-sm resize-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Bank Info */}
                    <div className="space-y-4">
                        <h3 className="text-amber-500 font-bold text-xs uppercase tracking-wider border-b border-slate-800 pb-2">2. Payout Information</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">Bank Name</label>
                                <select
                                    value={bankName}
                                    onChange={e => setBankName(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white text-sm focus:border-amber-500 outline-none"
                                >
                                    <option value="KBANK">KBANK (กสิกรไทย)</option>
                                    <option value="SCB">SCB (ไทยพาณิชย์)</option>
                                    <option value="BBL">BBL (กรุงเทพ)</option>
                                    <option value="KTB">KTB (กรุงไทย)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">Account Number</label>
                                <input
                                    value={bankAccount}
                                    onChange={e => setBankAccount(e.target.value)}
                                    required
                                    placeholder="xxx-x-xxxxx-x"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none transition-all text-sm"
                                />
                            </div>
                        </div>

                        <ImageUploader
                            value={bookBankImage}
                            onChange={setBookBankImage}
                            label="Book Bank Image"
                            aspectRatio="aspect-video"
                            placeholder="Upload bank book photo"
                        />
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-3 bg-red-900/30 border border-red-800 text-red-200 text-sm rounded text-center">
                            ❌ {error}
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-black font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-all disabled:opacity-50 mt-4"
                    >
                        {isSubmitting ? 'Submitting...' : '🚀 Submit Application'}
                    </button>

                </form>
            </div>
        </div>
    )
}

export default function RegisterSellerPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading...</div>}>
            <RegisterSellerForm />
        </Suspense>
    )
}
