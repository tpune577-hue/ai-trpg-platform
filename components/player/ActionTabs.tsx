'use client'

import { useState } from 'react'

interface Skill {
    id: string
    name: string
    description: string
    icon: string
    cooldown?: number
    manaCost?: number
}

interface Item {
    id: string
    name: string
    description: string
    icon: string
    quantity: number
}

interface ActionTabsProps {
    onAction: (action: {
        type: 'attack' | 'skill' | 'item'
        id: string
        name: string
        target?: string
    }) => void
    disabled?: boolean
}

const MOCK_SKILLS: Skill[] = [
    {
        id: 'fireball',
        name: 'Fireball',
        description: 'Launch a ball of fire at your enemies',
        icon: '🔥',
        manaCost: 15,
    },
    {
        id: 'heal',
        name: 'Healing Touch',
        description: 'Restore health to yourself or an ally',
        icon: '✨',
        manaCost: 10,
    },
    {
        id: 'shield',
        name: 'Magic Shield',
        description: 'Create a protective barrier',
        icon: '🛡️',
        manaCost: 12,
    },
    {
        id: 'lightning',
        name: 'Lightning Bolt',
        description: 'Strike with the power of thunder',
        icon: '⚡',
        manaCost: 20,
    },
]

const MOCK_ITEMS: Item[] = [
    {
        id: 'health-potion',
        name: 'Health Potion',
        description: 'Restores 50 HP',
        icon: '🧪',
        quantity: 3,
    },
    {
        id: 'mana-potion',
        name: 'Mana Potion',
        description: 'Restores 30 MP',
        icon: '💙',
        quantity: 2,
    },
    {
        id: 'smoke-bomb',
        name: 'Smoke Bomb',
        description: 'Create a cloud of smoke',
        icon: '💨',
        quantity: 1,
    },
]

