'use client'

import { useState, useRef } from 'react'
import { acceptSellerTerms } from '@/app/actions/site-config'

interface SellerTermsModalProps {
    isOpen: boolean
    onClose: () => void
    userId: string
    termsContent: string
    onSuccess: () => void
}

export default function SellerTermsModal({
    isOpen,
    onClose,
    userId,
    termsContent,
    onSuccess
}: SellerTermsModalProps) {
    const [acknowledged, setAcknowledged] = useState(false)
    const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string>()
    const scrollRef = useRef<HTMLDivElement>(null)

    if (!isOpen) return null

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const element = e.currentTarget
        const isAtBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 10 // 10px threshold
        if (isAtBottom && !hasScrolledToBottom) {
            setHasScrolledToBottom(true)
        }
    }

    const handleConfirm = async () => {
        setIsSubmitting(true)
        setError(undefined)

        try {
            const result = await acceptSellerTerms(userId)
            if (result.success) {
                onSuccess()
                onClose()
            } else {
                setError(result.error || 'Failed to accept terms')
            }
        } catch (err) {
            setError('An error occurred')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-3xl bg-slate-900 rounded-2xl border-2 border-amber-500/30 shadow-2xl max-h-[80vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-700">
                    <h2 className="text-2xl font-bold text-amber-400">Seller Terms & Conditions</h2>
                    <p className="text-gray-400 text-sm mt-1">Please read and accept to continue</p>
                </div>

                {/* Content - Scrollable */}
                <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto p-6"
                >
                    {termsContent ? (
                        <div className="prose prose-invert prose-amber max-w-none text-gray-300 whitespace-pre-wrap">
                            {termsContent}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-500">
                            <p>No terms and conditions have been configured yet.</p>
                            <p className="text-sm mt-2">Please contact an administrator.</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-700 space-y-4">
                    {/* Error Message */}
                    {error && (
                        <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-200 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Scroll Indicator */}
                    {termsContent && !hasScrolledToBottom && (
                        <div className="p-3 bg-blue-900/30 border border-blue-500/50 rounded-lg text-blue-200 text-sm">
                            📜 Please scroll down to read all terms and conditions
                        </div>
                    )}

                    {/* Acknowledgment Checkbox */}
                    <label className="flex items-start gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={acknowledged}
                            onChange={(e) => setAcknowledged(e.target.checked)}
                            disabled={!hasScrolledToBottom && !!termsContent}
                            className="mt-1 w-5 h-5 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-2 focus:ring-amber-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <span className={`text-sm ${(!hasScrolledToBottom && termsContent) ? 'text-gray-500' : 'text-gray-300'}`}>
                            I acknowledge that I have read and agree to the Seller Terms & Conditions
                        </span>
                    </label>

                    {/* Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold transition-all disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={!acknowledged || !hasScrolledToBottom || isSubmitting || !termsContent}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Processing...' : 'Confirm & Continue'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
