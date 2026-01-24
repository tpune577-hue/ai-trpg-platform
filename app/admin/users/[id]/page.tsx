import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
// ✅ 1. Import Component ปุ่ม
import UserDetailActions from "./UserDetailActions"

export const dynamic = 'force-dynamic'

interface Props {
    params: Promise<{ id: string }>
}

export default async function UserDetailPage({ params }: Props) {
    const session = await auth()
    if (session?.user?.role !== 'ADMIN') redirect('/')

    const { id: userId } = await params

    // 1. Query ข้อมูล
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            sellerProfile: {
                include: {
                    products: true
                }
            },
            createdCampaigns: true,
            orders: {
                where: { status: 'COMPLETED' },
                include: {
                    items: {
                        include: {
                            product: true
                        }
                    }
                }
            }
        }
    })

    if (!user) return notFound()

    // 2. จัดเตรียมข้อมูลสำหรับแสดงผล (Assets ที่ซื้อมา)
    const purchasedAssets = user.orders.flatMap(order =>
        order.items.map(item => ({
            ...item.product,
            purchaseDate: order.createdAt,
            pricePaid: item.price
        }))
    )

    const isBanned = user.bannedUntil && new Date(user.bannedUntil) > new Date()

    return (
        <div className="min-h-screen bg-slate-950 text-white p-8">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* --- HEADER --- */}
                <div className="flex items-center gap-6 border-b border-slate-800 pb-6">
                    <Link href="/admin/users" className="p-3 bg-slate-900 rounded-xl text-slate-400 hover:text-white transition-colors">
                        &larr; Back
                    </Link>
                    <div className="w-20 h-20 rounded-full bg-slate-800 overflow-hidden border-2 border-slate-700 relative shrink-0">
                        {user.image ? (
                            <Image src={user.image} alt={user.name || ''} fill className="object-cover" />
                        ) : (
                            <div className="flex items-center justify-center h-full text-2xl font-bold">{user.name?.[0]}</div>
                        )}
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white flex items-center gap-3 flex-wrap">
                            {user.name}
                            {isBanned && <span className="bg-red-600 text-white text-xs px-2 py-1 rounded font-bold">BANNED</span>}
                        </h1>
                        <div className="flex gap-3 text-sm text-slate-400 mt-1">
                            <span>{user.email}</span>
                            <span>•</span>
                            <span className="font-mono text-slate-500">ID: {user.id}</span>
                        </div>
                        <div className="mt-3 flex gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold border ${user.role === 'ADMIN' ? 'border-purple-500 text-purple-400 bg-purple-900/20' : 'border-slate-700 text-slate-400'}`}>
                                Role: {user.role}
                            </span>
                            {user.sellerProfile && (
                                <span className={`px-2 py-0.5 rounded text-xs font-bold border ${user.sellerProfile.status === 'APPROVED' ? 'border-emerald-500 text-emerald-400 bg-emerald-900/20' : 'border-amber-500 text-amber-400'}`}>
                                    Seller: {user.sellerProfile.status}
                                </span>
                            )}
                        </div>

                        {/* ✅ 2. ใส่ปุ่ม Ban / Promote ตรงนี้ */}
                        <UserDetailActions user={user} />
                    </div>
                </div>

                {/* --- GRID LAYOUT --- */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* LEFT COLUMN */}
                    <div className="space-y-8">
                        <SectionCard title="👤 User Details">
                            <InfoRow label="Joined" value={new Date(user.createdAt).toLocaleDateString()} />
                            <InfoRow label="Email Verified" value={user.emailVerified ? '✅ Yes' : '❌ No'} />
                            {user.bannedUntil && (
                                <div className="mt-4 p-3 bg-red-900/20 border border-red-900/50 rounded text-red-300 text-xs">
                                    <strong>Banned Until:</strong> {new Date(user.bannedUntil).toLocaleDateString()} <br />
                                    <strong>Reason:</strong> {user.banReason || '-'}
                                </div>
                            )}
                        </SectionCard>

                        {user.sellerProfile && (
                            <SectionCard title="🏪 Seller Profile">
                                <InfoRow label="Real Name" value={user.sellerProfile.realName} />
                                <InfoRow label="ID Card" value={user.sellerProfile.idCardNumber} />
                                <InfoRow label="Bank" value={`${user.sellerProfile.bankName} (${user.sellerProfile.bankAccount})`} />
                                <InfoRow label="Address" value={user.sellerProfile.address} />
                                <div className="grid grid-cols-2 gap-2 mt-4">
                                    <DocumentPreview label="ID Card" src={user.sellerProfile.idCardImage} />
                                    <DocumentPreview label="Book Bank" src={user.sellerProfile.bookBankImage} />
                                </div>
                            </SectionCard>
                        )}
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Inventory */}
                        <SectionCard title={`🎒 Inventory / Purchased Assets (${purchasedAssets.length})`}>
                            {purchasedAssets.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {purchasedAssets.map((item, idx) => (
                                        <div key={idx} className="bg-slate-950 border border-slate-800 p-3 rounded-lg flex gap-3 hover:border-emerald-500/50 transition-colors">
                                            <div className="w-12 h-12 bg-slate-800 rounded overflow-hidden relative shrink-0">
                                                {/* ✅ ใช้ img ธรรมดาเพื่อความปลอดภัยเรื่อง config */}
                                                {item.images && item.images.length > 0 && (
                                                    <img src={item.images[0]} alt="" className="w-full h-full object-cover" />
                                                )}
                                            </div>
                                            <div className="overflow-hidden">
                                                <div className="font-bold text-white truncate">{item.name}</div>
                                                <div className="text-xs text-slate-500">Bought: {new Date(item.purchaseDate).toLocaleDateString()}</div>
                                                <div className="text-xs text-emerald-400 font-mono">{item.pricePaid.toLocaleString()} THB</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-slate-500 text-sm text-center py-4">No assets purchased yet.</div>
                            )}
                        </SectionCard>

                        {/* Created Assets */}
                        <SectionCard title="🛠️ Created Content (Owner Assets)">

                            {/* Campaigns */}
                            <div className="mb-6">
                                <h4 className="text-xs font-bold text-purple-400 uppercase mb-3 border-b border-slate-800 pb-1">
                                    Campaigns ({user.createdCampaigns.length})
                                </h4>
                                {user.createdCampaigns.length > 0 ? (
                                    <div className="space-y-2">
                                        {user.createdCampaigns.map(camp => (
                                            <div key={camp.id} className="flex justify-between items-center text-sm bg-slate-950 p-2 rounded border border-slate-800">
                                                <span className="text-white truncate pr-2">{camp.title}</span>
                                                <span className={`text-[10px] px-2 py-0.5 rounded shrink-0 ${camp.isPublished ? 'bg-emerald-900/30 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                                                    {camp.isPublished ? 'Published' : 'Draft'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : <div className="text-slate-600 text-xs">No campaigns created.</div>}
                            </div>

                            {/* Products */}
                            <div>
                                <h4 className="text-xs font-bold text-amber-400 uppercase mb-3 border-b border-slate-800 pb-1">
                                    Marketplace Products ({user.sellerProfile?.products.length || 0})
                                </h4>
                                {user.sellerProfile?.products && user.sellerProfile.products.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {user.sellerProfile.products.map(prod => (
                                            <div key={prod.id} className="bg-slate-950 border border-slate-800 p-3 rounded-lg flex gap-3">
                                                <div className="w-12 h-12 bg-slate-800 rounded overflow-hidden relative shrink-0">
                                                    {/* ✅ ใช้ img ธรรมดา */}
                                                    {prod.images && prod.images.length > 0 && (
                                                        <img src={prod.images[0]} alt="" className="w-full h-full object-cover" />
                                                    )}
                                                </div>
                                                <div className="overflow-hidden">
                                                    <div className="font-bold text-white text-sm truncate">{prod.name}</div>
                                                    <div className="text-xs text-amber-400 font-mono">{prod.price.toLocaleString()} THB</div>
                                                    <div className="text-[10px] text-slate-500">Sold: {(prod as any).salesCount || 0}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : <div className="text-slate-600 text-xs">No products listed.</div>}
                            </div>

                        </SectionCard>

                    </div>
                </div>
            </div>
        </div>
    )
}

function SectionCard({ title, children }: { title: string, children: React.ReactNode }) {
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50">
                <h3 className="font-bold text-white text-lg">{title}</h3>
            </div>
            <div className="p-6">
                {children}
            </div>
        </div>
    )
}

function InfoRow({ label, value }: { label: string, value: string | null | undefined }) {
    return (
        <div className="flex justify-between py-2 border-b border-slate-800 last:border-0">
            <span className="text-slate-500 text-sm">{label}</span>
            <span className="text-white text-sm font-medium text-right break-words max-w-[60%]">{value || '-'}</span>
        </div>
    )
}

function DocumentPreview({ label, src }: { label: string, src: string | null | undefined }) {
    if (!src) return null
    return (
        <div className="space-y-1">
            <span className="text-[10px] text-slate-500 uppercase block">{label}</span>
            <a href={src} target="_blank" className="block relative aspect-video bg-black rounded border border-slate-700 overflow-hidden hover:opacity-80 transition-opacity">
                {/* ✅ ใช้ img ธรรมดาเพื่อความชัวร์เรื่อง Error Config */}
                <img src={src} alt={label} className="w-full h-full object-contain" />
            </a>
        </div>
    )
}