export default function ActionTabs({ onAction, disabled = false }: ActionTabsProps) {
    const [activeTab, setActiveTab] = useState<'attack' | 'skills' | 'items'>('attack')

    const handleAction = (
        type: 'attack' | 'skill' | 'item',
        id: string,
        name: string
    ) => {
        if (disabled) return
        onAction({ type, id, name, target: 'enemy' })
    }

    return (
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border-2 border-amber-500/30 overflow-hidden shadow-2xl">
            {/* Tab Headers */}
            <div className="flex border-b border-slate-700/50 bg-slate-900/50">
                <button
                    onClick={() => setActiveTab('attack')}
                    className={`flex-1 py-4 px-4 font-bold text-sm uppercase tracking-wide transition-all ${activeTab === 'attack'
                            ? 'bg-gradient-to-b from-red-900/50 to-transparent text-red-400 border-b-2 border-red-500'
                            : 'text-gray-400 hover:text-gray-200 hover:bg-slate-800/50'
                        }`}
                >
                    <div className="flex items-center justify-center gap-2">
                        <span className="text-xl">⚔️</span>
                        <span>Attack</span>
                    </div>
                </button>

                <button
                    onClick={() => setActiveTab('skills')}
                    className={`flex-1 py-4 px-4 font-bold text-sm uppercase tracking-wide transition-all ${activeTab === 'skills'
                            ? 'bg-gradient-to-b from-purple-900/50 to-transparent text-purple-400 border-b-2 border-purple-500'
                            : 'text-gray-400 hover:text-gray-200 hover:bg-slate-800/50'
                        }`}
                >
                    <div className="flex items-center justify-center gap-2">
                        <span className="text-xl">✨</span>
                        <span>Skills</span>
                    </div>
                </button>

                <button
                    onClick={() => setActiveTab('items')}
                    className={`flex-1 py-4 px-4 font-bold text-sm uppercase tracking-wide transition-all ${activeTab === 'items'
                            ? 'bg-gradient-to-b from-blue-900/50 to-transparent text-blue-400 border-b-2 border-blue-500'
                            : 'text-gray-400 hover:text-gray-200 hover:bg-slate-800/50'
                        }`}
                >
                    <div className="flex items-center justify-center gap-2">
                        <span className="text-xl">🎒</span>
                        <span>Items</span>
                    </div>
                </button>
            </div>

            {/* Tab Content */}
            <div className="p-4 min-h-[400px] max-h-[500px] overflow-y-auto custom-scrollbar">
                {/* Attack Tab */}
                {activeTab === 'attack' && (
                    <div className="space-y-3">
                        <button
                            onClick={() => handleAction('attack', 'basic-attack', 'Basic Attack')}
                            disabled={disabled}
                            className="w-full p-6 bg-gradient-to-br from-red-900/30 to-red-800/20 hover:from-red-800/40 hover:to-red-700/30 border-2 border-red-500/50 rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                        >
                            <div className="flex items-center gap-4">
                                <div className="text-5xl">⚔️</div>
                                <div className="flex-1 text-left">
                                    <div className="text-xl font-bold text-white mb-1">Basic Attack</div>
                                    <div className="text-sm text-gray-300">
                                        Strike your enemy with your weapon
                                    </div>
                                </div>
                            </div>
                        </button>

                        <button
                            onClick={() => handleAction('attack', 'power-attack', 'Power Attack')}
                            disabled={disabled}
                            className="w-full p-6 bg-gradient-to-br from-orange-900/30 to-orange-800/20 hover:from-orange-800/40 hover:to-orange-700/30 border-2 border-orange-500/50 rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                        >
                            <div className="flex items-center gap-4">
                                <div className="text-5xl">💥</div>
                                <div className="flex-1 text-left">
                                    <div className="text-xl font-bold text-white mb-1">Power Attack</div>
                                    <div className="text-sm text-gray-300">
                                        A devastating blow with extra damage
                                    </div>
                                </div>
                            </div>
                        </button>
                    </div>
                )}

                {/* Skills Tab */}
                {activeTab === 'skills' && (
                    <div className="space-y-3">
                        {MOCK_SKILLS.map((skill) => (
                            <button
                                key={skill.id}
                                onClick={() => handleAction('skill', skill.id, skill.name)}
                                disabled={disabled}
                                className="w-full p-4 bg-gradient-to-br from-purple-900/30 to-purple-800/20 hover:from-purple-800/40 hover:to-purple-700/30 border-2 border-purple-500/50 rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="text-4xl">{skill.icon}</div>
                                    <div className="flex-1 text-left">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="text-lg font-bold text-white">{skill.name}</div>
                                            {skill.manaCost && (
                                                <div className="text-sm text-blue-400 font-semibold">
                                                    {skill.manaCost} MP
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-sm text-gray-300">{skill.description}</div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* Items Tab */}
                {activeTab === 'items' && (
                    <div className="space-y-3">
                        {MOCK_ITEMS.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => handleAction('item', item.id, item.name)}
                                disabled={disabled || item.quantity === 0}
                                className="w-full p-4 bg-gradient-to-br from-blue-900/30 to-blue-800/20 hover:from-blue-800/40 hover:to-blue-700/30 border-2 border-blue-500/50 rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="text-4xl">{item.icon}</div>
                                    <div className="flex-1 text-left">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="text-lg font-bold text-white">{item.name}</div>
                                            <div
                                                className={`text-sm font-semibold ${item.quantity > 0 ? 'text-emerald-400' : 'text-red-400'
                                                    }`}
                                            >
                                                x{item.quantity}
                                            </div>
                                        </div>
                                        <div className="text-sm text-gray-300">{item.description}</div>
                                    </div>
                                </div>
                            </button>
                        ))}

                        {MOCK_ITEMS.length === 0 && (
                            <div className="text-center py-12">
                                <div className="text-4xl mb-2">🎒</div>
                                <p className="text-gray-400">No items in inventory</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
