import { describe, it, expect, vi } from 'vitest'
import { processGameTurn } from '@/lib/ai-game-master'

// Mock OpenAI
vi.mock('openai', () => {
    return {
        default: class OpenAI {
            beta = {
                chat: {
                    completions: {
                        parse: vi.fn().mockResolvedValue({
                            choices: [{
                                message: {
                                    parsed: {
                                        narration: 'Test narration',
                                        hp_updates: [],
                                    }
                                }
                            }]
                        })
                    }
                }
            }
            images = {
                generate: vi.fn()
            }
        }
    }
})

// We need to test the internal rollDice function, but it's not exported.
// We can test it indirectly via processGameTurn return value which includes dice_results.

describe('AI Game Master Logic', () => {
    const mockGameState = {
        currentScene: 'Test Scene',
        characters: [{
            id: 'char-1',
            name: 'Hero',
            hp: 20,
            maxHp: 20,
            ac: 15,
            class: 'Fighter',
            level: 1
        }],
        recentEvents: []
    }

    it('calculates Strength modifier correctly for Attack', async () => {
        const stats = { strength: 16, dexterity: 10 } // Str 16 -> +3
        const action = {
            actionType: 'attack' as const,
            actorId: 'char-1',
            actorName: 'Hero',
            description: 'Attack',
            targetId: 'enemy-1'
        }

        const result = await processGameTurn(mockGameState, action, stats)

        expect(result.dice_results).toBeDefined()
        expect(result.dice_results?.modifier).toBe(3) // (16-10)/2 = 3
    })

    it('calculates Dexterity modifier correctly for Attack (Finesse)', async () => {
        const stats = { strength: 8, dexterity: 18 } // Dex 18 -> +4
        const action = {
            actionType: 'attack' as const,
            actorId: 'char-1',
            actorName: 'Hero',
            description: 'Attack',
            targetId: 'enemy-1'
        }

        const result = await processGameTurn(mockGameState, action, stats)

        expect(result.dice_results).toBeDefined()
        expect(result.dice_results?.modifier).toBe(4) // Uses higher stat (Dex)
    })

    it('calculates Intelligence modifier for Magic Skills', async () => {
        const stats = { intelligence: 14 } // Int 14 -> +2
        const action = {
            actionType: 'skill' as const,
            actorId: 'char-1',
            actorName: 'Hero',
            description: 'Cast Fireball',
            skillName: 'Fireball'
        }

        const result = await processGameTurn(mockGameState, action, stats)

        expect(result.dice_results?.modifier).toBe(2)
    })

    it('defaults to 0 modifier if stats missing', async () => {
        const stats = { strength: 10 } // +0
        const action = {
            actionType: 'attack' as const,
            actorId: 'char-1',
            actorName: 'Hero',
            description: 'Attack'
        }

        const result = await processGameTurn(mockGameState, action, stats)

        expect(result.dice_results?.modifier).toBe(0)
    })
})
