'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createCampaign } from '@/app/actions/campaign' // เดี๋ยวสร้าง Action นี้ให้ครับ

export default function CreateCampaignPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [activeTab, setActiveTab] = useState<'INFO' | 'STORY' | 'SCENES' | 'NPCS' | 'CHARS'>('INFO')

    // --- FORM STATE ---
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        price: 0,
        storyIntro: '',
        storyMid: '',
        storyEnd: '',
        scenes: [] as any[],
        npcs: [] as any[],
        preGens: [] as any[]
    })

    // --- HANDLERS ---
    const updateField = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const addScene = () => {
        const newScene = { id: Date.now(), name: 'New Scene', imageUrl: 'https://placehold.co/600x400/1e293b/FFF?text=Scene+Image', description: '' }
        setFormData(prev => ({ ...prev, scenes: [...prev.scenes, newScene] }))
    }

    const addNpc = () => {
        const newNpc = { id: Date.now(), name: 'New NPC', type: 'FRIENDLY', avatarUrl: 'https://placehold.co/200x200/1e293b/FFF?text=NPC', stats: '{}' }
        setFormData(prev => ({ ...prev, npcs: [...prev.npcs, newNpc] }))
    }

    const addPreGen = () => {
        const newChar = { id: Date.now(), name: 'New Hero', bio: 'A brave adventurer.', avatarUrl: 'https://placehold.co/200x200/1e293b/FFF?text=Hero', stats: JSON.stringify({ hp: 20, str: 10, dex: 10, int: 10 }) }
        setFormData(prev => ({ ...prev, preGens: [...prev.preGens, newChar] }))
    }

    const updateItemInList = (listKey: 'scenes' | 'npcs' | 'preGens', id: number, field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [listKey]: prev[listKey].map((item: any) => item.id === id ? { ...item, [field]: value } : item)
        }))
    }

    const removeItem = (listKey: 'scenes' | 'npcs' | 'preGens', id: number) => {
        setFormData(prev => ({
            ...prev,
            [listKey]: prev[listKey].filter((item: any) => item.id !== id)
        }))
    }

    const handleSubmit = async () => {
        if (!formData.title) return alert("Campaign Title is required")
        setIsLoading(true)
        try {
            await createCampaign(formData)
            alert("Campaign Created Successfully!")
            router.push('/') // กลับหน้าหลัก
        } catch (error) {
            console.error(error)
            alert("Failed to create campaign")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 flex">

            {/* SIDEBAR NAVIGATION */}
            <div className="w-64 bg-slate-900 border-r border-slate-800 p-6 flex flex-col shrink-0">
                <h1 className="text-xl font-bold text-amber-500 mb-8 tracking-widest uppercase">Create Campaign</h1>

                <nav className="space-y-2 flex-1">
                    <TabButton active={activeTab === 'INFO'} onClick={() => setActiveTab('INFO')} label="1. Basic Info" icon="📝" />
                    <TabButton active={activeTab === 'STORY'} onClick={() => setActiveTab('STORY')} label="2. Storyline" icon="📜" />
                    <TabButton active={activeTab === 'SCENES'} onClick={() => setActiveTab('SCENES')} label="3. Scenes" icon="🖼️" />
                    <TabButton active={activeTab === 'NPCS'} onClick={() => setActiveTab('NPCS')} label="4. NPCs" icon="👾" />
                    <TabButton active={activeTab === 'CHARS'} onClick={() => setActiveTab('CHARS')} label="5. Characters" icon="👤" />
                </nav>

                <button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="mt-8 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg"
                >
                    {isLoading ? 'Saving...' : 'SAVE CAMPAIGN ✅'}
                </button>
                <button onClick={() => router.push('/')} className="mt-2 text-xs text-slate-500 hover:text-white text-center">Cancel</button>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 p-8 overflow-y-auto h-screen bg-slate-950">
                <div className="max-w-4xl mx-auto">

                    {/* 1. BASIC INFO */}
                    {activeTab === 'INFO' && (
                        <div className="space-y-6 animate-fade-in">
                            <h2 className="text-2xl font-bold text-white border-b border-slate-800 pb-4">Basic Information</h2>
                            <InputGroup label="Campaign Title" value={formData.title} onChange={e => updateField('title', e.target.value)} placeholder="e.g. The Lost Dungeon" />
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-slate-400">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => updateField('description', e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 h-32 text-white focus:border-amber-500 outline-none"
                                    placeholder="Brief summary of your campaign..."
                                />
                            </div>
                            <InputGroup label="Price (Coins) - Optional" type="number" value={formData.price} onChange={e => updateField('price', parseInt(e.target.value))} placeholder="0" />
                        </div>
                    )}

                    {/* 2. STORYLINE */}
                    {activeTab === 'STORY' && (
                        <div className="space-y-6 animate-fade-in">
                            <h2 className="text-2xl font-bold text-white border-b border-slate-800 pb-4">Storyline (For GM)</h2>
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-slate-400">Introduction (The Hook)</label>
                                <textarea value={formData.storyIntro} onChange={e => updateField('storyIntro', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 h-24 text-white" placeholder="How does the adventure begin?" />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-slate-400">Mid-Game (The Twist)</label>
                                <textarea value={formData.storyMid} onChange={e => updateField('storyMid', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 h-24 text-white" placeholder="What happens in the middle?" />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-slate-400">Conclusion (The End)</label>
                                <textarea value={formData.storyEnd} onChange={e => updateField('storyEnd', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 h-24 text-white" placeholder="How does it end?" />
                            </div>
                        </div>
                    )}

                    {/* 3. SCENES */}
                    {activeTab === 'SCENES' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                                <h2 className="text-2xl font-bold text-white">Scenes ({formData.scenes.length})</h2>
                                <button onClick={addScene} className="bg-amber-600 hover:bg-amber-500 text-black font-bold px-4 py-2 rounded-lg text-sm">+ Add Scene</button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {formData.scenes.map((scene, idx) => (
                                    <div key={scene.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative group">
                                        <button onClick={() => removeItem('scenes', scene.id)} className="absolute top-2 right-2 text-red-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">🗑️</button>

                                        <div className="mb-3 aspect-video bg-black rounded overflow-hidden border border-slate-700">
                                            <img src={scene.imageUrl} alt="Scene" className="w-full h-full object-cover" onError={(e: any) => e.target.src = 'https://placehold.co/600x400/000/FFF?text=No+Image'} />
                                        </div>

                                        <div className="space-y-2">
                                            <input
                                                value={scene.name}
                                                onChange={e => updateItemInList('scenes', scene.id, 'name', e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm font-bold text-white"
                                                placeholder="Scene Name"
                                            />
                                            <input
                                                value={scene.imageUrl}
                                                onChange={e => updateItemInList('scenes', scene.id, 'imageUrl', e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-400 font-mono"
                                                placeholder="Image URL"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 4. NPCs */}
                    {activeTab === 'NPCS' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                                <h2 className="text-2xl font-bold text-white">NPCs ({formData.npcs.length})</h2>
                                <button onClick={addNpc} className="bg-amber-600 hover:bg-amber-500 text-black font-bold px-4 py-2 rounded-lg text-sm">+ Add NPC</button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {formData.npcs.map((npc, idx) => (
                                    <div key={npc.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex gap-4 relative group">
                                        <button onClick={() => removeItem('npcs', npc.id)} className="absolute top-2 right-2 text-red-500 text-xs opacity-0 group-hover:opacity-100">🗑️</button>

                                        <div className="w-16 h-16 bg-black rounded-full overflow-hidden border border-slate-700 shrink-0">
                                            <img src={npc.avatarUrl} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 space-y-2 min-w-0">
                                            <input
                                                value={npc.name}
                                                onChange={e => updateItemInList('npcs', npc.id, 'name', e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm font-bold text-white"
                                                placeholder="Name"
                                            />
                                            <select
                                                value={npc.type}
                                                onChange={e => updateItemInList('npcs', npc.id, 'type', e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-400"
                                            >
                                                <option value="FRIENDLY">Friendly</option>
                                                <option value="ENEMY">Enemy</option>
                                                <option value="NEUTRAL">Neutral</option>
                                            </select>
                                            <input
                                                value={npc.avatarUrl}
                                                onChange={e => updateItemInList('npcs', npc.id, 'avatarUrl', e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[10px] text-slate-500 font-mono"
                                                placeholder="Avatar URL"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 5. CHARACTERS */}
                    {activeTab === 'CHARS' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                                <h2 className="text-2xl font-bold text-white">Pre-Gen Characters ({formData.preGens.length})</h2>
                                <button onClick={addPreGen} className="bg-amber-600 hover:bg-amber-500 text-black font-bold px-4 py-2 rounded-lg text-sm">+ Add Hero</button>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {formData.preGens.map((char, idx) => (
                                    <div key={char.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex gap-4 relative group items-start">
                                        <button onClick={() => removeItem('preGens', char.id)} className="absolute top-2 right-2 text-red-500 text-xs opacity-0 group-hover:opacity-100">🗑️</button>

                                        <div className="w-20 h-20 bg-black rounded-lg overflow-hidden border border-slate-700 shrink-0">
                                            <img src={char.avatarUrl} className="w-full h-full object-cover" />
                                        </div>

                                        <div className="flex-1 space-y-2">
                                            <div className="grid grid-cols-2 gap-2">
                                                <input
                                                    value={char.name}
                                                    onChange={e => updateItemInList('preGens', char.id, 'name', e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm font-bold text-white"
                                                    placeholder="Hero Name"
                                                />
                                                <input
                                                    value={char.avatarUrl}
                                                    onChange={e => updateItemInList('preGens', char.id, 'avatarUrl', e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[10px] text-slate-500 font-mono"
                                                    placeholder="Avatar URL"
                                                />
                                            </div>
                                            <textarea
                                                value={char.bio}
                                                onChange={e => updateItemInList('preGens', char.id, 'bio', e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 h-16"
                                                placeholder="Character Bio..."
                                            />
                                        </div>

                                        {/* Stats Mini Form */}
                                        <div className="w-32 bg-slate-950 p-2 rounded border border-slate-800">
                                            <div className="text-[10px] text-slate-500 font-bold mb-1 uppercase text-center">Base Stats</div>
                                            <div className="grid grid-cols-2 gap-1">
                                                {['hp', 'str', 'dex', 'int'].map(stat => {
                                                    const stats = JSON.parse(char.stats || '{}')
                                                    return (
                                                        <div key={stat} className="flex flex-col">
                                                            <span className="text-[8px] uppercase text-slate-500 text-center">{stat}</span>
                                                            <input
                                                                type="number"
                                                                value={stats[stat] || 0}
                                                                onChange={e => {
                                                                    const newStats = { ...stats, [stat]: parseInt(e.target.value) }
                                                                    updateItemInList('preGens', char.id, 'stats', JSON.stringify(newStats))
                                                                }}
                                                                className="w-full bg-slate-800 text-center text-xs text-white rounded border border-slate-700 py-0.5"
                                                            />
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    )
}

// Helper Components
function TabButton({ active, onClick, label, icon }: any) {
    return (
        <button
            onClick={onClick}
            className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-colors ${active ? 'bg-slate-800 text-white border border-slate-700 shadow-md' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/50'}`}
        >
            <span className="text-lg">{icon}</span>
            <span className="font-bold text-sm">{label}</span>
        </button>
    )
}

function InputGroup({ label, value, onChange, placeholder, type = "text" }: any) {
    return (
        <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-400">{label}</label>
            <input
                type={type}
                value={value}
                onChange={onChange}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-amber-500 outline-none transition-colors"
                placeholder={placeholder}
            />
        </div>
    )
}