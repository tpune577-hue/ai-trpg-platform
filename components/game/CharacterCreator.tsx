'use client'

import { useState } from 'react'

// --- CONFIG: Role & Roll Attributes ---
const RR_ATTRIBUTES = {
    Body: ['Strength', 'Dexterity', 'Toughness'],
    Intelligence: ['Intellect', 'Aptitude', 'Sanity'],
    Personality: ['Charm', 'Rhetoric', 'Ego']
}

const RR_ABILITIES = {
    Academic: ['General Education', 'Search', 'History', 'Art', 'Medicine', 'First Aid', 'Law', 'Electronic', 'Mechanical'],
    Intuition: ['Occult', 'Perception', 'Hide & Sneak', 'Persuade', 'Consider', 'Empathy', 'Intimidate', 'Survival'],
    Physical: ['Climb', 'Stealth', 'Brawl', 'Weapons', 'Sword Play', 'Throwing', 'Reflex', 'Athlete']
}

interface CharacterCreatorProps {
    playerId: string
    initialName?: string
    onSave: (data: any) => void
    onCancel: () => void
}

export default function CharacterCreator({ playerId, initialName, onSave, onCancel }: CharacterCreatorProps) {
    const [sheetType, setSheetType] = useState<'STANDARD' | 'ROLE_AND_ROLL'>('STANDARD')
    const [isSaving, setIsSaving] = useState(false)

    // State รวมสำหรับเก็บค่าทุกอย่าง
    const [formData, setFormData] = useState<any>({
        name: initialName || 'Adventurer',
        imageUrl: '',
        description: '',
        // Standard Values
        hp: 20, mp: 10, wp: 5, str: 10, dex: 10, int: 10,
        // Role & Roll Values (Vitals)
        rr_willPower: 3, rr_health: 10, rr_mental: 5
    })

    const handleChange = (key: string, value: any) => {
        setFormData((prev: any) => ({ ...prev, [key]: value }))
    }

    const handleSaveClick = async () => {
        setIsSaving(true)

        let payload: any = {
            name: formData.name,
            sheetType: sheetType,
            imageUrl: formData.imageUrl,
            data: {}
        }

        if (sheetType === 'STANDARD') {
            payload.data = {
                description: formData.description,
                imageUrl: formData.imageUrl,
                stats: {
                    hp: formData.hp, maxHp: formData.hp,
                    mp: formData.mp, maxMp: formData.mp,
                    willPower: formData.wp,
                    str: formData.str, dex: formData.dex, int: formData.int
                }
            }
        } else {
            const attributes: any = {}
            const abilities: any = {}

            Object.values(RR_ATTRIBUTES).flat().forEach(attr => {
                const key = `rr_attr_${attr}`
                attributes[attr] = formData[key] || 1
            })

            Object.values(RR_ABILITIES).flat().forEach(abil => {
                const key = `rr_abil_${abil}`
                abilities[abil] = formData[key] || 0
            })

            payload.data = {
                imageUrl: formData.imageUrl,
                bio: {
                    name: formData.name,
                    description: formData.description
                },
                vitals: {
                    willPower: formData.rr_willPower,
                    health: formData.rr_health,
                    mental: formData.rr_mental
                },
                attributes: attributes,
                abilities: abilities
            }
        }

        await onSave(payload)
        setIsSaving(false)
    }

    return (
        <div className="fixed inset-0 bg-slate-950/95 z-[100] overflow-y-auto custom-scrollbar flex justify-center p-4 md:p-6">
            <div className="w-full max-w-6xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl my-2 md:my-8 p-6 md:p-8 animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-slate-700 pb-4 gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-amber-500 tracking-tight">Create Character</h2>
                        <p className="text-slate-400 text-sm mt-1">Setup your stats and abilities</p>
                    </div>
                    <button
                        onClick={onCancel}
                        className="self-end md:self-auto text-slate-500 hover:text-white text-3xl transition-transform hover:rotate-90"
                    >
                        &times;
                    </button>
                </div>

                {/* Template Selector */}
                <div className="mb-8 bg-slate-800 p-4 rounded-xl border border-slate-600 shadow-inner">
                    <label className="block text-xs font-bold text-amber-500 uppercase tracking-widest mb-2">System Template</label>
                    <div className="relative">
                        <select
                            value={sheetType}
                            onChange={(e) => setSheetType(e.target.value as any)}
                            className="w-full bg-slate-950 border-2 border-slate-700 rounded-lg p-3 text-white focus:border-amber-500 outline-none text-base font-bold appearance-none cursor-pointer hover:border-slate-500"
                        >
                            <option value="STANDARD">🌟 Standard RPG (Simple Stats)</option>
                            <option value="ROLE_AND_ROLL">🎲 Role & Roll (Dice Pool System)</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">▼</div>
                    </div>
                </div>

                {/* Common Fields */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
                    <div className="md:col-span-5 space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Character Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => handleChange('name', e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none placeholder-slate-600"
                                placeholder="Enter Name..."
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Avatar URL</label>
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    value={formData.imageUrl}
                                    onChange={e => handleChange('imageUrl', e.target.value)}
                                    placeholder="https://..."
                                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none placeholder-slate-600 text-sm"
                                />
                                <div className="w-12 h-12 bg-black rounded border border-slate-700 overflow-hidden shrink-0">
                                    {formData.imageUrl ? <img src={formData.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-600">No Img</div>}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-7">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={e => handleChange('description', e.target.value)}
                            className="w-full h-[126px] bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none resize-none leading-relaxed placeholder-slate-600 text-sm"
                            placeholder="Character backstory..."
                        />
                    </div>
                </div>

                <hr className="border-slate-800 mb-8" />

                {/* --- TEMPLATE: STANDARD --- */}
                {sheetType === 'STANDARD' && (
                    <div className="bg-slate-800/30 p-6 rounded-xl border border-slate-700 animate-in fade-in slide-in-from-bottom-4">
                        <h3 className="text-xl font-bold text-emerald-400 mb-4">📊 Base Status</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                            <StatBox label="HP" val={formData.hp} onChange={v => handleChange('hp', v)} color="red" size="large" />
                            <StatBox label="MP" val={formData.mp} onChange={v => handleChange('mp', v)} color="blue" size="large" />
                            <StatBox label="Will Power" val={formData.wp} onChange={v => handleChange('wp', v)} color="purple" size="large" />
                            <StatBox label="STR" val={formData.str} onChange={v => handleChange('str', v)} />
                            <StatBox label="DEX" val={formData.dex} onChange={v => handleChange('dex', v)} />
                            <StatBox label="INT" val={formData.int} onChange={v => handleChange('int', v)} />
                        </div>
                    </div>
                )}

                {/* --- TEMPLATE: ROLE & ROLL --- */}
                {sheetType === 'ROLE_AND_ROLL' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">

                        {/* Vitals (Single Line Layout) */}
                        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                            <h3 className="text-lg font-bold text-emerald-400 mb-4 flex items-center gap-2">❤️ Vitals</h3>

                            {/* ✅ ปรับเป็น Grid 3 Columns เพื่อให้อยู่บรรทัดเดียวกันแน่นอน และเต็มความกว้าง */}
                            <div className="grid grid-cols-3 gap-4 md:gap-8">
                                <StatBox label="Health" val={formData.rr_health} onChange={v => handleChange('rr_health', v)} color="red" size="compact" />
                                <StatBox label="Mental" val={formData.rr_mental} onChange={v => handleChange('rr_mental', v)} color="blue" size="compact" />
                                <StatBox label="Will Power" val={formData.rr_willPower} onChange={v => handleChange('rr_willPower', v)} color="purple" size="compact" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Attributes */}
                            <div className="bg-slate-800/30 p-6 rounded-xl border border-slate-700">
                                <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
                                    <h3 className="text-lg font-bold text-amber-400">Attributes</h3>
                                    <span className="text-[10px] bg-slate-900 text-slate-300 px-2 py-1 rounded border border-slate-600 font-mono">Points: 9</span>
                                </div>
                                <div className="space-y-6">
                                    {Object.entries(RR_ATTRIBUTES).map(([cat, attrs]) => (
                                        <div key={cat} className="bg-slate-900/40 p-3 rounded-lg border border-slate-800">
                                            <h4 className="text-[10px] font-black text-slate-500 uppercase mb-2">{cat}</h4>
                                            <div className="space-y-2">
                                                {attrs.map(attr => (
                                                    <DiceSlider key={attr} label={attr} value={formData[`rr_attr_${attr}`] || 1} onChange={v => handleChange(`rr_attr_${attr}`, v)} />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Abilities */}
                            <div className="bg-slate-800/30 p-6 rounded-xl border border-slate-700">
                                <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
                                    <h3 className="text-lg font-bold text-cyan-400">General Abilities</h3>
                                    <span className="text-[10px] bg-slate-900 text-slate-300 px-2 py-1 rounded border border-slate-600 font-mono">Points: 18</span>
                                </div>
                                <div className="space-y-6">
                                    {Object.entries(RR_ABILITIES).map(([cat, abils]) => (
                                        <div key={cat} className="bg-slate-900/40 p-3 rounded-lg border border-slate-800">
                                            <h4 className="text-[10px] font-black text-slate-500 uppercase mb-2">{cat}</h4>
                                            <div className="space-y-2">
                                                {abils.map(abil => (
                                                    <DiceSlider key={abil} label={abil} value={formData[`rr_abil_${abil}`] || 0} onChange={v => handleChange(`rr_abil_${abil}`, v)} />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer Buttons */}
                <div className="mt-8 pt-6 border-t border-slate-700 flex justify-end gap-3 sticky bottom-0 bg-slate-900/95 backdrop-blur py-4 -mb-4">
                    <button
                        onClick={onCancel}
                        className="px-6 py-3 rounded-lg text-slate-400 hover:text-white font-bold transition-colors hover:bg-slate-800 text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSaveClick}
                        disabled={isSaving}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8 py-3 rounded-lg shadow-lg hover:shadow-emerald-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2"
                    >
                        {isSaving ? 'Saving...' : 'SAVE CHARACTER'}
                    </button>
                </div>

            </div>
        </div>
    )
}

// --- Helper Components ---

const StatBox = ({ label, val, onChange, color = "white", size = "normal" }: any) => {
    const colors: any = { red: 'text-red-400', blue: 'text-blue-400', purple: 'text-purple-400', white: 'text-slate-200' }

    // ✅ Logic ปรับขนาด Compact
    const isCompact = size === 'compact'
    const isLarge = size === 'large'

    return (
        // ปรับให้ w-full เพื่อเต็มช่อง Grid
        <div className={`w-full bg-slate-950 rounded-lg border border-slate-700 flex flex-col items-center justify-center transition-all hover:border-${color === 'white' ? 'slate-500' : color.split('-')[1] + '-500'} ${isCompact ? 'p-3' : isLarge ? 'p-4' : 'p-2'}`}>
            <label className={`font-bold uppercase mb-1 ${colors[color] || colors.white} ${isCompact ? 'text-[10px]' : 'text-xs'}`}>{label}</label>
            <input
                type="number" value={val} onChange={e => onChange(Number(e.target.value))}
                className={`w-full bg-transparent text-center font-mono font-black text-white outline-none focus:text-amber-500 ${isCompact ? 'text-2xl' : isLarge ? 'text-3xl' : 'text-xl'}`}
            />
        </div>
    )
}

const DiceSlider = ({ label, value, onChange }: any) => (
    <div className="flex items-center justify-between group py-0.5">
        <label className="text-xs text-slate-400 group-hover:text-white transition-colors">{label}</label>
        <div className="flex items-center gap-3">
            <input
                type="range" min="0" max="6" step="1"
                value={value} onChange={e => onChange(Number(e.target.value))}
                className="w-20 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500 hover:accent-amber-400 transition-all"
            />
            <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold border transition-all ${value > 0 ? 'bg-amber-500 text-black border-amber-400 shadow-amber-500/20 shadow scale-110' : 'bg-slate-900 border-slate-700 text-slate-600'}`}>
                {value}
            </div>
        </div>
    </div>
)