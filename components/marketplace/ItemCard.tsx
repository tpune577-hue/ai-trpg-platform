'use client'

interface ItemCardProps {
    id: string
    title: string
    description?: string
    type: 'ART' | 'THEME' | 'CAMPAIGN'
    price: number
    imageUrl: string
    creatorName: string
    downloads: number
    rating?: number
    isPurchased?: boolean
    onClick: () => void
}

export default function ItemCard({
    id,
    title,
    description,
    type,
    price,
    imageUrl,
    creatorName,
    downloads,
    rating,
    isPurchased = false,
    onClick,
}: ItemCardProps) {
    return (
        <div
            onClick={onClick}
            className="group relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border-2 border-slate-700/50 hover:border-amber-500/50 overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-amber-500/20"
        >
            {/* Image */}
            <div className="relative aspect-video bg-slate-950 overflow-hidden">
                <img
                    src={imageUrl}
                    alt={title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />

                {/* Type Badge */}
                <div className="absolute top-3 left-3">
                    <span
                        className={`px-3 py-1 text-xs font-bold uppercase tracking-wide rounded-full ${type === 'ART'
                            ? 'bg-purple-500/90 text-white'
                            : type === 'CAMPAIGN'
                                ? 'bg-amber-500/90 text-black'
                                : 'bg-blue-500/90 text-white'
                            }`}
                    >
                        {type}
                    </span>
                </div>

                {/* Purchased Badge */}
                {isPurchased && (
                    <div className="absolute top-3 right-3">
                        <span className="px-3 py-1 text-xs font-bold bg-emerald-500/90 text-white rounded-full flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            OWNED
                        </span>
                    </div>
                )}

                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>

            {/* Content */}
            <div className="p-4">
                {/* Title */}
                <h3 className="text-lg font-bold text-white mb-2 line-clamp-1 group-hover:text-amber-400 transition-colors">
                    {title}
                </h3>

                {/* Description */}
                {description && (
                    <p className="text-sm text-gray-400 mb-3 line-clamp-2">{description}</p>
                )}

                {/* Creator */}
                <div className="flex items-center gap-2 mb-3">
                    <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                        <path
                            fillRule="evenodd"
                            d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                            clipRule="evenodd"
                        />
                    </svg>
                    <span className="text-xs text-gray-400">{creatorName}</span>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
                    {/* Price */}
                    <div className="flex items-center gap-1">
                        <span className="text-2xl font-bold text-amber-400">${price.toFixed(2)}</span>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                        {/* Rating */}
                        {rating && (
                            <div className="flex items-center gap-1">
                                <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                <span>{rating.toFixed(1)}</span>
                            </div>
                        )}

                        {/* Downloads */}
                        <div className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                    fillRule="evenodd"
                                    d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            <span>{downloads}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Glow effect on hover */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-500/0 via-amber-500/5 to-amber-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        </div>
    )
}
