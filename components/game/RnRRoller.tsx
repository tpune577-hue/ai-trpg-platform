import { useState, useEffect, useRef } from 'react'
import { rollD4RnR, RnRRollResult } from '@/lib/rnr-dice'

interface RnRRollerProps {
    attributeValue: number
    attributeName?: string  // ✅ Optional: Name of attribute being used
    availableAbilities?: { name: string; value: number }[]  // ✅ List of abilities player can choose from
    characterName: string
    availableWillPower: number
    onComplete: (totalScore: number, steps: RnRRollResult[][], willUsed: number) => void
    onCancel: () => void
    onStepUpdate: (currentTotal: number, steps: RnRRollResult[][]) => void
}

export default function RnRRoller({ attributeValue, attributeName, availableAbilities = [], characterName, availableWillPower, onComplete, onCancel, onStepUpdate }: RnRRollerProps) {
    const [steps, setSteps] = useState<RnRRollResult[][]>([])
    const [currentDicePool, setCurrentDicePool] = useState(0)
    const [isRolling, setIsRolling] = useState(false)
    const [finished, setFinished] = useState(false)
    const [willBoost, setWillBoost] = useState(0)
    const [selectedAbility, setSelectedAbility] = useState<{ name: string; value: number } | null>(null) // ✅ Selected ability
    const completedRef = useRef(false)

    // ✅ Logic Fix: ป้องกัน NaN
    const safeAttr = Number(attributeValue) || 0
    const safeAbil = Number(selectedAbility?.value) || 0 // ✅ Use selected ability value

    // ✅ คำนวณ Dice Pool
    useEffect(() => {
        setCurrentDicePool(5 + safeAttr)
    }, [safeAttr])

    const calculateTotal = (currentSteps: RnRRollResult[][]) => {
        const diceScore = currentSteps.flat().reduce((acc, curr) => acc + curr.score, 0)
        return diceScore + safeAbil + (Number(willBoost) || 0)
    }

    const handleRoll = () => {
        setIsRolling(true)

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
                onStepUpdate(currentTotal, updatedSteps)

                if (nextPool === 0) {
                    setFinished(true)
                    setIsRolling(false)
                    setTimeout(() => {
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

    const currentDiceScore = steps.flat().reduce((acc, curr) => acc + curr.score, 0)
    // ✅ Logic Fix: ป้องกัน NaN ตอน render
    const totalScore = currentDiceScore + safeAbil + (Number(willBoost) || 0)

    return (
        <div className="fixed inset-0 bg-black/95 z-[60] flex flex-col items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-md bg-slate-900 border-2 border-amber-500 rounded-2xl p-6 shadow-[0_0_50px_rgba(245,158,11,0.2)] relative">

                <div className="text-center mb-6 border-b border-slate-800 pb-4">
                    <h2 className="text-2xl font-black text-white uppercase tracking-widest">Role & Roll</h2>
                    <p className="text-amber-500 text-sm font-bold">{characterName}</p>
                    <div className="text-[10px] text-slate-400 mt-1">
                        Base (5) + {attributeName || 'Attr'} ({safeAttr}) = <span className="text-white font-bold">{5 + safeAttr} Dice</span>
                    </div>
                </div>

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
                        />
                    </div>
                )}

                {/* ✅ Dice Display (ใช้ Design เดิม: รูปภาพ + Animation) */}
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
                                        {/* ใช้รูป R Face และลูกแก้วสีแดงเหมือนเดิม */}
                                        {dice.face === 'R' && <img src="/rnr-r-face.jpg" alt="R" className="w-full h-full object-cover" />}
                                        {dice.face === 'STAR' && <div className="w-4 h-4 bg-red-600 rounded-full shadow-[0_0_10px_rgba(220,38,38,1)]" />}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Summary */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-6 flex justify-between items-center">
                    <div className="text-xs text-slate-400">
                        <div>Dice Score: <span className="text-white font-bold">{currentDiceScore}</span></div>
                        <div>{selectedAbility?.name || 'Ability'}: <span className="text-white font-bold">+{safeAbil}</span></div>
                        <div>Will Power: <span className="text-white font-bold">+{willBoost}</span></div>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] text-slate-500 uppercase font-bold">Total</div>
                        <div className="text-4xl font-black text-amber-500">
                            {isNaN(totalScore) ? 0 : totalScore}
                        </div>
                    </div>
                </div>

                {/* ✅ Ability Selector (before first roll) */}
                {!finished && steps.length === 0 && availableAbilities.filter(a => a.value > 0).length > 0 && (
                    <div className="bg-slate-800 rounded-xl p-4 mb-4 border border-slate-700">
                        <label className="text-xs text-slate-400 font-bold mb-2 block uppercase tracking-wider">
                            Select Ability (Optional)
                        </label>
                        <select
                            value={selectedAbility?.name || ''}
                            onChange={(e) => {
                                const ability = availableAbilities.find(a => a.name === e.target.value)
                                setSelectedAbility(ability || null)
                            }}
                            className="w-full bg-slate-950 border border-slate-600 rounded-lg p-2 text-white text-sm focus:border-amber-500 outline-none"
                        >
                            <option value="">None (No Bonus)</option>
                            {availableAbilities
                                .filter(ability => ability.value > 0) // ✅ Only show abilities with value > 0
                                .map(ability => (
                                    <option key={ability.name} value={ability.name}>
                                        {ability.name} (+{ability.value})
                                    </option>
                                ))}
                        </select>
                    </div>
                )}

                {/* Button */}
                {steps.length === 0 ? (
                    <button
                        onClick={handleRoll}
                        disabled={isRolling || finished} // ✅ Removed ability requirement
                        className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 disabled:from-slate-700 disabled:to-slate-600 text-black disabled:text-slate-500 font-black py-4 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3"
                    >
                        {isRolling ? 'Rolling...' : `ROLL (${currentDicePool} DICE)`}
                    </button>
                ) : !finished && (
                    <button onClick={handleRoll} disabled={isRolling} className="w-full py-4 rounded-xl font-black text-lg uppercase tracking-widest bg-slate-700 text-white">
                        {isRolling ? 'Rolling...' : `REROLL (${currentDicePool} DICE)`}
                    </button>
                )}

                {!finished && !isRolling && <button onClick={onCancel} className="absolute top-4 right-4 text-slate-500">✕</button>}
            </div>
        </div>
    )
}