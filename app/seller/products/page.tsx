'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import CreateCampaignForm from '@/app/campaign/create/CreateCampaignForm'
import CreateSessionForm from '@/components/seller/CreateSessionForm'

interface Product {
    id: string
    title: string
    description: string | null
    price: number
    type: string
    imageUrl?: string
    _count: {
        bookings: number
    }
}

export default function SellerProductsPage() {
    const [activeTab, setActiveTab] = useState<'campaign' | 'session' | 'list'>('list')
    const [products, setProducts] = useState<Product[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isApprovedSeller, setIsApprovedSeller] = useState(false)

    useEffect(() => {
        async function loadData() {
            try {
                // Fetch products
                const res = await fetch('/api/marketplace/items?creatorOnly=true')
                if (res.ok) {
                    const data = await res.json()
                    setProducts(data.items || [])
                }

                // Check seller status
                const sellerRes = await fetch('/api/seller/status')
                if (sellerRes.ok) {
                    const sellerData = await sellerRes.json()
                    setIsApprovedSeller(sellerData.status === 'APPROVED')
                }
            } catch (error) {
                console.error('Error loading data:', error)
            } finally {
                setIsLoading(false)
            }
        }

        loadData()
    }, [])


    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <div className="text-white font-medium">Loading your products...</div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-950 p-4 md:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Tab Navigation - Mobile Optimized */}
                <div className="mb-6 border-b border-slate-800 -mx-4 px-4 md:mx-0 md:px-0">
                    <div className="flex gap-1 md:gap-2 overflow-x-auto scrollbar-hide">
                        <button
                            onClick={() => setActiveTab('list')}
                            className={`px-3 md:px-6 py-2 md:py-3 font-bold transition-all whitespace-nowrap text-sm md:text-base ${activeTab === 'list'
                                    ? 'text-amber-400 border-b-2 border-amber-400'
                                    : 'text-slate-400 hover:text-slate-300'
                                }`}
                        >
                            <span className="hidden sm:inline">📦 My Products</span>
                            <span className="sm:hidden">📦 Products</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('campaign')}
                            className={`px-3 md:px-6 py-2 md:py-3 font-bold transition-all whitespace-nowrap text-sm md:text-base ${activeTab === 'campaign'
                                    ? 'text-purple-400 border-b-2 border-purple-400'
                                    : 'text-slate-400 hover:text-slate-300'
                                }`}
                        >
                            <span className="hidden sm:inline">🛠️ Create Campaign</span>
                            <span className="sm:hidden">🛠️ Campaign</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('session')}
                            className={`px-3 md:px-6 py-2 md:py-3 font-bold transition-all whitespace-nowrap text-sm md:text-base ${activeTab === 'session'
                                    ? 'text-emerald-400 border-b-2 border-emerald-400'
                                    : 'text-slate-400 hover:text-slate-300'
                                }`}
                        >
                            <span className="hidden sm:inline">🎟️ Create Session</span>
                            <span className="sm:hidden">🎟️ Session</span>
                        </button>
                    </div>
                </div>

                {/* Tab Content */}
                {activeTab === 'list' && (
                    <div>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                            <h1 className="text-xl md:text-2xl font-bold text-white">My Products</h1>
                        </div>

                        {products.length === 0 ? (
                            <div className="text-center py-12 bg-slate-900/50 rounded-xl border border-slate-800">
                                <p className="text-slate-400 mb-6 px-4">You haven't created any products yet.</p>
                                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-4">
                                    <button
                                        onClick={() => setActiveTab('campaign')}
                                        className="w-full sm:w-auto px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors"
                                    >
                                        Create a Campaign
                                    </button>
                                    <span className="hidden sm:inline text-slate-600">or</span>
                                    <button
                                        onClick={() => setActiveTab('session')}
                                        className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
                                    >
                                        Create a Session
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                                {products.map(product => (
                                    <div key={product.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-colors">
                                        {/* Image */}
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
                                                <span className="text-white">{product._count.bookings}</span>
                                            </div>
                                        </div>

                                        <div className="px-4 pb-4 flex gap-2">
                                            <Link
                                                href={`/campaign/${product.id}`}
                                                className="flex-1 text-center px-3 py-2.5 md:py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
                                            >
                                                View
                                            </Link>
                                            <Link
                                                href={`/campaign/create?id=${product.id}`}
                                                className="flex-1 text-center px-3 py-2.5 md:py-2 bg-amber-600 hover:bg-amber-500 text-black rounded-lg text-sm font-bold transition-colors"
                                            >
                                                Edit
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'campaign' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <CreateCampaignForm isApprovedSeller={isApprovedSeller} />
                    </div>
                )}

                {activeTab === 'session' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <CreateSessionForm />
                    </div>
                )}
            </div>

            {/* Custom scrollbar hide */}
            <style jsx global>{`
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </div>
    )
}

