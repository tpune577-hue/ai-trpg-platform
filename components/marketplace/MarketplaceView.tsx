'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import ItemCard from '@/components/marketplace/ItemCard'
import ItemDetailModal from '@/components/marketplace/ItemDetailModal'
import SellerTermsModal from '@/components/seller/SellerTermsModal'
import { getSellerStatus } from '@/app/actions/seller'
import { getSellerTerms } from '@/app/actions/site-config'

// Type ของสินค้า
interface MarketplaceItem {
    id: string
    title: string
    description?: string
    type: 'ART' | 'THEME' | 'CAMPAIGN' | 'DIGITAL_ASSET' | 'LIVE_SESSION'
    price: number
    downloads?: number
    rating?: number
    creatorName: string
    imageUrl: string
    tags?: string[]
    sessionDate?: string | Date | null
    duration?: number | null
    maxPlayers?: number | null
    currentPlayers?: number | null
}

interface MarketplaceViewProps {
    user: any | null
}

export default function MarketplaceView({ user }: MarketplaceViewProps) {
    const isCreator = !!user

    const [items, setItems] = useState<MarketplaceItem[]>([])
    const [filteredItems, setFilteredItems] = useState<MarketplaceItem[]>([])
    const [purchasedAssets, setPurchasedAssets] = useState<string[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [hasMore, setHasMore] = useState(true)
    const [offset, setOffset] = useState(0)
    const ITEMS_PER_PAGE = 20

    const [sellerProfile, setSellerProfile] = useState<any>(null)
    const [isLoadingSeller, setIsLoadingSeller] = useState(true)

    const [typeFilter, setTypeFilter] = useState<'ALL' | 'ART' | 'THEME' | 'CAMPAIGN'>('ALL')
    const [searchQuery, setSearchQuery] = useState('')
    const [sortBy, setSortBy] = useState<'recent' | 'price-low' | 'price-high' | 'popular'>('recent')

    const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null)

    // T&C Modal state
    const [showTermsModal, setShowTermsModal] = useState(false)
    const [termsContent, setTermsContent] = useState('')

    // Infinite scroll observer
    const observerTarget = useRef<HTMLDivElement>(null)

    // Fetch seller status
    useEffect(() => {
        if (user?.id) {
            getSellerStatus(user.id).then(profile => {
                setSellerProfile(profile)
                setIsLoadingSeller(false)
            })
            // Fetch T&C content
            getSellerTerms().then(terms => {
                setTermsContent(terms)
            })
        } else {
            setIsLoadingSeller(false)
        }
    }, [user])

    // Fetch items with pagination
    const fetchItems = useCallback(async (loadMore = false) => {
        const currentOffset = loadMore ? offset : 0

        if (loadMore) {
            setIsLoadingMore(true)
        } else {
            setIsLoading(true)
        }

        try {
            const response = await fetch(`/api/marketplace/items?limit=${ITEMS_PER_PAGE}&offset=${currentOffset}`)
            const data = await response.json()

            if (loadMore) {
                setItems(prev => [...prev, ...(data.items || [])])
            } else {
                setItems(data.items || [])
            }

            setPurchasedAssets(data.purchasedAssets || [])
            setHasMore(data.pagination?.hasMore || false)

            if (loadMore) {
                setOffset(prev => prev + ITEMS_PER_PAGE)
            } else {
                setOffset(ITEMS_PER_PAGE)
            }
        } catch (error) {
            console.error('Failed to fetch items:', error)
        } finally {
            setIsLoading(false)
            setIsLoadingMore(false)
        }
    }, [offset])

    // Initial load
    useEffect(() => {
        fetchItems(false)
    }, [])

    // Infinite scroll observer
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoading) {
                    fetchItems(true)
                }
            },
            { threshold: 0.1 }
        )

        const currentTarget = observerTarget.current
        if (currentTarget) {
            observer.observe(currentTarget)
        }

        return () => {
            if (currentTarget) {
                observer.unobserve(currentTarget)
            }
        }
    }, [hasMore, isLoadingMore, isLoading, fetchItems])

    // Filter and sort
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
                case 'popular': return (b.downloads || 0) - (a.downloads || 0)
                case 'recent': default: return 0
            }
        })
        setFilteredItems(filtered)
    }, [items, typeFilter, searchQuery, sortBy])

    const handlePurchaseSuccess = () => {
        if (selectedItem) setPurchasedAssets([...purchasedAssets, selectedItem.id])
        fetchItems(false)
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

                        {/* Conditional Seller Registration Buttons */}
                        {isCreator && !isLoadingSeller && (
                            <div className="flex items-center gap-3">
                                <Link
                                    href="/campaign/my"
                                    className="px-5 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-purple-500/50 text-purple-400 hover:text-purple-300 rounded-lg font-bold transition-all flex items-center gap-2 group"
                                >
                                    <span className="group-hover:scale-110 transition-transform">🛠️</span>
                                    Creator Studio
                                </Link>

                                {!sellerProfile && (
                                    <button
                                        onClick={() => setShowTermsModal(true)}
                                        className="px-5 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-lg font-bold transition-all flex items-center gap-2 shadow-lg hover:shadow-emerald-500/50"
                                    >
                                        <span>✨</span>
                                        Register as Seller
                                    </button>
                                )}

                                {sellerProfile?.status === 'PENDING' && (
                                    <button
                                        disabled
                                        className="px-5 py-3 bg-slate-700 text-slate-400 rounded-lg font-bold cursor-not-allowed flex items-center gap-2 opacity-60"
                                    >
                                        <span>⏳</span>
                                        Application Pending
                                    </button>
                                )}

                                {(sellerProfile?.status === 'PRE_REGISTER' || sellerProfile?.status === 'APPROVED') && (
                                    <Link
                                        href="/seller/products"
                                        className="px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-lg font-bold transition-all flex items-center gap-2 shadow-lg hover:shadow-blue-500/50"
                                    >
                                        <span>🏪</span>
                                        Seller Studio
                                    </Link>
                                )}

                                {sellerProfile?.status === 'REJECTED' && (
                                    <Link
                                        href="/register-seller?resubmit=true"
                                        className="px-5 py-3 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white rounded-lg font-bold transition-all flex items-center gap-2 shadow-lg hover:shadow-amber-500/50"
                                    >
                                        <span>🔄</span>
                                        Resubmit Application
                                    </Link>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Filters & Sort */}
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

            {/* Content - Shopee style grid */}
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
                    <>
                        {/* Shopee-style compact grid: 5-6 columns on desktop */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                            {filteredItems.map((item) => (
                                <ItemCard
                                    key={item.id}
                                    item={item}
                                    isPurchased={purchasedAssets.includes(item.id)}
                                    onClick={() => setSelectedItem(item)}
                                />
                            ))}
                        </div>

                        {/* Infinite scroll trigger */}
                        {hasMore && (
                            <div ref={observerTarget} className="flex justify-center py-8">
                                {isLoadingMore && (
                                    <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
                                )}
                            </div>
                        )}

                        {/* End of results message */}
                        {!hasMore && filteredItems.length > 0 && (
                            <div className="text-center py-8">
                                <p className="text-gray-500 text-sm">You've reached the end</p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Item Detail Modal */}
            <ItemDetailModal
                isOpen={!!selectedItem}
                onClose={() => setSelectedItem(null)}
                item={selectedItem}
                isPurchased={selectedItem ? purchasedAssets.includes(selectedItem.id) : false}
                onPurchaseSuccess={handlePurchaseSuccess}
            />

            {/* Seller Terms & Conditions Modal */}
            {user && (
                <SellerTermsModal
                    isOpen={showTermsModal}
                    onClose={() => setShowTermsModal(false)}
                    userId={user.id}
                    termsContent={termsContent}
                    onSuccess={() => {
                        // Refresh seller status
                        if (user?.id) {
                            getSellerStatus(user.id).then(profile => {
                                setSellerProfile(profile)
                            })
                        }
                    }}
                />
            )}
        </div>
    )
}
