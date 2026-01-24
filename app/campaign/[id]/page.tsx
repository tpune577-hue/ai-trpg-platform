// ตัวอย่าง Component ปุ่มกด (Client Component)
'use client'

import { acquireCampaignAction } from '@/app/actions/store'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function BuyButton({ campaignId, price, isOwned }: { campaignId: string, price: number, isOwned: boolean }) {
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    if (isOwned) {
        return <button disabled className="bg-slate-700 text-slate-400 px-6 py-3 rounded-xl font-bold w-full">✅ Owned</button>
    }

    const handleBuy = async () => {
        setIsLoading(true)
        const res = await acquireCampaignAction(campaignId)
        setIsLoading(false)

        if (res.error) {
            alert(res.error)
        }

        // กรณีฟรี และสำเร็จ
        else if (res.success) {
            alert("🎉 " + res.message)
            router.refresh()
        }

        // กรณีต้องจ่ายเงิน
        else if (res.requiresPayment) {
            // Redirect ไปหน้า Checkout หรือเปิด Modal จ่ายเงิน
            router.push(`/checkout/${campaignId}`)
        }
    }

    return (
        <button
            onClick={handleBuy}
            disabled={isLoading}
            className="bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-3 rounded-xl font-bold w-full transition-all shadow-lg hover:shadow-emerald-500/20 active:scale-95"
        >
            {isLoading ? 'Processing...' : (price === 0 ? '🎁 Get for FREE' : `Buy for ฿${price}`)}
        </button>
    )
}