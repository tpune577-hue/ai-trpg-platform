import { prisma } from "@/lib/prisma"
import Link from "next/link"
import SearchInput from "./search" // นำเข้าจากไฟล์ด้านบน
import { verifySeller } from "@/app/actions/admin" // ใช้ Server Action ตัวเดิม

export const dynamic = 'force-dynamic'

// เหตุผลในการปฏิเสธ
const REJECT_REASONS = [
    "เอกสารบัตรประชาชนไม่ถูกต้อง",
    "เอกสารบัญชีไม่ถูกต้อง",
    "เอกสารที่แนบทั้งสองชนิด ข้อมูลไม่ตรงกัน",
    "บัตรประชาชนผู้สมัครหมดอายุ"
]

// Type สำหรับการรับ Params
interface PageProps {
    searchParams: {
        status?: string
        query?: string
        sort?: string
        order?: 'asc' | 'desc'
        verifyId?: string // ID ของ Seller ที่กำลังถูกเปิดดูรายละเอียด
    }
}

export default async function SellerListPage({ searchParams }: PageProps) {
    // 1. รับค่า Params
    const status = (searchParams.status || 'PENDING').toUpperCase()
    const query = searchParams.query || ''
    const sort = searchParams.sort || 'createdAt'
    const order = searchParams.order || 'desc'
    const verifyId = searchParams.verifyId

    // 2. สร้างเงื่อนไขการค้นหา (Filter)
    const whereCondition: any = {
        status: status,
        OR: query ? [
            { id: { contains: query } },           // Seller ID
            { userId: { contains: query } },       // User ID
            { realName: { contains: query } },     // Name
            { user: { email: { contains: query } } } // Email
        ] : undefined
    }

    // 3. สร้างเงื่อนไขการเรียงลำดับ (Sort)
    let orderBy: any = {}
    if (sort === 'name') {
        orderBy = { realName: order }
    } else if (sort === 'userId') {
        orderBy = { userId: order }
    } else {
        orderBy = { [sort]: order } // id, createdAt, updatedAt
    }

    // 4. ดึงข้อมูล
    const sellers = await prisma.sellerProfile.findMany({
        where: whereCondition,
        include: { user: true },
        orderBy: orderBy
    })

    // 5. ดึงข้อมูลตัว Verify (ถ้ามีการกดเลือก)
    const selectedSeller = verifyId
        ? await prisma.sellerProfile.findUnique({ where: { id: verifyId }, include: { user: true } })
        : null

    // 6. Stats Count
    const stats = await prisma.sellerProfile.groupBy({
        by: ['status'],
        _count: { status: true }
    })
    const getCount = (s: string) => stats.find(i => i.status === s)?._count.status || 0

    return (
        <div className="space-y-6 relative">

            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-3xl font-bold text-white">Seller Management</h2>
                <SearchInput />
            </div>

            {/* --- TABS --- */}
            <div className="flex border-b border-slate-800 overflow-x-auto">
                <TabButton label="New" status="PENDING" count={getCount('PENDING')} active={status === 'PENDING'} />
                <TabButton label="Rejected" status="REJECTED" count={getCount('REJECTED')} active={status === 'REJECTED'} />
                <TabButton label="Approved" status="APPROVED" count={getCount('APPROVED')} active={status === 'APPROVED'} />
                <TabButton label="Terminated" status="TERMINATED" count={getCount('TERMINATED')} active={status === 'TERMINATED'} />
            </div>

            {/* --- TABLE --- */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="bg-slate-950 text-slate-500 uppercase font-bold text-xs">
                            <tr>
                                <SortableHeader label="Seller ID" column="id" currentSort={sort} currentOrder={order} status={status} />
                                <SortableHeader label="User ID" column="userId" currentSort={sort} currentOrder={order} status={status} />
                                <SortableHeader label="Name / Email" column="name" currentSort={sort} currentOrder={order} status={status} />
                                <th className="px-6 py-4">Status</th>
                                <SortableHeader label="Submit Date" column="createdAt" currentSort={sort} currentOrder={order} status={status} />
                                <SortableHeader label="Last Update" column="updatedAt" currentSort={sort} currentOrder={order} status={status} />
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {sellers.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                                        No records found.
                                    </td>
                                </tr>
                            ) : (
                                sellers.map((seller) => (
                                    <tr key={seller.id} className="hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-xs">{seller.id.slice(-8)}...</td>
                                        <td className="px-6 py-4 font-mono text-xs">{seller.userId.slice(-8)}...</td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-white">{seller.realName || '-'}</div>
                                            <div className="text-xs">{seller.user.email}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusColor(seller.status)}`}>
                                                {seller.status === 'PENDING' ? 'NEW' : seller.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs">{new Date(seller.createdAt).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-xs">{new Date(seller.updatedAt).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-right">
                                            {/* ปุ่มนี้จะเปิด Modal โดยการใส่ verifyId ไปใน URL */}
                                            <Link
                                                href={`/admin/sellers?status=${status}&verifyId=${seller.id}`}
                                                className="bg-slate-800 hover:bg-amber-600 hover:text-black text-white px-3 py-1.5 rounded transition-colors font-bold text-xs border border-slate-700"
                                                scroll={false} // ไม่ต้องเลื่อนหน้าจอ
                                            >
                                                Review
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- MODAL FOR VERIFICATION (แสดงเมื่อมี verifyId) --- */}
            {selectedSeller && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <Link href={`/admin/sellers?status=${status}`} className="absolute inset-0 z-0" /> {/* กดพื้นหลังเพื่อปิด */}

                    <div className="bg-slate-900 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl border border-slate-700 shadow-2xl relative z-10 flex flex-col md:flex-row">

                        {/* 1. รายละเอียดข้อมูล (ซ้าย) */}
                        <div className="flex-1 p-6 space-y-4">
                            <h3 className="text-xl font-bold text-white border-b border-slate-800 pb-2">Verification Details</h3>

                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-slate-800 overflow-hidden">
                                    {selectedSeller.user.image ? <img src={selectedSeller.user.image} className="w-full h-full object-cover" /> : null}
                                </div>
                                <div>
                                    <div className="font-bold text-white text-lg">{selectedSeller.realName}</div>
                                    <div className="text-slate-400 text-sm">Email: {selectedSeller.user.email}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 bg-slate-950 p-4 rounded-lg">
                                <InfoBox label="Seller ID" value={selectedSeller.id} />
                                <InfoBox label="User ID" value={selectedSeller.userId} />
                                <InfoBox label="Card ID" value={selectedSeller.idCardNumber} />
                                <InfoBox label="Bank Account" value={`${selectedSeller.bankName} - ${selectedSeller.bankAccount}`} />
                                <InfoBox label="Address" value={selectedSeller.address} fullWidth />
                            </div>

                            <div className="space-y-2">
                                <h4 className="text-xs text-slate-500 uppercase font-bold">Attached Documents</h4>
                                <div className="flex gap-4">
                                    <div className="w-32 h-24 bg-slate-800 border border-slate-600 flex items-center justify-center text-xs text-slate-500 rounded">ID Card Img</div>
                                    <div className="w-32 h-24 bg-slate-800 border border-slate-600 flex items-center justify-center text-xs text-slate-500 rounded">Bank Book Img</div>
                                </div>
                            </div>
                        </div>

                        {/* 2. ส่วนจัดการ Action (ขวา) */}
                        <div className="w-full md:w-80 bg-slate-950 p-6 border-l border-slate-800 flex flex-col gap-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-bold text-slate-400">ACTIONS</span>
                                <Link href={`/admin/sellers?status=${status}`} className="text-slate-500 hover:text-white">✕ Close</Link>
                            </div>

                            {/* Logic ปุ่มเหมือนเดิม */}
                            {status === 'PENDING' && (
                                <>
                                    <ActionButton label="✅ Approve" status="APPROVED" id={selectedSeller.id} color="bg-emerald-600 hover:bg-emerald-500" />
                                    <div className="border-t border-slate-800 my-2 pt-2">
                                        <form action={async (formData) => {
                                            'use server'
                                            const reason = formData.get('reason') as string
                                            await verifySeller(selectedSeller.id, 'REJECTED', reason)
                                        }} className="space-y-2">
                                            <label className="text-xs text-red-400 font-bold">Reject Application</label>
                                            <select name="reason" required className="w-full bg-slate-900 border border-red-900/50 rounded px-2 py-2 text-xs text-white outline-none">
                                                <option value="" disabled selected>-- Select Reason --</option>
                                                {REJECT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                                            </select>
                                            <button className="w-full bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-900 py-2 rounded font-bold text-xs">❌ Confirm Reject</button>
                                        </form>
                                    </div>
                                </>
                            )}

                            {status === 'APPROVED' && (
                                <ActionButton label="🚫 Terminate" status="TERMINATED" id={selectedSeller.id} color="bg-slate-800 hover:bg-red-950 text-red-400 border border-red-900" />
                            )}

                            {(status === 'REJECTED' || status === 'TERMINATED') && (
                                <>
                                    {selectedSeller.rejectReason && (
                                        <div className="p-3 bg-red-900/20 border border-red-900/50 rounded text-red-300 text-xs mb-2">
                                            <strong>Previous Reason:</strong> {selectedSeller.rejectReason}
                                        </div>
                                    )}
                                    <ActionButton label="↺ Reconsider (Move to New)" status="PENDING" id={selectedSeller.id} color="bg-slate-800 hover:bg-slate-700 text-white" />
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    )
}

// --- Helper Components ---

function TabButton({ label, status, count, active }: any) {
    return (
        <Link
            href={`/admin/sellers?status=${status}`}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap
          ${active ? 'border-amber-500 text-amber-500 bg-slate-900/50' : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-900/30'}`}
        >
            {label}
            {count > 0 && <span className={`text-[10px] px-2 py-0.5 rounded-full ${active ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-400'}`}>{count}</span>}
        </Link>
    )
}

function SortableHeader({ label, column, currentSort, currentOrder, status }: any) {
    const isSorted = currentSort === column
    const newOrder = isSorted && currentOrder === 'asc' ? 'desc' : 'asc'

    return (
        <th className="px-6 py-4 cursor-pointer hover:text-white transition-colors">
            <Link href={`/admin/sellers?status=${status}&sort=${column}&order=${newOrder}`} className="flex items-center gap-1">
                {label}
                <span className="text-[10px] text-slate-600">
                    {isSorted ? (currentOrder === 'asc' ? '▲' : '▼') : '↕'}
                </span>
            </Link>
        </th>
    )
}

function InfoBox({ label, value, fullWidth }: any) {
    return (
        <div className={` ${fullWidth ? 'col-span-2' : ''}`}>
            <div className="text-[10px] text-slate-500 uppercase">{label}</div>
            <div className="text-sm font-medium text-white break-all">{value || '-'}</div>
        </div>
    )
}

function ActionButton({ label, status, id, color }: any) {
    return (
        <form action={async () => {
            'use server'
            await verifySeller(id, status)
        }}>
            <button className={`w-full py-2.5 rounded font-bold text-xs text-white shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${color}`}>
                {label}
            </button>
        </form>
    )
}

function getStatusColor(status: string) {
    switch (status) {
        case 'APPROVED': return 'bg-emerald-900/30 text-emerald-400 border-emerald-800'
        case 'REJECTED': return 'bg-red-900/30 text-red-400 border-red-800'
        case 'TERMINATED': return 'bg-slate-800 text-slate-500 border-slate-700 line-through'
        default: return 'bg-amber-900/30 text-amber-400 border-amber-800' // NEW
    }
}