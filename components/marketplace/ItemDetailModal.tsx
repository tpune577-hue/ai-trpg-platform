'use client'

import { useState } from 'react'

interface ItemDetailModalProps {
    isOpen: boolean
    onClose: () => void
    item: {
        id: string
        title: string
        description?: string
        type: string // 'DIGITAL_ASSET' | 'LIVE_SESSION' | 'CAMPAIGN'
        price: number
        imageUrl: string
        creatorName: string
        downloads?: number // Made optional to match MarketplaceItem
        rating?: number
        tags?: string[]
    } | null
    isPurchased: boolean
    onPurchaseSuccess: () => void
}

export default function ItemDetailModal({
    isOpen,
    onClose,
    item,
    isPurchased,
    onPurchaseSuccess,
}: ItemDetailModalProps) {
    const [isPurchasing, setIsPurchasing] = useState(false)
    const [error, setError] = useState<string>()

    if (!isOpen || !item) return null

    const handlePurchase = async () => {
        setError(undefined)
        setIsPurchasing(true)

        try {
            // Create Stripe checkout session
            const response = await fetch('/api/payment/create-checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    itemType: item.type, // ✅ Use actual item type (DIGITAL_ASSET, LIVE_SESSION, CAMPAIGN)
                    itemId: item.id,
                    metadata: {
                        itemName: item.title,
                        itemDescription: item.description,
                    }
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create checkout session')
            }

            // ✅ Handle Free Item (No Redirect)
            if (data.sessionId === 'free-order') {
                setIsPurchasing(false)
                onPurchaseSuccess()
                onClose()
                alert("🎉 Item claimed successfully!")
                return
            }

            // ✅ Handle Paid Item (Redirect)
            // Backend returns 'url', not 'sessionUrl'
            if (data.url) {
                window.location.href = data.url
            } else {
                throw new Error("Invalid response from payment server")
            }

        } catch (err: any) {
            setError(err.message)
            setIsPurchasing(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
            <div
                className="relative w-full max-w-4xl bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border-2 border-amber-500/30 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 bg-slate-900/80 hover:bg-slate-800 rounded-lg transition-colors"
                >
                    <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>

                {/* Image */}
                <div className="relative aspect-video bg-slate-950 overflow-hidden">
                    <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
                </div>

                {/* Content */}
                <div className="p-8">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-6">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <h2 className="text-3xl font-bold text-white">{item.title}</h2>
                                <span className={`px-3 py-1 text-xs font-bold uppercase rounded-full ${item.type === 'ART' ? 'bg-purple-500 text-white' :
                                    item.type === 'CAMPAIGN' ? 'bg-amber-500 text-black' :
                                        'bg-blue-500 text-white'
                                    }`}>
                                    {item.type}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-400">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                </svg>
                                <span className="text-sm">by {item.creatorName}</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-4xl font-bold text-amber-400">${item.price.toFixed(2)}</div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-6 mb-6 pb-6 border-b border-slate-700">
                        {item.rating && (
                            <div className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                <span className="text-white font-semibold">{item.rating.toFixed(1)}</span>
                            </div>
                        )}
                        {item.downloads !== undefined && (
                            <div className="flex items-center gap-2 text-gray-400">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                                <span>{item.downloads} downloads</span>
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    {item.description && (
                        <div className="mb-6">
                            <h3 className="text-lg font-bold text-white mb-2">Description</h3>
                            <p className="text-gray-300 leading-relaxed">{item.description}</p>
                        </div>
                    )}

                    {/* Tags */}
                    {item.tags && item.tags.length > 0 && (
                        <div className="mb-6">
                            <h3 className="text-lg font-bold text-white mb-2">Tags</h3>
                            <div className="flex flex-wrap gap-2">
                                {item.tags.map((tag, index) => (
                                    <span key={index} className="px-3 py-1 bg-slate-700/50 text-gray-300 text-sm rounded-full">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-lg text-red-200">
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                        {isPurchased ? (
                            <div className="flex-1 px-6 py-4 bg-emerald-900/30 border-2 border-emerald-500/50 rounded-lg flex items-center justify-center gap-2 text-emerald-300 font-semibold">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Already Purchased
                            </div>
                        ) : (
                            <button
                                onClick={handlePurchase}
                                disabled={isPurchasing}
                                className="flex-1 px-6 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isPurchasing ? 'Processing...' : `Purchase for $${item.price.toFixed(2)}`}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
