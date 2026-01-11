/* eslint-disable @next/next/no-img-element */
import React from 'react'

export const SceneDisplay = ({ sceneDescription, imageUrl }: { sceneDescription: string, imageUrl?: string }) => {
    return (
        <div className="relative w-full h-full bg-slate-900 overflow-hidden group">
            {/* Background Image with Gradient Fade */}
            <img
                src={imageUrl || "https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?q=80&w=2574"}
                alt="Scene"
                className="w-full h-full object-cover opacity-60 group-hover:opacity-50 transition-all duration-1000 scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />

            {/* Title Overlay */}
            <div className="absolute top-6 w-full text-center">
                <div className="inline-block border-b-2 border-amber-500/50 pb-2">
                    <h2 className="text-2xl font-bold text-amber-500 tracking-[0.2em] uppercase text-shadow-glow">The Misty Forest</h2>
                </div>
            </div>

            {/* Text Description Overlay (เหมือนในรูป) */}
            <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 w-3/4">
                <div className="relative bg-slate-900/80 backdrop-blur-md border border-amber-500/30 p-6 rounded-lg shadow-2xl">
                    {/* Decorative Corners */}
                    <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-amber-500"></div>
                    <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-amber-500"></div>
                    <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-amber-500"></div>
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-amber-500"></div>

                    <p className="text-lg text-amber-100/90 text-center font-serif leading-relaxed italic">
                        "{sceneDescription || 'The adventure awaits...'}"
                    </p>
                </div>
            </div>
        </div>
    )
}