'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { submitSellerPaymentInfo } from '@/app/actions/seller'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ImageUploader from '@/components/shared/ImageUploader'

interface SellerSettingsFormProps {
    seller: {
        id: string
        realName: string | null
        idCardNumber: string | null
        address: string | null
        bankName: string | null
        bankAccount: string | null
        idCardImage: string | null
        bookBankImage: string | null
        status: string
    }
}

export default function SellerSettingsForm({ seller }: SellerSettingsFormProps) {
    const [state, formAction] = useFormState(submitSellerPaymentInfo, null)
    const router = useRouter()

    // Image upload state
    const [idCardImage, setIdCardImage] = useState(seller.idCardImage || '')
    const [bookBankImage, setBookBankImage] = useState(seller.bookBankImage || '')

    useEffect(() => {
        if (state?.success) {
            alert(state.message || 'Payment information submitted successfully!')
            router.refresh()
        }
    }, [state, router])

    const isReadOnly = seller.status === 'PENDING'

    return (
        <form action={formAction} className="space-y-6">
            {/* Error Message */}
            {state?.error && (
                <div className="p-4 bg-red-900/30 border border-red-500/50 rounded-lg text-red-200">
                    {state.error}
                </div>
            )}

            {/* Real Name */}
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    Full Name <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    name="realName"
                    defaultValue={seller.realName || ''}
                    required
                    readOnly={isReadOnly}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all disabled:opacity-50 read-only:opacity-50"
                    placeholder="Your full legal name"
                />
            </div>

            {/* ID Card Number */}
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    ID Card Number <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    name="idCardNumber"
                    defaultValue={seller.idCardNumber || ''}
                    required
                    readOnly={isReadOnly}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all disabled:opacity-50 read-only:opacity-50"
                    placeholder="e.g., 1234567890123"
                />
            </div>

            {/* Address */}
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    Address
                </label>
                <textarea
                    name="address"
                    defaultValue={seller.address || ''}
                    readOnly={isReadOnly}
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all disabled:opacity-50 read-only:opacity-50"
                    placeholder="Your full address"
                />
            </div>

            {/* Bank Name */}
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    Bank Name
                </label>
                <input
                    type="text"
                    name="bankName"
                    defaultValue={seller.bankName || ''}
                    readOnly={isReadOnly}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all disabled:opacity-50 read-only:opacity-50"
                    placeholder="e.g., Bangkok Bank"
                />
            </div>

            {/* Bank Account */}
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    Bank Account Number <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    name="bankAccount"
                    defaultValue={seller.bankAccount || ''}
                    required
                    readOnly={isReadOnly}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all disabled:opacity-50 read-only:opacity-50"
                    placeholder="e.g., 1234567890"
                />
            </div>

            {/* ID Card Image Upload */}
            <div>
                <ImageUploader
                    value={idCardImage}
                    onChange={setIdCardImage}
                    label="ID Card Image"
                    aspectRatio="aspect-[4/3]"
                    placeholder="Upload your ID card (front side)"
                    required={!isReadOnly}
                />
                <input type="hidden" name="idCardImage" value={idCardImage} />
                {isReadOnly && (
                    <p className="text-xs text-gray-500 mt-2">✓ Image uploaded and under review</p>
                )}
            </div>

            {/* Book Bank Image Upload */}
            <div>
                <ImageUploader
                    value={bookBankImage}
                    onChange={setBookBankImage}
                    label="Bank Book Image"
                    aspectRatio="aspect-[4/3]"
                    placeholder="Upload your bank book (first page)"
                    required={!isReadOnly}
                />
                <input type="hidden" name="bookBankImage" value={bookBankImage} />
                {isReadOnly && (
                    <p className="text-xs text-gray-500 mt-2">✓ Image uploaded and under review</p>
                )}
            </div>

            {/* Submit Button */}
            {!isReadOnly && (
                <SubmitButton status={seller.status} />
            )}

            {isReadOnly && (
                <div className="text-center text-gray-400 text-sm">
                    Your application is currently under review. You cannot edit your information at this time.
                </div>
            )}
        </form>
    )
}

function SubmitButton({ status }: { status: string }) {
    const { pending } = useFormStatus()

    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full px-6 py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-lg font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {pending ? 'Submitting...' : status === 'PRE_REGISTER' ? 'Submit for Review' : 'Update Information'}
        </button>
    )
}
