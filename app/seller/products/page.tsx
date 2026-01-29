
import Link from 'next/link'
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from 'next/navigation'

async function getSellerProducts(userId: string) {
    const products = await prisma.marketplaceItem.findMany({
        where: {
            creatorId: userId
        },
        orderBy: {
            createdAt: 'desc'
        }
    })
    return products
}

export default async function SellerProductsPage() {
    const session = await auth()
    if (!session?.user) redirect('/')

    const products = await getSellerProducts(session.user.id)

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-white">My Products</h1>
                <Link
                    href="/seller/products/create"
                    className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-lg font-bold flex items-center gap-2"
                >
                    <span>➕</span>
                    Create New Session
                </Link>
            </div>

            {products.length === 0 ? (
                <div className="text-center py-12 bg-slate-900/50 rounded-xl border border-slate-800">
                    <p className="text-slate-400 mb-4">You haven't listed any sessions yet.</p>
                    <Link
                        href="/seller/products/create"
                        className="text-amber-500 hover:text-amber-400 font-medium hover:underline"
                    >
                        Create your first session ticket
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map(product => (
                        <div key={product.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-colors">
                            {/* Image Placeholder if string is empty */}
                            <div className="h-40 bg-slate-800 relative">
                                {product.imageUrl ? (
                                    <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-600">
                                        No Image
                                    </div>
                                )}
                                <div className="absolute top-2 right-2 px-2 py-1 bg-black/70 rounded text-xs font-bold text-white uppercase">
                                    {product.type.replace('_', ' ')}
                                </div>
                            </div>

                            <div className="p-4">
                                <h3 className="font-bold text-white truncate">{product.title}</h3>
                                <div className="text-amber-400 font-bold mt-1">฿{product.price.toLocaleString()}</div>
                                <div className="flex justify-between items-center mt-4 text-sm text-slate-400">
                                    <span>Downloads/Bookings</span>
                                    <span className="text-white">{product.downloads || 0}</span>
                                </div>
                            </div>

                            <div className="px-4 pb-4 flex gap-2">
                                {/* Stub buttons for now */}
                                <button className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm text-white transition-colors">
                                    Edit
                                </button>
                                <button className="px-3 py-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 rounded transition-colors text-sm">
                                    🗑️
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
