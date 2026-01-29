'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import ItemCard from '@/components/marketplace/ItemCard'
import ItemDetailModal from '@/components/marketplace/ItemDetailModal'
import { getSellerStatus } from '@/app/actions/seller'

// Type ของสินค้า
interface MarketplaceItem {
    id: string
    title: string
    description?: string
    type: 'ART' | 'THEME' | 'CAMPAIGN'
    price: number
    downloads: number
    rating?: number
    creatorName: string
    imageUrl: string
    tags?: string[]
}

interface MarketplaceViewProps {
    user: any | null
}

export default function MarketplaceView({ user }: MarketplaceViewProps) {
    // ✅ เช็คว่า Login หรือยัง (ถ้า Login แล้วให้เห็นปุ่ม Studio)
    const isCreator = !!user

    const [items, setItems] = useState<MarketplaceItem[]>([])
    const [filteredItems, setFilteredItems] = useState<MarketplaceItem[]>([])
    const [purchasedAssets, setPurchasedAssets] = useState<string[]>([])
    const [isLoading, setIsLoading] = useState(true)

    // ✅ Seller status state
    const [sellerProfile, setSellerProfile] = useState<any>(null)
    const [isLoadingSeller, setIsLoadingSeller] = useState(true)

    const [typeFilter, setTypeFilter] = useState<'ALL' | 'ART' | 'THEME' | 'CAMPAIGN'>('ALL')
    const [searchQuery, setSearchQuery] = useState('')
    const [sortBy, setSortBy] = useState<'recent' | 'price-low' | 'price-high' | 'popular'>('recent')

    // Modals
    const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null)

    // ✅ Fetch seller status
    useEffect(() => {
        if (user?.id) {
            getSellerStatus(user.id).then(profile => {
                setSellerProfile(profile)
                setIsLoadingSeller(false)
            })
        } else {
            setIsLoadingSeller(false)
        }
    }, [user])

    useEffect(() => { fetchItems() }, [])
    useEffect(() => {
        let filtered = [...items]
        if (typeFilter !== 'ALL') filtered = filtered.filter((item) => item.type === typeFilter)
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            filtered = filtered.filter((item) =>
                item.title.toLowerCase().includes(query) ||
                item.description?.toLowerCase().includes(query) ||
                item.tags?.some((tag) => tag.toLowerCase().includes(query))
            )
        }
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'price-low': return a.price - b.price
                case 'price-high': return b.price - a.price
                case 'popular': return b.downloads - a.downloads
                case 'recent': default: return 0
            }
        })
        setFilteredItems(filtered)
    }, [items, typeFilter, searchQuery, sortBy])

    const fetchItems = async () => {
        try {
            const response = await fetch('/api/marketplace/items')
            const data = await response.json()
            setItems(data.items || [])
            setPurchasedAssets(data.purchasedAssets || [])
        } catch (error) {
            console.error('Failed to fetch items:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handlePurchaseSuccess = () => {
        if (selectedItem) setPurchasedAssets([...purchasedAssets, selectedItem.id])
        fetchItems()
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-amber-500/30">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                        <div>
                            <h1 className="text-4xl font-bold text-amber-400 mb-2">Marketplace</h1>
                            <p className="text-gray-400">Discover and purchase TRPG assets from creators</p>
                        </div>

                        {/* ✅ Conditional Seller Registration Buttons */}
                        {isCreator && !isLoadingSeller && (
                            <div className="flex items-center gap-3">
                                <Link
                                    href="/campaign/my"
                                    className="px-5 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-purple-500/50 text-purple-400 hover:text-purple-300 rounded-lg font-bold transition-all flex items-center gap-2 group"
                                >
                                    <span className="group-hover:scale-110 transition-transform">🛠️</span>
                                    Creator Studio
                                </Link>

                                {/* No Seller Profile - Show Register Button */}
                                {!sellerProfile && (
                                    <Link
                                        href="/register-seller"
                                        className="px-5 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-lg font-bold transition-all flex items-center gap-2 shadow-lg hover:shadow-emerald-500/50"
                                    >
                                        <span>✨</span>
                                        Register as Seller
                                    </Link>
                                )}

                                {/* Pending Status - Show Disabled Button */}
                                {sellerProfile?.status === 'PENDING' && (
                                    <button
                                        disabled
                                        className="px-5 py-3 bg-slate-700 text-slate-400 rounded-lg font-bold cursor-not-allowed flex items-center gap-2 opacity-60"
                                    >
                                        <span>⏳</span>
                                        Application Pending
                                    </button>
                                )}

                                {/* Approved Status - Show Seller Dashboard Button */}
                                {sellerProfile?.status === 'APPROVED' && (
                                    <Link
                                        href="/seller/products"
                                        className="px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-lg font-bold transition-all flex items-center gap-2 shadow-lg hover:shadow-blue-500/50"
                                    >
                                        <span>🏪</span>
                                        Seller Studio
                                    </Link>
                                )}

                                {/* Approved Status - Show Seller Dashboard Button */}
                                {sellerProfile?.status === 'APPROVED' && (
                                    <Link
                                        href="/seller/products"
                                        className="px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-lg font-bold transition-all flex items-center gap-2 shadow-lg hover:shadow-blue-500/50"
                                    >
                                        <span>🏪</span>
                                        Seller Studio
                                    </Link>
                                )}

                                {/* Rejected Status - Show Resubmit Button */}
                                {sellerProfile?.status === 'REJECTED' && (
                                    <Link
                                        href="/register-seller?resubmit=true"
                                        className="px-5 py-3 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white rounded-lg font-bold transition-all flex items-center gap-2 shadow-lg hover:shadow-amber-500/50"
                                    >
                                        <span>🔄</span>
                                        Resubmit Application
                                    </Link>
                                )}

                                {/* Approved Status - No extra button needed */}
                            </div>
                        )}
                    </div>

                    {/* Filters & Sort (เหมือนเดิม) */}
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search assets..."
                                className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                            />
                        </div>
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value as any)}
                            className="px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-lg text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all cursor-pointer"
                        >
                            <option value="ALL">All Types</option>
                            <option value="CAMPAIGN">Campaigns</option>
                            <option value="ART">Art</option>
                            <option value="THEME">Themes</option>
                        </select>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-lg text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all cursor-pointer"
                        >
                            <option value="recent">Most Recent</option>
                            <option value="popular">Most Popular</option>
                            <option value="price-low">Price: Low to High</option>
                            <option value="price-high">Price: High to Low</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Content (เหมือนเดิม) */}
            <div className="max-w-7xl mx-auto px-4 py-8">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="text-center py-20">
                        <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <p className="text-gray-400 text-lg">No assets found</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredItems.map((item) => (
                            <ItemCard
                                key={item.id}
                                item={item} // ✅ Pass entire item object
                                isPurchased={purchasedAssets.includes(item.id)}
                                onClick={() => setSelectedItem(item)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Modals */}
            {/* <UploadModal ... />  ❌ เอาออก */}

            <ItemDetailModal
                isOpen={!!selectedItem}
                onClose={() => setSelectedItem(null)}
                item={selectedItem}
                isPurchased={selectedItem ? purchasedAssets.includes(selectedItem.id) : false}
                onPurchaseSuccess={handlePurchaseSuccess}
            />
        </div>
    )
}