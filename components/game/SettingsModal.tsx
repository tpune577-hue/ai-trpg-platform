'use client'

import { useState, useEffect } from 'react'

// ✅ 1. สร้าง Interface เพื่อระบุประเภทข้อมูล
interface VolumeSliderProps {
    label: string
    value: number
    onChange: (value: number) => void
}

interface SettingsModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const [volumes, setVolumes] = useState({ master: 1.0, bgm: 0.8, sfx: 1.0 })

    useEffect(() => {
        const saved = localStorage.getItem('rnr_audio_settings')
        if (saved) setVolumes(JSON.parse(saved))
    }, [isOpen])

    const handleChange = (key: string, val: number) => {
        const newVol = { ...volumes, [key]: val }
        setVolumes(newVol)
        localStorage.setItem('rnr_audio_settings', JSON.stringify(newVol))
        // Dispatch event บอก AudioManager ให้ปรับเสียงทันที
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('audio-settings-changed'))
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white">✕</button>
                <h2 className="text-xl font-bold text-white mb-6">Settings</h2>

                <div className="space-y-6">
                    {/* ✅ ตอนนี้ TypeScript จะรู้แล้วว่า v คือ number */}
                    <VolumeSlider label="Master Volume" value={volumes.master} onChange={(v) => handleChange('master', v)} />
                    <VolumeSlider label="Music (BGM)" value={volumes.bgm} onChange={(v) => handleChange('bgm', v)} />
                    <VolumeSlider label="Sound Effects (SFX)" value={volumes.sfx} onChange={(v) => handleChange('sfx', v)} />
                </div>
            </div>
        </div>
    )
}

// ✅ 2. ระบุ Type ให้ Component นี้
function VolumeSlider({ label, value, onChange }: VolumeSliderProps) {
    return (
        <div>
            <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
                <span>{label}</span>
                <span>{Math.round(value * 100)}%</span>
            </div>
            <input
                type="range" min="0" max="1" step="0.05"
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
        </div>
    )
}