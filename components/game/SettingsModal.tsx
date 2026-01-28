'use client'

import { useState, useEffect } from 'react'

interface VolumeSliderProps {
    label: string
    value: number
    onChange: (value: number) => void
}

interface SettingsModalProps {
    isOpen: boolean
    onClose: () => void
    // ✅ รับข้อมูลผู้เล่นเข้ามาโชว์
    playerData?: {
        name: string
        role: string
        image: string
    }
}

export default function SettingsModal({ isOpen, onClose, playerData }: SettingsModalProps) {
    const [volumes, setVolumes] = useState({ master: 1.0, bgm: 0.8, sfx: 1.0 })

    useEffect(() => {
        const saved = localStorage.getItem('rnr_audio_settings')
        if (saved) setVolumes(JSON.parse(saved))
    }, [isOpen])

    const handleChange = (key: string, val: number) => {
        const newVol = { ...volumes, [key]: val }
        setVolumes(newVol)
        localStorage.setItem('rnr_audio_settings', JSON.stringify(newVol))
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('audio-settings-changed'))
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            {/* Backdrop Click to Close */}
            <div className="absolute inset-0" onClick={onClose}></div>

            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-0 shadow-2xl relative overflow-hidden z-10">

                {/* 1. PROFILE HEADER */}
                <div className="bg-slate-800 p-6 flex flex-col items-center border-b border-slate-700">
                    <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">✕</button>

                    <div className="w-20 h-20 rounded-full border-4 border-slate-700 shadow-lg overflow-hidden mb-3">
                        <img
                            src={playerData?.image || '/placeholder.jpg'}
                            alt="Profile"
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <h2 className="text-xl font-bold text-white">{playerData?.name || 'Unknown Hero'}</h2>
                    <span className="text-xs font-bold text-amber-500 uppercase tracking-widest bg-slate-900 px-2 py-1 rounded mt-1">
                        {playerData?.role || 'PLAYER'}
                    </span>
                </div>

                {/* 2. SETTINGS BODY */}
                <div className="p-6 space-y-6">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
                        Audio Settings
                    </h3>

                    <VolumeSlider label="Master Volume" value={volumes.master} onChange={(v) => handleChange('master', v)} />
                    <VolumeSlider label="Music (BGM)" value={volumes.bgm} onChange={(v) => handleChange('bgm', v)} />
                    <VolumeSlider label="Sound Effects (SFX)" value={volumes.sfx} onChange={(v) => handleChange('sfx', v)} />
                </div>

                {/* 3. FOOTER (Optional Actions) */}
                <div className="bg-slate-950 p-4 text-center">
                    <button onClick={onClose} className="text-sm text-slate-400 hover:text-white underline">
                        Close Menu
                    </button>
                </div>
            </div>
        </div>
    )
}

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
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500 hover:accent-amber-400 transition-all"
            />
        </div>
    )
}