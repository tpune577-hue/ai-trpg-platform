'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createCampaignAction, updateCampaignAction, getCampaignById } from '@/app/actions/campaign'
import CharacterCreator from '@/components/game/CharacterCreator'

export default function CreateCampaignPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const campaignId = searchParams.get('id')

    const [isLoading, setIsLoading] = useState(false)
    const [isFetching, setIsFetching] = useState(!!campaignId)
    // ✅ เพิ่ม Tab 'AI' เข้าไป
    const [activeTab, setActiveTab] = useState<'GENERAL' | 'STORY' | 'SCENES' | 'NPCS' | 'PREGENS' | 'AI'>('GENERAL')

    // --- FORM STATES ---
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [price, setPrice] = useState(0)
    const [coverImage, setCoverImage] = useState('')
    const [system, setSystem] = useState<'STANDARD' | 'ROLE_AND_ROLL'>('STANDARD')

    const [storyIntro, setStoryIntro] = useState('')
    const [storyMid, setStoryMid] = useState('')
    const [storyEnd, setStoryEnd] = useState('')

    // ✅ AI Configuration States
    const [aiEnabled, setAiEnabled] = useState(false)
    const [aiName, setAiName] = useState('The Narrator')
    const [aiPersonality, setAiPersonality] = useState('')
    const [aiStyle, setAiStyle] = useState('Classic Adventure')
    const [aiCustomPrompt, setAiCustomPrompt] = useState('')

    const [scenes, setScenes] = useState<{ id: string | number, name: string, imageUrl: string }[]>([])
    const [npcs, setNpcs] = useState<{ id: string | number, name: string, type: string, avatarUrl: string }[]>([])
    const [preGens, setPreGens] = useState<any[]>([])

    // UI Helpers
    const [isAddingPreGen, setIsAddingPreGen] = useState(false)
    const [editingPreGenIndex, setEditingPreGenIndex] = useState<number | null>(null)
    const [editingPreGenData, setEditingPreGenData] = useState<any>(null)

    // ✅ LOAD DATA FOR EDITING
    useEffect(() => {
        if (!campaignId) return

        const loadData = async () => {
            try {
                const data = await getCampaignById(campaignId)
                if (!data) return alert("Campaign not found")

                setTitle(data.title)
                setDescription(data.description || '')
                setPrice(data.price)
                setCoverImage(data.coverImage || '')
                setSystem(data.system as 'STANDARD' | 'ROLE_AND_ROLL' || 'STANDARD')

                setStoryIntro(data.storyIntro || '')
                setStoryMid(data.storyMid || '')
                setStoryEnd(data.storyEnd || '')

                // ✅ Load AI Data
                setAiEnabled(data.aiEnabled || false)
                setAiName(data.aiName || 'The Narrator')
                setAiPersonality(data.aiPersonality || '')
                setAiStyle(data.aiStyle || 'Classic Adventure')
                setAiCustomPrompt(data.aiCustomPrompt || '')

                if (data.scenes) setScenes(data.scenes.map((s: any) => ({ id: s.id, name: s.name, imageUrl: s.imageUrl })))
                if (data.npcs) setNpcs(data.npcs.map((n: any) => ({ id: n.id, name: n.name, type: n.type, avatarUrl: n.avatarUrl })))
                if (data.preGens) {
                    setPreGens(data.preGens.map((p: any) => ({
                        id: p.id,
                        name: p.name,
                        imageUrl: p.avatarUrl,
                        sheetType: p.sheetType,
                        data: p.stats ? JSON.parse(p.stats) : {}
                    })))
                }

            } catch (error) {
                console.error("Error loading campaign:", error)
            } finally {
                setIsFetching(false)
            }
        }

        loadData()
    }, [campaignId])


    // --- HANDLERS ---
    const addScene = () => setScenes([...scenes, { id: Date.now(), name: 'New Scene', imageUrl: '' }])
    const updateScene = (id: string | number, field: string, val: string) => {
        setScenes(scenes.map(s => s.id === id ? { ...s, [field]: val } : s))
    }
    const removeScene = (id: string | number) => setScenes(scenes.filter(s => s.id !== id))

    const addNpc = () => setNpcs([...npcs, { id: Date.now(), name: 'New NPC', type: 'FRIENDLY', avatarUrl: '' }])
    const updateNpc = (id: string | number, field: string, val: string) => {
        setNpcs(npcs.map(n => n.id === id ? { ...n, [field]: val } : n))
    }
    const removeNpc = (id: string | number) => setNpcs(npcs.filter(n => n.id !== id))

    const handleSavePreGen = (charData: any) => {
        const newChar = { ...charData, id: `pregen-${Date.now()}` }
        setPreGens([...preGens, newChar])
        setIsAddingPreGen(false)
    }

    const handleEditPreGen = (idx: number) => {
        setEditingPreGenIndex(idx)
        setEditingPreGenData(preGens[idx])
    }

    const handleUpdatePreGen = (charData: any) => {
        if (editingPreGenIndex === null) return
        const updated = [...preGens]
        updated[editingPreGenIndex] = { ...charData, id: preGens[editingPreGenIndex].id }
        setPreGens(updated)
        setEditingPreGenIndex(null)
        setEditingPreGenData(null)
    }

    const handleCancelEdit = () => {
        setEditingPreGenIndex(null)
        setEditingPreGenData(null)
    }

    const removePreGen = (idx: number) => setPreGens(preGens.filter((_, i) => i !== idx))

    // ✅ SAVE / PUBLISH
    const handleSave = async (isDraft: boolean) => {
        if (!title) return alert("Title is required")
        setIsLoading(true)

        const payload = {
            title, description, price, coverImage, system,
            storyIntro, storyMid, storyEnd,
            scenes, npcs, preGens,
            // ✅ ส่งค่า AI ไปบันทึก
            aiEnabled, aiName, aiPersonality, aiStyle, aiCustomPrompt,
            isPublished: !isDraft
        }

        try {
            if (campaignId) {
                await updateCampaignAction(campaignId, payload)
                alert("✅ Campaign Updated!")
            } else {
                await createCampaignAction(payload)
                if (isDraft) alert("✅ Draft Saved!")
                else alert("🚀 Published!")
            }
            router.push('/')
        } catch (error) {
            console.error(error)
            alert("Failed to save campaign")
        } finally {
            setIsLoading(false)
        }
    }

    // Styles
    const inputClass = "w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all placeholder-slate-600 text-base"
    const textareaClass = "w-full min-h-[150px] bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all placeholder-slate-600 text-base leading-relaxed resize-y"

    if (isFetching) return <div className="flex h-screen bg-slate-950 items-center justify-center text-white">Loading Campaign Data...</div>

    return (
        <div className="flex h-screen bg-slate-950 text-white overflow-hidden font-sans">

            {/* 1. LEFT SIDEBAR */}
            <div className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 z-20 shadow-xl">
                <div className="p-6 border-b border-slate-800 bg-slate-900">
                    <h1 className="text-2xl font-black text-amber-500 uppercase tracking-widest italic">
                        {campaignId ? 'Edit Campaign' : 'Campaign Studio'}
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">Craft your adventure</p>
                </div>

                <nav className="flex-1 p-4 space-y-3 overflow-y-auto custom-scrollbar">
                    <SidebarBtn label="📝 General Info" active={activeTab === 'GENERAL'} onClick={() => setActiveTab('GENERAL')} />
                    <SidebarBtn label="📖 Storyline" active={activeTab === 'STORY'} onClick={() => setActiveTab('STORY')} />

                    {/* ✅ ปุ่ม AI Menu */}
                    <SidebarBtn label="🤖 AI Game Master" active={activeTab === 'AI'} onClick={() => setActiveTab('AI')} special />

                    <div className="h-px bg-slate-800 my-2"></div>

                    <SidebarBtn label="🌄 Scenes & Maps" active={activeTab === 'SCENES'} onClick={() => setActiveTab('SCENES')} />
                    <SidebarBtn label="👥 NPCs" active={activeTab === 'NPCS'} onClick={() => setActiveTab('NPCS')} />
                    <SidebarBtn label="🛡️ Pre-Gen Chars" active={activeTab === 'PREGENS'} onClick={() => setActiveTab('PREGENS')} />
                </nav>

                <div className="p-4 border-t border-slate-800 bg-slate-900 space-y-3">
                    <button
                        onClick={() => handleSave(true)}
                        disabled={isLoading}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-base py-3 rounded-xl border border-slate-700 hover:border-slate-500 transition-all active:scale-95"
                    >
                        {isLoading ? 'Saving...' : (campaignId ? '💾 Update Draft' : '💾 Save Draft')}
                    </button>
                    <button
                        onClick={() => handleSave(false)}
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-black text-lg py-4 rounded-xl shadow-lg shadow-amber-900/20 disabled:opacity-50 transition-all active:scale-95"
                    >
                        {isLoading ? 'Publishing...' : '🚀 PUBLISH'}
                    </button>
                </div>
            </div>

            {/* 2. MAIN CONTENT */}
            <div className="flex-1 overflow-y-auto bg-slate-950 relative custom-scrollbar">
                <div className="max-w-5xl mx-auto p-8 lg:p-12 pb-32">

                    {/* --- TAB: GENERAL --- */}
                    {activeTab === 'GENERAL' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <SectionHeader title="General Information" subtitle="Set up the basics of your campaign." />
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <InputGroup label="Campaign Title">
                                    <input value={title} onChange={e => setTitle(e.target.value)} className={inputClass} placeholder="e.g. The Curse of Strahd" style={{ fontSize: '1.25rem', fontWeight: 'bold' }} />
                                </InputGroup>
                                <InputGroup label="Price (Coins)">
                                    <input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} className={inputClass} placeholder="0 for Free" />
                                </InputGroup>
                            </div>

                            <InputGroup label="Game System (Dice Rules)">
                                <div className="relative">
                                    <select
                                        value={system}
                                        onChange={(e) => setSystem(e.target.value as any)}
                                        className={`${inputClass} appearance-none cursor-pointer bg-slate-900`}
                                    >
                                        <option value="STANDARD">🌟 Standard RPG (D20 + Modifiers)</option>
                                        <option value="ROLE_AND_ROLL">🎲 Role & Roll (5D4 Exploding Dice)</option>
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">▼</div>
                                </div>
                                <p className="text-xs text-slate-500 mt-2 ml-1">
                                    {system === 'STANDARD'
                                        ? "Classic system using a 20-sided die. Roll + Stats vs Difficulty Class (DC)."
                                        : "Unique system using a pool of 5D4. 'R' face triggers re-rolls and chains combos."}
                                </p>
                            </InputGroup>

                            <InputGroup label="Cover Image URL">
                                <div className="flex gap-6 items-start">
                                    <input value={coverImage} onChange={e => setCoverImage(e.target.value)} className={inputClass} placeholder="https://..." />
                                    <div className="w-32 h-20 bg-black rounded-lg border border-slate-700 shrink-0 overflow-hidden">
                                        {coverImage ? <img src={coverImage} className="w-full h-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-slate-600">Preview</div>}
                                    </div>
                                </div>
                            </InputGroup>
                            <InputGroup label="Description / Synopsis">
                                <textarea value={description} onChange={e => setDescription(e.target.value)} className={textareaClass} placeholder="Write a compelling summary of your adventure..." />
                            </InputGroup>
                        </div>
                    )}

                    {/* --- TAB: STORY --- */}
                    {activeTab === 'STORY' && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <SectionHeader title="Storyline Guide" subtitle="Write the plot details for the Game Master." />
                            <InputGroup label="Act 1: The Beginning (Intro)">
                                <textarea value={storyIntro} onChange={e => setStoryIntro(e.target.value)} className={textareaClass} placeholder="How the adventure begins..." />
                            </InputGroup>
                            <InputGroup label="Act 2: The Conflict (Mid-Game)">
                                <textarea value={storyMid} onChange={e => setStoryMid(e.target.value)} className={textareaClass} placeholder="Challenges and key events..." />
                            </InputGroup>
                            <InputGroup label="Act 3: The Climax (Ending)">
                                <textarea value={storyEnd} onChange={e => setStoryEnd(e.target.value)} className={textareaClass} placeholder="Possible endings and resolutions..." />
                            </InputGroup>
                        </div>
                    )}

                    {/* ✅ --- TAB: AI GAME MASTER (NEW) --- */}
                    {activeTab === 'AI' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <SectionHeader title="AI Game Master" subtitle="Configure the Artificial Intelligence that will run this game." />

                            {/* Enable Switch */}
                            <div className="bg-slate-900 border border-indigo-500/30 rounded-xl p-6 flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-bold text-indigo-400 flex items-center gap-2">
                                        <span>🤖</span> Enable AI Narrator
                                    </h3>
                                    <p className="text-slate-400 text-sm mt-1">Allow AI to control NPCs and narrate the story automatically.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={aiEnabled} onChange={e => setAiEnabled(e.target.checked)} className="sr-only peer" />
                                    <div className="w-14 h-8 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>

                            <div className={`space-y-8 transition-all duration-300 ${!aiEnabled ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <InputGroup label="GM Name">
                                        <input value={aiName} onChange={e => setAiName(e.target.value)} className={inputClass} placeholder="e.g. The Watcher" />
                                    </InputGroup>

                                    <InputGroup label="Narrative Style">
                                        <div className="relative">
                                            <select value={aiStyle} onChange={e => setAiStyle(e.target.value)} className={`${inputClass} appearance-none cursor-pointer`}>
                                                <option value="Classic Adventure">⚔️ Classic Adventure (Balanced)</option>
                                                <option value="Dark Fantasy">🌑 Dark Fantasy (Grim & Serious)</option>
                                                <option value="Comedy">🤡 Comedy (Lighthearted)</option>
                                                <option value="Horror">👻 Horror (Suspenseful)</option>
                                                <option value="Cyberpunk">🦾 Cyberpunk (Tech & Slang)</option>
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">▼</div>
                                        </div>
                                    </InputGroup>
                                </div>

                                <InputGroup label="GM Personality & Instructions">
                                    <textarea
                                        value={aiPersonality}
                                        onChange={e => setAiPersonality(e.target.value)}
                                        className={textareaClass}
                                        placeholder="Describe how the GM should behave. (e.g., 'Strict with rules, speaks in riddles, describes gore in detail')"
                                        style={{ minHeight: '120px' }}
                                    />
                                </InputGroup>

                                {/* Advanced Section */}
                                <div className="border-t border-slate-800 pt-6">
                                    <details className="group">
                                        <summary className="cursor-pointer text-sm font-bold text-slate-500 hover:text-indigo-400 flex items-center gap-2 select-none">
                                            <span>🛠️ Advanced System Prompt Override</span>
                                            <span className="group-open:rotate-180 transition-transform">▼</span>
                                        </summary>
                                        <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                                            <textarea
                                                value={aiCustomPrompt}
                                                onChange={e => setAiCustomPrompt(e.target.value)}
                                                className={`${textareaClass} font-mono text-xs text-slate-300`}
                                                placeholder="WARNING: This overrides default behavior. Use only if you know Prompt Engineering."
                                            />
                                        </div>
                                    </details>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- TAB: SCENES --- */}
                    {activeTab === 'SCENES' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                                <SectionHeader title={`Scenes (${scenes.length})`} subtitle="Locations and battlemaps." noBorder />
                                <button onClick={addScene} className="bg-amber-600 hover:bg-amber-500 text-black font-bold px-6 py-2 rounded-full text-sm shadow-lg active:scale-95 transition-all">+ Add Scene</button>
                            </div>

                            {scenes.length === 0 ? (
                                <EmptyState message="No scenes added yet. Click '+ Add Scene' to start building your world." />
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {scenes.map((scene) => (
                                        <div key={scene.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative group hover:border-amber-500/50 transition-colors">
                                            <button onClick={() => removeScene(scene.id)} className="absolute top-2 right-2 z-10 bg-slate-950/80 text-red-500 hover:text-red-400 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">🗑️</button>

                                            <div className="mb-3 aspect-video bg-black rounded-lg overflow-hidden border border-slate-700 relative">
                                                <img
                                                    src={scene.imageUrl || 'https://placehold.co/600x400/1e293b/FFF?text=No+Image'}
                                                    alt="Scene"
                                                    className="w-full h-full object-cover"
                                                    onError={(e: any) => e.currentTarget.src = 'https://placehold.co/600x400/1e293b/FFF?text=No+Image'}
                                                />
                                            </div>

                                            <div className="space-y-3">
                                                <input value={scene.name} onChange={e => updateScene(scene.id, 'name', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm font-bold text-white focus:border-amber-500 outline-none" placeholder="Scene Name" />
                                                <input value={scene.imageUrl} onChange={e => updateScene(scene.id, 'imageUrl', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-slate-400 font-mono focus:border-amber-500 outline-none" placeholder="Image URL" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* --- TAB: NPCs --- */}
                    {activeTab === 'NPCS' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                                <SectionHeader title={`NPCs (${npcs.length})`} subtitle="Characters and enemies." noBorder />
                                <button onClick={addNpc} className="bg-amber-600 hover:bg-amber-500 text-black font-bold px-6 py-2 rounded-full text-sm shadow-lg active:scale-95 transition-all">+ Add NPC</button>
                            </div>

                            {npcs.length === 0 ? (
                                <EmptyState message="No NPCs added yet. Create characters to populate your world." />
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {npcs.map((npc) => (
                                        <div key={npc.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative group hover:border-amber-500/50 transition-colors">
                                            <button onClick={() => removeNpc(npc.id)} className="absolute top-2 right-2 z-10 bg-slate-950/80 text-red-500 hover:text-red-400 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">🗑️</button>

                                            <div className="mb-3 aspect-[4/3] bg-black rounded-lg overflow-hidden border border-slate-700 relative">
                                                <img
                                                    src={npc.avatarUrl || 'https://placehold.co/400x300/1e293b/FFF?text=?'}
                                                    className="w-full h-full object-cover"
                                                    onError={(e: any) => e.currentTarget.src = 'https://placehold.co/400x300/1e293b/FFF?text=?'}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <input value={npc.name} onChange={e => updateNpc(npc.id, 'name', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm font-bold text-white focus:border-amber-500 outline-none" placeholder="Name" />
                                                <select value={npc.type} onChange={e => updateNpc(npc.id, 'type', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-400 focus:border-amber-500 outline-none">
                                                    <option value="FRIENDLY">Friendly</option><option value="ENEMY">Enemy</option><option value="NEUTRAL">Neutral</option>
                                                </select>
                                                <input value={npc.avatarUrl} onChange={e => updateNpc(npc.id, 'avatarUrl', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[10px] text-slate-500 font-mono focus:border-amber-500 outline-none" placeholder="Avatar URL" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* --- TAB: PREGENS --- */}
                    {activeTab === 'PREGENS' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                                <SectionHeader title={`Pre-Gen Characters (${preGens.length})`} subtitle="Ready-to-play heroes for quick starts." noBorder />
                                <button onClick={() => setIsAddingPreGen(true)} className="bg-amber-600 hover:bg-amber-500 text-black font-bold px-6 py-2 rounded-full text-sm shadow-lg active:scale-95 transition-all">+ Add Hero</button>
                            </div>

                            {preGens.length === 0 ? (
                                <EmptyState message="No Pre-Gen characters. Add some to help players start quickly." />
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {preGens.map((char, idx) => (
                                        <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative group hover:border-amber-500/50 transition-colors">
                                            <button onClick={() => handleEditPreGen(idx)} className="absolute top-2 left-2 z-10 bg-slate-950/80 text-amber-500 hover:text-amber-400 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">✏️</button>
                                            <button onClick={() => removePreGen(idx)} className="absolute top-2 right-2 z-10 bg-slate-950/80 text-red-500 hover:text-red-400 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">🗑️</button>

                                            <div className="mb-3 aspect-[4/3] bg-black rounded-lg overflow-hidden border border-slate-700 relative">
                                                <img
                                                    src={char.imageUrl || char.avatarUrl || 'https://placehold.co/400x300/1e293b/FFF?text=Hero'}
                                                    className="w-full h-full object-cover"
                                                    onError={(e: any) => e.currentTarget.src = 'https://placehold.co/400x300/1e293b/FFF?text=Hero'}
                                                />
                                                <div className="absolute top-2 right-2">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border shadow-sm ${char.sheetType === 'ROLE_AND_ROLL' ? 'bg-amber-900/90 text-amber-400 border-amber-500/50' : 'bg-blue-900/90 text-blue-400 border-blue-500/50'}`}>
                                                        {char.sheetType === 'ROLE_AND_ROLL' ? 'RnR' : 'STD'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <div className="font-bold text-white text-lg truncate">{char.name || char.bio?.name}</div>
                                                <div className="text-xs text-slate-400 line-clamp-2 h-8">
                                                    {char.data?.description || char.data?.bio?.description || 'No description provided.'}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>

            {/* Character Creator Modal */}
            {(isAddingPreGen || editingPreGenIndex !== null) && (
                <CharacterCreator
                    playerId="GM_DRAFT"
                    initialName={editingPreGenData?.name || "New Hero"}
                    campaignSystem={system}
                    onSave={editingPreGenIndex !== null ? handleUpdatePreGen : handleSavePreGen}
                    onCancel={editingPreGenIndex !== null ? handleCancelEdit : () => setIsAddingPreGen(false)}
                    initialData={editingPreGenData}
                />
            )}
        </div>
    )
}

// --- Helper Components ---

const SidebarBtn = ({ label, active, onClick, special }: any) => (
    <button
        onClick={onClick}
        className={`w-full text-left px-6 py-4 rounded-xl text-base font-bold transition-all duration-200 border border-transparent 
        ${active
                ? 'bg-slate-800 text-amber-500 border-slate-700 shadow-inner'
                : special
                    ? 'text-indigo-400 hover:bg-indigo-900/20 hover:text-indigo-300'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}
    >
        {label}
    </button>
)

const InputGroup = ({ label, children }: any) => (
    <div>
        <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 ml-1">{label}</label>
        {children}
    </div>
)

const SectionHeader = ({ title, subtitle, noBorder }: any) => (
    <div className={noBorder ? '' : 'border-b border-slate-800 pb-4 mb-8'}>
        <h2 className="text-4xl font-bold text-white">{title}</h2>
        <p className="text-slate-400 mt-2 text-lg">{subtitle}</p>
    </div>
)

const EmptyState = ({ message }: any) => (
    <div className="col-span-full py-24 text-center border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/30 flex flex-col items-center justify-center gap-4">
        <div className="text-5xl opacity-20">📂</div>
        <p className="text-slate-500 text-lg font-medium max-w-md">{message}</p>
    </div>
)