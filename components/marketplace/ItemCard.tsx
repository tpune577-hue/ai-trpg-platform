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
            className="relative bg-slate-900 border border-slate-700 rounded-xl overflow-hidden hover:shadow-xl hover:shadow-amber-900/20 transition-all flex flex-col group h-full cursor-pointer">

            {/* Image Section */}
            <div className="relative aspect-video bg-black overflow-hidden">
                <Image
                    src={item.imageUrl || (isSession ? 'https://placehold.co/600x400/0f172a/22c55e?text=Session' : 'https://placehold.co/600x400/0f172a/eab308?text=Asset')}
                    alt={item.title || 'Product Image'}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />

                {/* Badge ประเภทสินค้า (มุมขวาบน) */}
                <div className="absolute top-2 right-2 z-10">
                    {isSession ? (
                        <span className="bg-green-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md uppercase tracking-wider backdrop-blur-sm bg-opacity-90">
                            🎟️ Live Session
                        </span>
                    ) : (
                        <span className="bg-amber-600 text-black text-[10px] font-bold px-2 py-1 rounded shadow-md uppercase tracking-wider backdrop-blur-sm bg-opacity-90">
                            📄 Asset
                        </span>
                    )}
                </div>

                {/* Badge ความเป็นเจ้าของ (มุมซ้ายบน) */}
                {item.isOwner && (
                    <div className="absolute top-2 left-2 z-10">
                        <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md uppercase tracking-wider">
                            ✓ Owned
                        </span>
                    </div>
                )}
            </div>

            {/* Content Section */}
            <div className="p-4 flex flex-col flex-1">
                <h3 className="font-bold text-white text-lg truncate mb-1" title={item.title}>
                    {item.title}
                </h3>
                <p className="text-slate-400 text-xs line-clamp-2 mb-4 flex-1 min-h-[2.5em]">
                    {item.description || 'No description available'}
                </p>

                {/* Session Specific Info (แสดงเฉพาะสินค้าประเภท Ticket) */}
                {isSession && (
                    <div className="bg-slate-800/50 rounded p-3 mb-4 border border-slate-700/50 space-y-3">
                        <div className="flex justify-between items-center text-xs font-medium">
                            <span className="text-slate-300 flex items-center gap-1.5">
                                📅 {dateString || 'TBA'}
                            </span>
                            <span className="text-slate-300 flex items-center gap-1.5">
                                ⏰ {timeString || 'TBA'}
                            </span>
                        </div>

                        {/* Seats Progress Bar */}
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wide">
                                <span className={isFull ? 'text-red-400' : 'text-emerald-400'}>
                                    {isFull ? 'Full House' : 'Seats Available'}
                                </span>
                                <span className="text-slate-400">
                                    {currentPlayers} / {maxPlayers}
                                </span>
                            </div>
                            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-500 ease-out ${isFull ? 'bg-red-500' : 'bg-emerald-500'}`}
                                    style={{ width: `${maxPlayers > 0 ? Math.min(100, (currentPlayers / maxPlayers) * 100) : 0}%` }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer: Price & Button */}
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-800">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Price</span>
                        <span className="text-lg font-black text-amber-500">
                            {item.price > 0 ? `฿${item.price.toLocaleString()}` : 'FREE'}
                        </span>
                    </div>

                    <button
                        onClick={handleBuy}
                        disabled={loading || isFull || item.isOwner}
                        className={`px-5 py-2 rounded-lg font-bold text-sm shadow-lg transition-all active:scale-95 ${item.isOwner
                            ? 'bg-slate-700 text-slate-400 cursor-default'
                            : isFull
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                                : isSession
                                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white hover:shadow-emerald-900/20'
                                    : 'bg-amber-500 hover:bg-amber-400 text-black hover:shadow-amber-900/20'
                            }`}
                    >
                        {loading
                            ? 'Processing...'
                            : item.isOwner
                                ? 'Purchased'
                                : isFull
                                    ? 'SOLD OUT'
                                    : isSession
                                        ? 'Book Seat'
                                        : item.price === 0
                                            ? 'Get Free'
                                            : 'Buy Now'
                        }
                    </button>
                </div>
            </div>
        </div>
    )
}