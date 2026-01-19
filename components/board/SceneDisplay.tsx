'use client'
/* eslint-disable @next/next/no-img-element */
import { useState, useEffect } from 'react'

interface NpcData {
    id: string
    name: string
    imageUrl: string
    type: 'FRIENDLY' | 'ENEMY' | 'NEUTRAL'
}

interface SceneDisplayProps {
    sceneDescription?: string
    imageUrl?: string
    npcs?: NpcData[]
}

export const SceneDisplay = ({ sceneDescription, imageUrl, npcs = [] }: SceneDisplayProps) => {

    // ✅ State สำหรับควบคุมการแสดงผลข้อความ
    const [showText, setShowText] = useState(true)

    // ✅ Effect: เมื่อข้อความเปลี่ยน ให้แสดงและเริ่มนับเวลาถอยหลังใหม่
    useEffect(() => {
        if (sceneDescription) {
            setShowText(true) // โชว์ทันทีเมื่อมีข้อความใหม่

            // ตั้งเวลา 30 วินาที (30000 ms) แล้วค่อยซ่อน
            const timer = setTimeout(() => {
                setShowText(false)
            }, 30000)

            return () => clearTimeout(timer) // ล้าง Timer เดิมถ้าข้อความเปลี่ยนก่อนหมดเวลา
        } else {
            // ถ้าไม่มีข้อความ ซ่อนทันที
            setShowText(false)
        }
    }, [sceneDescription])

    const getNpcGlow = (type: string) => {
        switch (type) {
            case 'FRIENDLY': return 'drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]'
            case 'ENEMY': return 'drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]'
            case 'NEUTRAL': default: return 'drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]'
        }
    }

    return (
        <div className="relative w-full h-full overflow-hidden bg-black group select-none">
            {/* 1. Background Image */}
            <div className="absolute inset-0 z-0">
                <img
                    src={imageUrl || "/images/placeholder.jpg"}
                    alt="Scene"
                    className="w-full h-full object-cover opacity-90 transition-transform duration-[20s] ease-linear scale-105 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/40"></div>
            </div>

            {/* 2. NPC Overlay Area */}
            {npcs.length > 0 && (
                <div className="absolute bottom-0 left-0 w-full flex justify-center items-end gap-4 md:gap-12 px-4 z-20 pointer-events-none">
                    {npcs.map((npc, index) => (
                        <div
                            key={npc.id}
                            className="flex flex-col items-center justify-end group/npc relative animate-in slide-in-from-bottom-10 fade-in duration-700"
                            style={{ animationDelay: `${index * 100}ms` }}
                        >
                            <div className="mb-2 px-2 py-0.5 bg-black/60 text-slate-200 text-[10px] font-bold rounded backdrop-blur-md border border-white/10 transition-opacity group-hover/npc:opacity-100 sm:opacity-60 shadow-lg whitespace-nowrap animate-bounce-slow">
                                {npc.name}
                            </div>
                            <div className="relative z-10 flex flex-col items-center">
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-[70%] h-3 bg-black/80 blur-md rounded-[100%] -z-10"></div>
                                <img
                                    src={npc.imageUrl}
                                    alt={npc.name}
                                    className={`
                                        max-h-[220px] md:max-h-[350px] w-auto object-contain 
                                        transition-all duration-300 group-hover/npc:scale-105 group-hover/npc:-translate-y-1
                                        ${getNpcGlow(npc.type)}
                                    `}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ✅ 3. Scene Description Text (เพิ่ม Animation Fade Out) */}
            <div className={`
                absolute bottom-2 left-2 right-2 md:bottom-4 md:left-4 md:right-4 z-30 pointer-events-none flex justify-center
                transition-opacity duration-1000 ease-in-out
                ${showText ? 'opacity-100' : 'opacity-0'} 
            `}>
                <div className="bg-black/60 backdrop-blur-md border border-amber-500/50 p-3 md:p-4 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] w-full max-w-3xl text-center transform transition-transform duration-500">
                    <h2 className="text-amber-500 font-bold text-xs md:text-sm uppercase tracking-widest mb-1 opacity-90">
                        Current Scene
                    </h2>
                    <p className="text-slate-200 text-sm md:text-base font-serif italic leading-relaxed line-clamp-3 drop-shadow-md">
                        {sceneDescription}
                    </p>
                </div>
            </div>

        </div>
    )
}