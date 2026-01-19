import { useState, useEffect, useRef } from 'react'
import { rollD4RnR, RnRRollResult, getRnRIcon } from '@/lib/rnr-dice'

interface RnRRollerProps {
    baseStats: number
    characterName: string
    availableWillPower: number // ✅ เพิ่ม: WILL Power ที่มี
    onComplete: (totalScore: number, steps: RnRRollResult[][], willUsed: number) => void
    onCancel: () => void
    onStepUpdate: (currentTotal: number, steps: RnRRollResult[][]) => void
}

export default function RnRRoller({ baseStats, characterName, availableWillPower, onComplete, onCancel, onStepUpdate }: RnRRollerProps) {
    const [steps, setSteps] = useState<RnRRollResult[][]>([])
    const [currentDicePool, setCurrentDicePool] = useState(5)
    const [isRolling, setIsRolling] = useState(false)
    const [finished, setFinished] = useState(false)
    const hasRolledRef = useRef(false)
    const completedRef = useRef(false) // ✅ ป้องกันเรียก onComplete ซ้ำ
    const [willBoost, setWillBoost] = useState(0) // ✅ เพิ่ม: WILL Power ที่จะใช้

    // คำนวณคะแนนรวมทั้งหมด (รวม WILL Power)
    const calculateTotal = (currentSteps: RnRRollResult[][]) => {
        return currentSteps.flat().reduce((acc, curr) => acc + curr.score, 0) + baseStats + willBoost
    }

    const handleRoll = () => {
        setIsRolling(true)

        // หน่วงเวลานิดหน่อยให้ดูเหมือนกำลังทอย (Animation feel)
        setTimeout(() => {
            const newRolls: RnRRollResult[] = []
            let nextPool = 0

            for (let i = 0; i < currentDicePool; i++) {
                const result = rollD4RnR()
                newRolls.push(result)
                if (result.triggersReroll) nextPool++
            }

            setSteps(prev => {
                const updatedSteps = [...prev, newRolls]
                const currentTotal = calculateTotal(updatedSteps)

                // 📡 ส่ง Live Update ไปให้ GM Board
                onStepUpdate(currentTotal, updatedSteps)

                // ✅ Auto-Confirm Logic: ถ้าไม่มีเต๋าให้ทอยต่อ จบเลย
                if (nextPool === 0) {
                    setFinished(true)
                    setIsRolling(false)
                    // รอ 1.5 วิ ให้ผู้เล่นเห็นผลลัพธ์สุดท้ายก่อนปิด
                    setTimeout(() => {
                        // ✅ ป้องกันเรียกซ้ำ
                        if (!completedRef.current) {
                            completedRef.current = true
                            onComplete(currentTotal, updatedSteps, willBoost)
                        }
                    }, 1500)
                }

                return updatedSteps
            })

            if (nextPool > 0) {
                setCurrentDicePool(nextPool)
                setIsRolling(false)
            }
        }, 600)
    }

    // ❌ ลบ Auto Roll - ให้ user กดปุ่มเอง
    // useEffect(() => {
    //     if (!hasRolledRef.current && steps.length === 0) {
    //         hasRolledRef.current = true
    //         handleRoll()
    //     }
    // }, [])

    const currentDiceScore = steps.flat().reduce((acc, curr) => acc + curr.score, 0)
    const totalScore = currentDiceScore + baseStats + willBoost // ✅ รวม WILL Power

    return (
        <div className="fixed inset-0 bg-black/95 z-[60] flex flex-col items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-md bg-slate-900 border-2 border-amber-500 rounded-2xl p-6 shadow-[0_0_50px_rgba(245,158,11,0.2)] relative">

                {/* Header */}
                <div className="text-center mb-6 border-b border-slate-800 pb-4">
                    <h2 className="text-2xl font-black text-white uppercase tracking-widest">Role & Roll</h2>
                    <p className="text-amber-500 text-sm font-bold">{characterName}</p>
                </div>

                {/* ✅ WILL Power Boost Input */}
                {!finished && steps.length === 0 && (
                    <div className="bg-slate-800 rounded-xl p-4 mb-4 border border-slate-700">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-slate-400 font-bold">⚡ WILL BOOST</span>
                            <span className="text-xs text-amber-400">Available: {availableWillPower}</span>
                        </div>
                        <input
                            type="number"
                            min="0"
                            max={availableWillPower}
                            value={willBoost}
                            onChange={(e) => setWillBoost(Math.min(Number(e.target.value), availableWillPower))}
                            className="w-full bg-slate-950 border border-slate-600 rounded-lg p-2 text-center text-white font-bold focus:border-amber-500 outline-none"
                            placeholder="0"
                        />
                        <div className="text-[10px] text-slate-500 mt-2">1 WILL = +1 to total score</div>
                    </div>
                )}

                {/* Dice Display Area */}
                <div className="space-y-4 mb-6 max-h-[40vh] overflow-y-auto custom-scrollbar">
                    {steps.map((step, stepIdx) => (
                        <div key={stepIdx} className="animate-in slide-in-from-left-4 duration-500">
                            <div className="text-[10px] text-slate-500 uppercase mb-1">Row {stepIdx + 1}</div>
                            <div className="flex flex-wrap gap-2">
                                {step.map((dice, diceIdx) => (
                                    <div
                                        key={diceIdx}
                                        className={`
                                            w-12 h-12 flex items-center justify-center rounded-lg border-2 shadow-lg transition-all bg-black overflow-hidden
                                            ${dice.face === 'R' ? 'border-red-600 animate-bounce z-10 scale-110' : 'border-slate-800'}
                                        `}
                                    >
                                        {dice.face === 'R' && <img src="/rnr-r-face.jpg" alt="R" className="w-full h-full object-cover" />}
                                        {dice.face === 'STAR' && <div className="w-4 h-4 bg-red-600 rounded-full shadow-[0_0_10px_rgba(220,38,38,1)]" />}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Score Summary */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-6 flex justify-between items-center">
                    <div className="text-xs text-slate-400">
                        <div>Dice Score: <span className="text-white font-bold">{currentDiceScore}</span></div>
                        <div>Status+WP: <span className="text-white font-bold">+{baseStats}</span></div>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] text-slate-500 uppercase font-bold">Total</div>
                        <div className="text-4xl font-black text-amber-500">{totalScore}</div>
                    </div>
                </div>

                {/* Actions */}
                {steps.length === 0 ? (
                    // ✅ ปุ่ม Start Roll (ครั้งแรก)
                    <button
                        onClick={handleRoll}
                        disabled={isRolling}
                        className={`w-full py-4 rounded-xl font-black text-lg uppercase tracking-widest transition-all
                            ${isRolling ? 'bg-slate-700 text-slate-500' : 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black shadow-lg shadow-amber-900/20 active:scale-95'}
                        `}
                    >
                        {isRolling ? 'Rolling...' : 'START ROLL (5D4)'}
                    </button>
                ) : !finished ? (
                    <div className="space-y-3">
                        <button
                            onClick={handleRoll}
                            disabled={isRolling}
                            className={`w-full py-4 rounded-xl font-black text-lg uppercase tracking-widest transition-all
                                ${isRolling ? 'bg-slate-700 text-slate-500' : 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black shadow-lg shadow-amber-900/20 active:scale-95'}
                            `}
                        >
                            {isRolling ? 'Rolling...' : `ROLL AGAIN (${currentDicePool}D4)`}
                        </button>
                    </div>
                ) : (
                    <div className="text-center text-emerald-500 font-bold animate-pulse text-sm uppercase tracking-wide">
                        ✨ Result Confirmed! ✨
                    </div>
                )}

                {/* ปุ่ม Cancel (เผื่อค้าง) */}
                {!finished && !isRolling && (
                    <button onClick={onCancel} className="absolute top-4 right-4 text-slate-600 hover:text-white">✕</button>
                )}
            </div>
        </div>
    )
}