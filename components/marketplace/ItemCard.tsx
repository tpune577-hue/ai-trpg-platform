'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface MarketplaceItemProps {
    id: string
    title: string
    description?: string | null
    price: number
    imageUrl?: string | null
    type?: string // 'DIGITAL_ASSET' | 'LIVE_SESSION' | 'CAMPAIGN'

    // Session specific
    sessionDate?: string | Date | null
    duration?: number | null
    maxPlayers?: number | null
    currentPlayers?: number | null
    gameLink?: string | null

    // Creator info
    creatorName?: string
    creatorImage?: string | null

    isOwner?: boolean
}

interface ItemCardProps {
    item: MarketplaceItemProps
    isPurchased?: boolean // ✅ Allow external override for immediate UI updates
    onClick?: () => void // ✅ Allow clicking card to open details
}

export default function ItemCard({ item, isPurchased, onClick }: ItemCardProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    // เช็คว่าเป็นสินค้าประเภทไหน
    const isSession = item.type === 'LIVE_SESSION'

    // Combine isOwner from data and external prop (e.g. from immediate purchase)
    const owned = isPurchased || item.isOwner

    // ถ้าเป็น Session ให้เช็คว่าเต็มหรือยัง (ป้องกัน null ด้วย || 0)
    const currentPlayers = item.currentPlayers || 0
    const maxPlayers = item.maxPlayers || 0
    const isFull = isSession && (maxPlayers > 0 && currentPlayers >= maxPlayers)

    // จัดการวันที่และเวลา (ถ้ามี)
    // ตรวจสอบว่ามีค่าก่อน new Date เพื่อป้องกัน Invalid Date
    const sessionDateObj = item.sessionDate ? new Date(item.sessionDate) : null

    const dateString = sessionDateObj && !isNaN(sessionDateObj.getTime())
        ? sessionDateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
        : ''

    const timeString = sessionDateObj && !isNaN(sessionDateObj.getTime())
        ? sessionDateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        : ''

    const handleBuy = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/payment/create-checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    itemId: item.id,
                    // ✅ ส่ง type ที่ถูกต้องไปบอก Stripe หรือใช้ Default เป็น DIGITAL_ASSET กันเหนียว
                    itemType: item.type || 'DIGITAL_ASSET'
                }),
            })

            const data = await res.json()
            if (data.url) {
                window.location.href = data.url
            } else {
                alert("Failed to create checkout session")
            }
        } catch (error) {
            console.error(error)
            alert("Something went wrong")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div
            onClick={() => {
                console.log("Card clicked:", item.id)
                if (onClick) onClick()
            }}
            className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden hover:shadow-lg transition-all flex flex-col group cursor-pointer"
        >
            {/* Compact Image Section - Shopee style square ratio */}
            <div className="relative aspect-square bg-slate-100 dark:bg-black overflow-hidden">
                <Image
                    src={item.imageUrl || (isSession ? 'https://placehold.co/400x400/0f172a/22c55e?text=Session' : 'https://placehold.co/400x400/0f172a/eab308?text=Asset')}
                    alt={item.title || 'Product Image'}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                />

                {/* Compact Badge - Top Left */}
                {item.isOwner && (
                    <div className="absolute top-1 left-1 z-10">
                        <span className="bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                            ✓ Owned
                        </span>
                    </div>
                )}

                {/* Type Badge - Top Right */}
                {isSession && (
                    <div className="absolute top-1 right-1 z-10">
                        <span className="bg-green-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                            🎟️ Session
                        </span>
                    </div>
                )}
            </div>

            {/* Compact Content Section */}
            <div className="p-2 flex flex-col flex-1">
                {/* Title - 2 lines max */}
                <h3 className="text-sm text-slate-800 dark:text-white line-clamp-2 mb-1 min-h-[2.5rem]" title={item.title}>
                    {item.title}
                </h3>

                {/* Session Info - Compact */}
                {isSession && (
                    <div className="flex items-center gap-1 mb-1">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            {dateString ? `📅 ${dateString}` : '📅 TBA'}
                        </span>
                    </div>
                )}

                {/* Seats indicator for sessions - Minimal */}
                {isSession && maxPlayers > 0 && (
                    <div className="flex items-center gap-1 mb-2">
                        <div className="flex-1 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all ${isFull ? 'bg-red-500' : 'bg-emerald-500'}`}
                                style={{ width: `${Math.min(100, (currentPlayers / maxPlayers) * 100)}%` }}
                            />
                        </div>
                        <span className="text-[9px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {currentPlayers}/{maxPlayers}
                        </span>
                    </div>
                )}

                {/* Price - Shopee style */}
                <div className="flex items-center justify-between mt-auto">
                    <span className="text-base font-bold text-orange-600 dark:text-amber-500">
                        {item.price > 0 ? `฿${item.price.toLocaleString()}` : 'FREE'}
                    </span>

                    {/* Sold out or Full indicator */}
                    {isFull && (
                        <span className="text-[9px] text-red-500 font-medium">FULL</span>
                    )}
                </div>

                {/* Creator info - minimal */}
                {item.creatorName && (
                    <div className="flex items-center gap-1 mt-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {item.creatorName}
                        </span>
                    </div>
                )}
            </div>
        </div>
    )
}
