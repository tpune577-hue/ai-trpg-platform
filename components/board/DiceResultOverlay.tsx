'use client'
import { getRnRIcon } from '@/lib/rnr-dice'

interface DiceResultOverlayProps {
    result: {
        actorName: string
        total: number
        details?: any[][] // สำหรับ RnR (Array of Rows)
        checkType?: string // สำหรับ D20 หรือชื่อท่า
        roll?: number      // สำหรับ D20
    }
    onClose?: () => void
}

export function DiceResultOverlay({ result, onClose }: DiceResultOverlayProps) {
    if (!result) return null

    const isRnR = Array.isArray(result.details) && result.details.length > 0

    console.log('🎲 DiceResultOverlay rendering:', { result, isRnR })

    return (
        <div
            className="absolute inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in duration-300"
            onClick={onClose}
        >
            <div className="w-full max-w-5xl p-4 md:p-8 text-center" onClick={e => e.stopPropagation()}>

                {/* 1. Header: Who is rolling? */}
                <div className="mb-8">
                    <h2 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-600 drop-shadow-sm animate-in slide-in-from-top-4">
                        {result.actorName}
                    </h2>
                    <p className="text-slate-400 text-lg uppercase tracking-widest font-bold mt-2 animate-in fade-in delay-150">
                        {isRnR ? 'Role & Roll Check' : result.checkType || 'Rolling...'}
                    </p>
                </div>

                {/* 2. Body: Dice Visualization */}
                <div className="min-h-[200px] flex flex-col items-center justify-center gap-6 mb-10">

                    {/* CASE A: Role & Roll (Grid Display) */}
                    {isRnR && result.details!.map((row: any[], rowIdx: number) => (
                        <div
                            key={rowIdx}
                            className="flex flex-wrap gap-3 md:gap-4 justify-center animate-in zoom-in duration-300 fill-mode-both"
                            style={{ animationDelay: `${rowIdx * 150}ms` }}
                        >
                            {/* Label บรรทัด */}
                            {result.details!.length > 1 && (
                                <div className="w-full text-[10px] text-slate-600 uppercase font-mono tracking-widest -mb-2">
                                    Row {rowIdx + 1}
                                </div>
                            )}

                            {/* Dice rendering */}
                            {row.map((dice: any, colIdx: number) => (
                                <div key={colIdx} className={`
                                    w-14 h-14 md:w-20 md:h-20 flex items-center justify-center rounded-xl md:rounded-2xl border-2 md:border-4 shadow-2xl transition-transform bg-black overflow-hidden
                                    ${dice.face === 'R' ? 'border-red-600 animate-bounce z-10 scale-110' : 'border-slate-800'}
                                `}>
                                    {dice.face === 'R' && <img src="/rnr-r-face.jpg" alt="R" className="w-full h-full object-cover" />}
                                    {dice.face === 'STAR' && <div className="w-4 h-4 md:w-6 md:h-6 bg-red-600 rounded-full shadow-[0_0_15px_rgba(220,38,38,1)]" />}
                                </div>
                            ))}
                        </div>
                    ))}

                    {/* CASE B: Standard D20 (Single Big Number) */}
                    {!isRnR && (
                        <div className="w-40 h-40 flex items-center justify-center bg-slate-900 border-4 border-amber-500 rounded-full shadow-[0_0_50px_rgba(245,158,11,0.3)] animate-in zoom-in duration-300">
                            <span className="text-8xl font-black text-white">{result.total}</span>
                        </div>
                    )}
                </div>

                {/* 3. Footer: Total Result */}
                <div className="animate-in slide-in-from-bottom-8 duration-500">
                    <div className="text-sm text-slate-500 font-bold uppercase tracking-[0.3em] mb-2">Current Result</div>
                    <div className="text-8xl md:text-9xl font-black text-white drop-shadow-[0_0_30px_rgba(245,158,11,0.6)] tabular-nums">
                        {result.total}
                    </div>
                </div>

            </div>
        </div>
    )
}