'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import ItemCard from '@/components/marketplace/ItemCard'
import UploadModal from '@/components/marketplace/UploadModal'
import ItemDetailModal from '@/components/marketplace/ItemDetailModal'

// ✅ 1. เพิ่ม 'CAMPAIGN' ใน Type เพื่อให้ TypeScript รู้จัก
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

export default function MarketplacePage() {
    const [items, setItems] = useState<MarketplaceItem[]>([])
    const [filteredItems, setFilteredItems] = useState<MarketplaceItem[]>([])
    const [purchasedAssets, setPurchasedAssets] = useState<string[]>([])
    const [isLoading, setIsLoading] = useState(true)

    // ✅ 2. เพิ่ม 'CAMPAIGN' ใน State Filter เริ่มต้น (เลือกเป็น 'ALL' ไว้ก่อน)
    const [typeFilter, setTypeFilter] = useState<'ALL' | 'ART' | 'THEME' | 'CAMPAIGN'>('ALL')
    const [searchQuery, setSearchQuery] = useState('')
    const [sortBy, setSortBy] = useState<'recent' | 'price-low' | 'price-high' | 'popular'>('recent')

    // Modals
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
    const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null)

    // Fetch items
    useEffect(() => {
        fetchItems()
    }, [])

    // Apply filters
    useEffect(() => {
        let filtered = [...items]

        // Type filter
        if (typeFilter !== 'ALL') {
            filtered = filtered.filter((item) => item.type === typeFilter)
        }

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            filtered = filtered.filter(
                (item) =>
                    item.title.toLowerCase().includes(query) ||
                    item.description?.toLowerCase().includes(query) ||
                    item.tags?.some((tag) => tag.toLowerCase().includes(query))
            )
        }

        // Sort
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'price-low':
                    return a.price - b.price
                case 'price-high':
                    return b.price - a.price
                case 'popular':
                    return b.downloads - a.downloads
                case 'recent':
                default:
                    return 0
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
        if (selectedItem) {
            setPurchasedAssets([...purchasedAssets, selectedItem.id])
        }
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

                        <div className="flex items-center gap-3">
                            {/* ปุ่ม Creator Studio */}
                            <Link
                                href="/campaign/my"
                                className="px-5 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-purple-500/50 text-purple-400 hover:text-purple-300 rounded-lg font-bold transition-all flex items-center gap-2 group"
                            >
                                <span className="group-hover:scale-110 transition-transform">🛠️</span>
                                Creator Studio
                            </Link>

                            {/* ปุ่ม Upload Asset (เดิม) */}
                            <button
                                onClick={() => setIsUploadModalOpen(true)}
                                className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg font-semibold transition-all flex items-center gap-2 shadow-lg shadow-amber-900/20"
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                </svg>
                                Upload Asset
                            </button>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search assets..."
                                className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                            />
                        </div>

                        {/* ✅ 3. เพิ่ม Option 'Campaigns' ใน Dropdown */}
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value as any)}
                            className="px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-lg text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all cursor-pointer"
                        >
                            <option value="ALL">All Types</option>
                            <option value="CAMPAIGN">Campaigns</option> {/* เพิ่มแล้ว */}
                            <option value="ART">Art</option>
                            <option value="THEME">Themes</option>
                        </select>

                        {/* Sort */}
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

            {/* Content */}
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
                        <p className="text-gray-500 text-sm mt-2">Try adjusting your filters or upload a new asset</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredItems.map((item) => (
                            <ItemCard
                                key={item.id}
                                {...item}
                                isPurchased={purchasedAssets.includes(item.id)}
                                onClick={() => setSelectedItem(item)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Modals */}
            <UploadModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onSuccess={fetchItems}
            />

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