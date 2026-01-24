'use client'

import { useState } from 'react'
import { addCustomAsset } from '@/app/actions/quick-add'

interface Asset {
    id: string
    name: string
    imageUrl?: string
    avatarUrl?: string
    isCustom?: boolean // ✅ ตัวบอกว่าเป็นของชั่วคราว
}

interface QuickAssetPanelProps {
    sessionId: string
    scenes: Asset[] // รวมมาแล้ว (Campaign + Custom)
    npcs: Asset[]   // รวมมาแล้ว (Campaign + Custom)
    onSelect: (item: Asset, type: 'SCENE' | 'NPC') => void
}

export default function QuickAssetPanel({ sessionId, scenes, npcs, onSelect }: QuickAssetPanelProps) {
    // ยังคงแยก Tab ระหว่าง Scene กับ NPC เพราะการใช้งานต่างกัน (เปลี่ยนฉาก vs เสกตัวละคร)
    const [activeTab, setActiveTab] = useState<'SCENE' | 'NPC'>('SCENE')

    // State สำหรับ Modal
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [newName, setNewName] = useState('')
    const [newUrl, setNewUrl] = useState('')

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        await addCustomAsset(sessionId, activeTab, newName, newUrl)
        setIsSubmitting(false)
        setIsModalOpen(false)
        setNewName('')
        setNewUrl('')
    }

    // เลือกรายการที่จะโชว์ตาม Tab
    const displayItems = activeTab === 'SCENE' ? scenes : npcs

    return (
        <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800">

            {/* 1. Header & Tabs Toggle */}
            <div className="p-4 pb-2 border-b border-slate-800">
                <h2 className="text-amber-500 font-bold mb-3 text-sm uppercase tracking-wider">GM Toolbox</h2>

                {/* Toggle Switch */}
                <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                    <button
                        onClick={() => setActiveTab('SCENE')}
                        className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-2 ${activeTab === 'SCENE' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        <span>🌄</span> Scenes
                    </button>
                    <button
                        onClick={() => setActiveTab('NPC')}
                        className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-2 ${activeTab === 'NPC' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        <span>👤</span> NPCs
                    </button>
                </div>
            </div>

            {/* 2. Unified Grid (รวมของเก่าและใหม่ในที่เดียว) */}
            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                <div className="grid grid-cols-2 gap-3">

                    {/* ปุ่ม [+] Add New (อยู่ตัวแรกเสมอ) */}
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="aspect-square border-2 border-dashed border-slate-700 hover:border-green-500 hover:bg-slate-800/50 rounded-xl flex flex-col items-center justify-center group transition-all"
                    >
                        <div className="w-8 h-8 rounded-full bg-slate-800 group-hover:bg-green-500 flex items-center justify-center transition-colors mb-2">
                            <svg className="w-5 h-5 text-slate-400 group-hover:text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 group-hover:text-green-500">
                            Quick Add
                        </span>
                    </button>

                    {/* Render Items */}
                    {displayItems.map((item, idx) => (
                        <div
                            key={item.id || idx}
                            onClick={() => onSelect(item, activeTab)}
                            className={`
                relative aspect-square rounded-xl overflow-hidden cursor-pointer group transition-all
                border-2 
                ${item.isCustom
                                    ? 'border-green-500/70 shadow-[0_0_10px_rgba(34,197,94,0.2)]' // ✅ ของ Custom: ขอบเขียว + เรืองแสงนิดๆ
                                    : 'border-transparent hover:border-amber-500/50' // ✅ ของ Campaign: ไม่มีขอบ (หรือขอบใส)
                                }
              `}
                        >
                            <img
                                src={activeTab === 'SCENE' ? item.imageUrl : item.avatarUrl}
                                alt={item.name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                onError={(e) => (e.currentTarget.src = 'https://placehold.co/100x100?text=?')}
                            />

                            {/* Overlay ชื่อ */}
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent p-2 pt-6">
                                <p className="text-[10px] text-white font-medium truncate">{item.name}</p>

                                {/* Badge เล็กๆ บอกว่าเป็น Custom (Optional) */}
                                {item.isCustom && (
                                    <span className="text-[9px] text-green-400 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                        Temp
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 3. Modal (ยังคงเหมือนเดิม) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl p-6">
                        <h3 className="text-lg font-bold text-white mb-4">
                            Add Temporary {activeTab === 'SCENE' ? 'Scene' : 'NPC'}
                        </h3>
                        <form onSubmit={handleAdd} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase">Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:border-green-500 outline-none"
                                    placeholder="Name..."
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase">Image URL</label>
                                <input
                                    type="url"
                                    required
                                    value={newUrl}
                                    onChange={(e) => setNewUrl(e.target.value)}
                                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:border-green-500 outline-none"
                                    placeholder="https://..."
                                />
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-2 rounded-lg bg-slate-800 text-slate-300 font-bold hover:bg-slate-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 py-2 rounded-lg bg-green-600 text-white font-bold hover:bg-green-500 disabled:opacity-50"
                                >
                                    {isSubmitting ? '...' : 'Add'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}