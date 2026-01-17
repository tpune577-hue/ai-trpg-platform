'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createCampaignAction } from '@/app/actions/campaign'
import CharacterCreator from '@/components/game/CharacterCreator'

export default function CreateCampaignPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [activeTab, setActiveTab] = useState<'GENERAL' | 'STORY' | 'SCENES' | 'NPCS' | 'PREGENS'>('GENERAL')

    // --- Form States (เหมือนเดิม) ---
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [price, setPrice] = useState(0)
    const [coverImage, setCoverImage] = useState('')
    const [storyIntro, setStoryIntro] = useState('')
    const [storyMid, setStoryMid] = useState('')
    const [storyEnd, setStoryEnd] = useState('')
    const [scenes, setScenes] = useState<{ name: string, imageUrl: string }[]>([])
    const [npcs, setNpcs] = useState<{ name: string, type: string, avatarUrl: string }[]>([])
    const [preGens, setPreGens] = useState<any[]>([])

    // UI Helpers
    const [isAddingPreGen, setIsAddingPreGen] = useState(false)

    // ... (Functions add/remove scene, npc, pregen เหมือนเดิม) ...
    // ใส่ Code addScene, removeScene, addNpc, removeNpc, handleSavePreGen, removePreGen ที่นี่

    const addScene = () => setScenes([...scenes, { name: 'New Scene', imageUrl: '' }])
    const updateScene = (idx: number, field: string, val: string) => {
        const newScenes = [...scenes]; newScenes[idx] = { ...newScenes[idx], [field]: val }; setScenes(newScenes)
    }
    const removeScene = (idx: number) => setScenes(scenes.filter((_, i) => i !== idx))

    const addNpc = () => setNpcs([...npcs, { name: 'New NPC', type: 'FRIENDLY', avatarUrl: '' }])
    const updateNpc = (idx: number, field: string, val: string) => {
        const newNpcs = [...npcs]; newNpcs[idx] = { ...newNpcs[idx], [field]: val }; setNpcs(newNpcs)
    }
    const removeNpc = (idx: number) => setNpcs(npcs.filter((_, i) => i !== idx))

    const handleSavePreGen = (charData: any) => { setPreGens([...preGens, charData]); setIsAddingPreGen(false) }
    const removePreGen = (idx: number) => setPreGens(preGens.filter((_, i) => i !== idx))


    // ✅ ฟังก์ชัน Save (รองรับ Draft / Publish)
    const handleSave = async (isDraft: boolean) => {
        if (!title) return alert("Title is required (even for draft)")

        setIsLoading(true)
        const payload = {
            title, description, price, coverImage,
            storyIntro, storyMid, storyEnd,
            scenes, npcs, preGens,
            isPublished: !isDraft // ถ้า Draft = false, ถ้า Publish = true
        }

        try {
            await createCampaignAction(payload)
            // ถ้า Draft อาจจะแค่ Alert หรือ Redirect กลับ Dashboard
            if (isDraft) {
                alert("✅ Draft Saved! You can edit it later.")
                router.push('/') // หรือ redirect ไปหน้า My Campaigns
            } else {
                alert("🚀 Campaign Published to Marketplace!")
                router.push('/')
            }
        } catch (error) {
            console.error(error)
            alert("Failed to save campaign")
        } finally {
            setIsLoading(false)
        }
    }

    // Styles
    const inputClass = "w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all placeholder-slate-600 text-base"
    const textareaClass = "w-full min-h-[200px] bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all placeholder-slate-600 text-base leading-relaxed resize-y"

    return (
        <div className="flex h-screen bg-slate-950 text-white overflow-hidden font-sans">

            {/* LEFT SIDEBAR */}
            <div className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 z-20 shadow-xl">
                <div className="p-6 border-b border-slate-800 bg-slate-900">
                    <h1 className="text-2xl font-black text-amber-500 uppercase tracking-widest italic">Campaign Studio</h1>
                    <p className="text-xs text-slate-500 mt-1">Craft your adventure</p>
                </div>
                <nav className="flex-1 p-4 space-y-3 overflow-y-auto">
                    <SidebarBtn label="📝 General Info" active={activeTab === 'GENERAL'} onClick={() => setActiveTab('GENERAL')} />
                    <SidebarBtn label="📖 Storyline" active={activeTab === 'STORY'} onClick={() => setActiveTab('STORY')} />
                    <SidebarBtn label="🌄 Scenes & Maps" active={activeTab === 'SCENES'} onClick={() => setActiveTab('SCENES')} />
                    <SidebarBtn label="👥 NPCs" active={activeTab === 'NPCS'} onClick={() => setActiveTab('NPCS')} />
                    <SidebarBtn label="🛡️ Pre-Gen Chars" active={activeTab === 'PREGENS'} onClick={() => setActiveTab('PREGENS')} />
                </nav>

                {/* ✅ Action Buttons Section */}
                <div className="p-4 border-t border-slate-800 bg-slate-900 space-y-3">
                    {/* ปุ่ม Save Draft */}
                    <button
                        onClick={() => handleSave(true)}
                        disabled={isLoading}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-base py-3 rounded-xl border border-slate-700 hover:border-slate-500 transition-all active:scale-95"
                    >
                        {isLoading ? 'Saving...' : '💾 Save Draft'}
                    </button>

                    {/* ปุ่ม Publish */}
                    <button
                        onClick={() => handleSave(false)}
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-black text-lg py-4 rounded-xl shadow-lg shadow-amber-900/20 disabled:opacity-50 transition-all active:scale-95"
                    >
                        {isLoading ? 'Publishing...' : '🚀 PUBLISH'}
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT (เหมือนเดิม) */}
            <div className="flex-1 overflow-y-auto bg-slate-950 relative">
                <div className="max-w-5xl mx-auto p-8 lg:p-12 pb-32">
                    {/* ... (TAB CONTENT: GENERAL, STORY, SCENES, NPCs, PREGENS เหมือน Code เดิมเป๊ะๆ) ... */}
                    {/* Copy ส่วน Tab content จาก Code ก่อนหน้ามาใส่ได้เลยครับ */}

                    {/* ตัวอย่าง Tab General เพื่อให้ Code สมบูรณ์ในบริบทนี้ */}
                    {activeTab === 'GENERAL' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="border-b border-slate-800 pb-4 mb-8">
                                <h2 className="text-4xl font-bold text-white">General Information</h2>
                                <p className="text-slate-400 mt-2 text-lg">Set up the basics of your campaign.</p>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <InputGroup label="Campaign Title">
                                    <input value={title} onChange={e => setTitle(e.target.value)} className={inputClass} placeholder="e.g. The Curse of Strahd" style={{ fontSize: '1.25rem', fontWeight: 'bold' }} />
                                </InputGroup>
                                <InputGroup label="Price (Coins)">
                                    <input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} className={inputClass} placeholder="0 for Free" />
                                </InputGroup>
                            </div>
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

                    {/* Copy Tabs อื่นๆ (STORY, SCENES, NPCS, PREGENS) จาก Code ก่อนหน้ามาใส่ต่อตรงนี้... */}
                    {activeTab === 'STORY' && (
                        /* ...Story Content... */
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="border-b border-slate-800 pb-4 mb-8">
                                <h2 className="text-4xl font-bold text-white">Storyline Guide</h2>
                                <p className="text-slate-400 mt-2 text-lg">Write the plot details for the Game Master.</p>
                            </div>
                            <InputGroup label="Act 1: The Beginning (Intro)">
                                <textarea value={storyIntro} onChange={e => setStoryIntro(e.target.value)} className={textareaClass} placeholder="Start here..." />
                            </InputGroup>
                            <InputGroup label="Act 2: The Conflict (Mid-Game)">
                                <textarea value={storyMid} onChange={e => setStoryMid(e.target.value)} className={textareaClass} placeholder="Challenges..." />
                            </InputGroup>
                            <InputGroup label="Act 3: The Climax (Ending)">
                                <textarea value={storyEnd} onChange={e => setStoryEnd(e.target.value)} className={textareaClass} placeholder="Ending..." />
                            </InputGroup>
                        </div>
                    )}

                    {/* ... (TAB SCENES, NPCS, PREGENS Copy มาใส่) ... */}
                    {/* เพื่อความกระชับ ผมไม่ได้ Copy ซ้ำมาให้ทั้งหมด แต่คุณสามารถใช้ Block เดิมได้เลยครับ */}
                    {/* สิ่งที่ต้องแก้คือส่วน return หลัก และ Sidebar ด้านซ้ายที่มีปุ่ม Save Draft เพิ่มขึ้นมาครับ */}
                </div>
            </div>

            {isAddingPreGen && (
                <CharacterCreator
                    playerId="GM_DRAFT"
                    onSave={(data) => handleSavePreGen(data)}
                    onCancel={() => setIsAddingPreGen(false)}
                />
            )}
        </div>
    )
}

// --- Helper Components ---
const SidebarBtn = ({ label, active, onClick }: any) => (
    <button
        onClick={onClick}
        className={`w-full text-left px-6 py-4 rounded-xl text-base font-bold transition-all duration-200 border border-transparent ${active ? 'bg-slate-800 text-amber-500 border-slate-700 shadow-inner' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}
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

const EmptyState = ({ message }: any) => (
    <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
        <p className="text-slate-500 text-lg">{message}</p>
    </div>
)