import { getPublishedCampaigns, createGameSession } from '@/app/actions/game'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function CreateRoomPage() {
    const campaigns = await getPublishedCampaigns()

    // Server Action: รับค่า Campaign ID แล้วสร้างห้อง
    async function handleCreate(formData: FormData) {
        'use server'
        const campaignId = formData.get('campaignId') as string
        const code = await createGameSession(campaignId)
        redirect(`/lobby/${code}`)
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white p-8">
            <div className="max-w-6xl mx-auto">

                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/" className="text-slate-400 hover:text-white">← Back</Link>
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-600">
                        Select a Campaign
                    </h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                    {/* 1. Custom Room (Blank Canvas) */}
                    <div className="opacity-50 grayscale hover:opacity-100 hover:grayscale-0 transition-all cursor-pointer border border-slate-700 hover:border-white bg-slate-900 rounded-xl p-6 flex flex-col items-center justify-center min-h-[300px] gap-4 text-center">
                        <div className="text-5xl">🎨</div>
                        <h3 className="text-xl font-bold">Custom Room</h3>
                        <p className="text-sm text-slate-400">Create a blank room and set up scenes/NPCs on the fly.</p>
                        <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-500">(Coming Soon)</span>
                    </div>

                    {/* 2. Existing Campaigns */}
                    {campaigns.map(camp => (
                        <form key={camp.id} action={handleCreate} className="h-full">
                            <input type="hidden" name="campaignId" value={camp.id} />
                            <button type="submit" className="w-full h-full text-left bg-slate-900 border border-slate-800 hover:border-amber-500 rounded-xl overflow-hidden group transition-all hover:-translate-y-1 flex flex-col">
                                {/* Cover Image */}
                                <div className="h-40 bg-black w-full relative">
                                    {camp.coverImage ? (
                                        <img src={camp.coverImage} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-4xl bg-slate-800">📜</div>
                                    )}
                                    {camp.price > 0 && (
                                        <div className="absolute top-2 right-2 bg-amber-500 text-black font-bold px-2 py-1 rounded text-xs">
                                            {camp.price} THB
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="p-5 flex-1 flex flex-col">
                                    <h3 className="font-bold text-xl text-white group-hover:text-amber-500 mb-2">{camp.title}</h3>
                                    <p className="text-sm text-slate-400 line-clamp-3 mb-4">{camp.description}</p>

                                    <div className="mt-auto flex flex-wrap gap-2">
                                        {camp.tags?.split(',').map(tag => (
                                            <span key={tag} className="text-[10px] uppercase tracking-wider bg-slate-950 border border-slate-700 px-2 py-1 rounded text-slate-300">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </button>
                        </form>
                    ))}
                </div>
            </div>
        </div>
    )
}