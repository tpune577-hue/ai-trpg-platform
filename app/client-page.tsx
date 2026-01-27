// app/page.tsx (หรือ client-page.tsx)
import { getSiteConfig } from '@/app/actions/site-settings'
import { getPublishedCampaigns } from '@/app/actions/game'
import Link from 'next/link'

export default async function HomePage() {
    const config = await getSiteConfig()
    const campaigns = await getPublishedCampaigns()

    return (
        <main className="min-h-screen bg-[#0f172a] text-slate-200 font-sans relative overflow-hidden">

            {/* 1. EPIC HERO BACKGROUND */}
            <div className="relative h-[60vh] flex items-center justify-center overflow-hidden">
                {/* Background Image with Overlay */}
                <div
                    className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-1000 hover:scale-105"
                    style={{ backgroundImage: `url(${config.heroImageUrl || '/placeholder.jpg'})` }}
                >
                    <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-[#0f172a]"></div>
                </div>

                {/* Hero Content */}
                <div className="relative z-10 text-center px-4 max-w-4xl mx-auto space-y-6 animate-in fade-in zoom-in duration-1000">
                    <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-500 to-amber-200 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] tracking-tight">
                        {config.heroTitle}
                    </h1>
                    <p className="text-xl md:text-2xl text-slate-200 font-medium drop-shadow-md max-w-2xl mx-auto">
                        {config.heroSubtitle}
                    </p>

                    {/* ปุ่ม Start แบบ RPG */}
                    <div className="flex justify-center gap-4 mt-8">
                        <Link href="/lobby/create" className="group relative px-8 py-4 bg-amber-600 rounded overflow-hidden shadow-[0_0_20px_rgba(245,158,11,0.5)] hover:shadow-[0_0_40px_rgba(245,158,11,0.8)] transition-all">
                            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                            <span className="relative font-black text-black uppercase tracking-widest flex items-center gap-2">
                                ⚔️ Create Room
                            </span>
                        </Link>
                        <Link href="/lobby/join" className="px-8 py-4 bg-slate-800/80 backdrop-blur border border-slate-600 rounded hover:bg-slate-700 hover:border-amber-500 transition-all shadow-lg">
                            <span className="font-bold text-amber-500 uppercase tracking-widest">🔍 Find Party</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* 2. TOWN CRIER (Announcement) */}
            {config.announcement && (
                <div className="bg-amber-900/30 border-y border-amber-500/30 py-3 overflow-hidden relative">
                    <div className="whitespace-nowrap animate-marquee text-amber-200 font-mono text-sm flex items-center gap-4">
                        <span>🔔 HEAR YE! HEAR YE!</span>
                        <span>{config.announcement}</span>
                        <span>🔔</span>
                        <span>{config.announcement}</span> {/* Duplicate for smooth loop */}
                    </div>
                </div>
            )}

            {/* 3. QUEST BOARD (Campaign List) */}
            <div className="max-w-7xl mx-auto px-4 py-16 relative z-10">
                <div className="flex items-center justify-between mb-8 border-b border-slate-700 pb-4">
                    <h2 className="text-3xl font-bold text-amber-500 flex items-center gap-3">
                        📜 <span className="uppercase tracking-wider">Quest Board</span>
                    </h2>
                    <Link href="/marketplace" className="text-xs font-bold text-slate-400 hover:text-white transition-colors uppercase">
                        Visit Black Market →
                    </Link>
                </div>

                {campaigns.length === 0 ? (
                    <div className="text-center py-20 bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-700">
                        <div className="text-6xl mb-4 opacity-50">🕸️</div>
                        <h3 className="text-xl font-bold text-slate-400">The board is empty...</h3>
                        <p className="text-sm text-slate-500">Be the first hero to post a quest!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {campaigns.map((camp) => (
                            <Link href={`/campaign/${camp.id}`} key={camp.id} className="group">
                                {/* QUEST CARD DESIGN */}
                                <div className="bg-[#1e293b] rounded-xl overflow-hidden border border-slate-700 shadow-lg hover:shadow-amber-500/20 hover:-translate-y-1 hover:border-amber-500/50 transition-all duration-300 relative h-full flex flex-col">
                                    {/* Pin Effect */}
                                    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 w-3 h-3 rounded-full bg-red-800 shadow-sm border border-red-950"></div>

                                    {/* Image */}
                                    <div className="h-48 overflow-hidden relative">
                                        <img
                                            src={camp.coverImage || '/placeholder.jpg'}
                                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500"
                                        />
                                        <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-[#1e293b] to-transparent"></div>
                                        <div className="absolute top-2 right-2 bg-black/70 backdrop-blur px-2 py-1 rounded text-[10px] font-bold text-amber-500 border border-amber-500/30">
                                            {camp.system}
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-5 flex-1 flex flex-col relative">
                                        <h3 className="text-xl font-bold text-slate-100 mb-2 group-hover:text-amber-400 transition-colors line-clamp-1">
                                            {camp.title}
                                        </h3>
                                        <p className="text-sm text-slate-400 mb-4 line-clamp-2 flex-1">
                                            {camp.description}
                                        </p>

                                        <div className="flex items-center justify-between pt-4 border-t border-slate-700/50 mt-auto">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-slate-700 overflow-hidden">
                                                    {camp.creator?.image && <img src={camp.creator.image} />}
                                                </div>
                                                <span className="text-xs text-slate-500 truncate max-w-[100px]">{camp.creator?.name || 'Unknown'}</span>
                                            </div>
                                            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                                                Join Quest →
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Decorative Runes (Background) */}
            <div className="absolute top-20 left-10 text-9xl text-white/5 font-serif select-none pointer-events-none rotate-12">⚔️</div>
            <div className="absolute bottom-20 right-10 text-9xl text-white/5 font-serif select-none pointer-events-none -rotate-12">🐉</div>

        </main>
    )
}