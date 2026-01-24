import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import PayoutsClient from "./PayoutsClient"
import PayoutFilters from "./PayoutFilters" // ✅ นำเข้า Filter Component

export const dynamic = 'force-dynamic'

export default async function PayoutsPage({ searchParams }: { searchParams: { mode?: string, date?: string } }) {
    const session = await auth()
    if (session?.user?.role !== 'ADMIN') redirect('/')

    // --- 1. Filter Logic ---
    const mode = searchParams.mode || 'ALL'
    const dateStr = searchParams.date || new Date().toISOString().split('T')[0]

    let dateFilter: any = {}

    if (mode !== 'ALL' && dateStr) {
        const date = new Date(dateStr)
        let startDate, endDate

        if (mode === 'DAILY') {
            startDate = new Date(dateStr)
            endDate = new Date(dateStr)
            endDate.setDate(endDate.getDate() + 1) // +1 วัน
        } else if (mode === 'MONTHLY') {
            // dateStr = "2024-01"
            const [y, m] = dateStr.split('-').map(Number)
            startDate = new Date(y, m - 1, 1)
            endDate = new Date(y, m, 0) // วันสุดท้ายของเดือน
            endDate.setHours(23, 59, 59, 999)
        } else if (mode === 'YEARLY') {
            // dateStr = "2024"
            const y = Number(dateStr)
            startDate = new Date(y, 0, 1)
            endDate = new Date(y, 11, 31, 23, 59, 59)
        }

        if (startDate && endDate) {
            dateFilter = {
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            }
        }
    }

    // --- 2. Query Data ---
    const soldItems = await prisma.orderItem.findMany({
        where: {
            order: {
                status: 'COMPLETED',
                ...dateFilter // ✅ ใส่ Filter เวลาเข้าไปตรงนี้
            }
        },
        include: {
            order: true, // ดึง Order เพื่อเอาวันที่
            product: {
                include: { seller: true }
            }
        }
    })

    // --- 3. Calculation Logic (เหมือนเดิม) ---
    const sellerStats = new Map<string, {
        sellerId: string
        sellerName: string
        bankName: string
        bankAccount: string
        totalItems: number
        totalSales: number
    }>()

    soldItems.forEach((item) => {
        const seller = item.product.seller
        const price = item.price

        if (!sellerStats.has(seller.id)) {
            sellerStats.set(seller.id, {
                sellerId: seller.id,
                sellerName: seller.realName || 'Unknown',
                bankName: seller.bankName || '-',
                bankAccount: seller.bankAccount || '-',
                totalItems: 0,
                totalSales: 0
            })
        }

        const current = sellerStats.get(seller.id)!
        current.totalItems += 1
        current.totalSales += price
    })

    const PLATFORM_FEE_PERCENT = 0.10
    const payoutData = Array.from(sellerStats.values()).map(seller => {
        const fee = Math.floor(seller.totalSales * PLATFORM_FEE_PERCENT)
        return {
            ...seller,
            platformFee: fee,
            netPayout: seller.totalSales - fee
        }
    }).sort((a, b) => b.netPayout - a.netPayout)

    return (
        <div className="min-h-screen bg-slate-950 text-white p-8">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center gap-4 mb-4">
                    <Link href="/admin" className="p-2 bg-slate-900 rounded-lg text-slate-400 hover:text-white transition-colors">
                        &larr; Back
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black text-white uppercase tracking-widest">Payout Calculator</h1>
                        <p className="text-slate-400">Calculate net earnings based on transaction date.</p>
                    </div>
                </div>

                {/* ✅ Filter Section */}
                <PayoutFilters />

                {/* Data Table */}
                <PayoutsClient data={payoutData} />

            </div>
        </div>
    )
}