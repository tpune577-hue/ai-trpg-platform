import OpenAI from 'openai'
import { z } from 'zod'
import { zodResponseFormat } from 'openai/helpers/zod'

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
})

// Zod schema for structured AI response
const GameMasterResponseSchema = z.object({
    narration: z.string().describe('Dramatic narration of what happens in the scene'),
    hp_updates: z.array(
        z.object({
            target_id: z.string().describe('Character ID to update'),
            amount: z.number().describe('HP change amount (negative for damage, positive for healing)'),
            reason: z.string().describe('Brief reason for HP change'),
        })
    ).describe('Array of HP updates for affected characters'),
    new_scene_prompt: z.string().nullable().optional().describe('Optional prompt for generating a new scene background image'),
    dice_results: z.object({
        roll: z.number().describe('The dice roll result'),
        modifier: z.number().describe('Any modifiers applied'),
        total: z.number().describe('Final total (roll + modifier)'),
        success: z.boolean().describe('Whether the action succeeded'),
    }).nullable().optional().describe('Dice roll results if applicable'),
    status_effects: z.array(
        z.object({
            target_id: z.string(),
            effect: z.string().describe('Status effect name (e.g., "poisoned", "blessed")'),
            duration: z.number().describe('Duration in turns'),
        })
    ).nullable().optional().describe('Status effects to apply'),
})

export type GameMasterResponse = z.infer<typeof GameMasterResponseSchema>

// System prompt for the AI Game Master
const SYSTEM_PROMPT = `You are an expert Dungeon Master for a tabletop RPG game. Your role is to:

1. **Be Dramatic and Engaging**: Create vivid, immersive narration that brings the game world to life
2. **Be Fair but Challenging**: Balance difficulty to keep players engaged without being unfair
3. **Follow D&D 5e Rules**: Use standard D&D mechanics for combat, skills, and checks
4. **React to Player Actions**: Describe outcomes based on dice rolls and player choices
5. **Maintain Consistency**: Keep track of the game state and maintain narrative coherence
6. **Create Consequences**: Player actions should have meaningful impacts on the story

**Tone Guidelines**:
- Use descriptive, cinematic language
- Build tension and suspense
- Celebrate player successes dramatically
- Make failures interesting, not just punishing
- Include sensory details (sights, sounds, smells)

**Combat Guidelines**:
- Standard attack: d20 + modifiers vs AC
- Critical hit on natural 20 (double damage)
- Critical miss on natural 1 (describe dramatic failure)
- Damage varies by weapon/spell
- Consider environmental factors

**Narration Structure**:
1. Describe the action attempt
2. Reveal the dice roll result
3. Describe the outcome dramatically
4. Set up the next moment

Remember: You must ONLY output valid JSON matching the schema. No additional text.`

interface GameState {
    currentScene: string
    characters: Array<{
        id: string
        name: string
        hp: number
        maxHp: number
        ac: number
        class: string
        level: number
    }>
    enemies?: Array<{
        id: string
        name: string
        hp: number
        maxHp: number
        ac: number
    }>
    environment?: string
    recentEvents?: string[]
}

interface PlayerAction {
    actionType: 'attack' | 'skill' | 'item' | 'move' | 'talk' | 'custom'
    actorId: string
    actorName: string
    targetId?: string
    targetName?: string
    skillName?: string
    itemName?: string
    description: string
    metadata?: Record<string, any>
}

/**
 * Process a game turn using AI Game Master
 * @param currentState Current game state
 * @param playerAction Player's action
 * @returns AI-generated game master response
 */
export async function processGameTurn(
    currentState: GameState,
    playerAction: PlayerAction,
    actorStats?: CharacterStats
): Promise<GameMasterResponse> {
    try {
        // Find actor and target
        const actor = currentState.characters.find((c) => c.id === playerAction.actorId)
        const target = playerAction.targetId
            ? [...(currentState.characters || []), ...(currentState.enemies || [])].find(
                (c) => c.id === playerAction.targetId
            )
            : null

        // Simulate dice roll with character stats
        const diceRoll = rollDice(playerAction.actionType, actorStats, playerAction.skillName)

        // Construct user prompt with context
        const userPrompt = `
**Current Scene**: ${currentState.currentScene}

**Characters in Scene**:
${currentState.characters.map((c) => `- ${c.name} (${c.class} Lv${c.level}): ${c.hp}/${c.maxHp} HP, AC ${c.ac}`).join('\n')}

${currentState.enemies && currentState.enemies.length > 0 ? `**Enemies**:
${currentState.enemies.map((e) => `- ${e.name}: ${e.hp}/${e.maxHp} HP, AC ${e.ac}`).join('\n')}` : ''}

${currentState.environment ? `**Environment**: ${currentState.environment}` : ''}

${currentState.recentEvents && currentState.recentEvents.length > 0 ? `**Recent Events**:
${currentState.recentEvents.map((e, i) => `${i + 1}. ${e}`).join('\n')}` : ''}

---

**Player Action**:
- **Actor**: ${playerAction.actorName} (${actor?.class || 'Unknown'})
- **Action Type**: ${playerAction.actionType}
- **Description**: ${playerAction.description}
${playerAction.targetName ? `- **Target**: ${playerAction.targetName}` : ''}
${playerAction.skillName ? `- **Skill**: ${playerAction.skillName}` : ''}
${playerAction.itemName ? `- **Item**: ${playerAction.itemName}` : ''}

**Dice Roll**: d20 = ${diceRoll.roll} + ${diceRoll.modifier} = ${diceRoll.total}
${target ? `**Target AC**: ${target.ac}` : ''}

---

**Instructions**:
1. Determine if the action succeeds based on the dice roll
2. Calculate damage/healing if applicable (use appropriate dice for the action)
3. Create dramatic narration describing what happens
4. Update HP for affected characters
5. If the scene changes significantly, provide a new_scene_prompt for image generation

Respond with JSON only.`

        // Call OpenAI with structured output
        const completion = await (openai.beta as any).chat.completions.parse({
            model: 'gpt-4o-2024-08-06', // Model that supports structured outputs
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: userPrompt },
            ],
            response_format: zodResponseFormat(GameMasterResponseSchema, 'game_master_response'),
            temperature: 0.8, // Higher temperature for more creative narration
            max_tokens: 1000,
        }) as any // Fix legacy type definition

        const response = completion.choices[0].message.parsed

        if (!response) {
            throw new Error('Failed to parse AI response')
        }

        // Add dice results to response
        return {
            ...response,
            dice_results: {
                roll: diceRoll.roll,
                modifier: diceRoll.modifier,
                total: diceRoll.total,
                success: target ? diceRoll.total >= target.ac : true,
            },
        }
    } catch (error) {
        console.error('AI Game Master error:', error)

        // Use the same dice logic even for fallback
        const fallbackDice = rollDice(playerAction.actionType, actorStats, playerAction.skillName)

        // Fallback response if AI fails
        return {
            narration: `${playerAction.actorName} attempts ${playerAction.description}. The outcome is uncertain... (AI Offline)`,
            hp_updates: [],
            new_scene_prompt: null,
            status_effects: [],
            dice_results: {
                roll: fallbackDice.roll,
                modifier: fallbackDice.modifier,
                total: fallbackDice.total,
                success: Math.random() > 0.5, // Random success if target AC unknown
            },
        }
    }
}

/**
 * D&D 5e Character Stats Interface
 */
interface CharacterStats {
    strength?: number
    dexterity?: number
    constitution?: number
    intelligence?: number
    wisdom?: number
    charisma?: number
}

/**
 * Calculate D&D 5e ability modifier from stat value
 * Formula: floor((statValue - 10) / 2)
 */
function calculateModifier(statValue: number): number {
    return Math.floor((statValue - 10) / 2)
}

/**
 * Simulate dice roll with stat-based modifiers
 * @param actionType Type of action being performed
 * @param actorStats Character's ability scores
 * @param skillName Optional skill name for specific checks
 * @returns Dice roll result with appropriate modifier
 */
function rollDice(
    actionType: string,
    actorStats?: CharacterStats,
    skillName?: string
): { roll: number; modifier: number; total: number; statUsed?: string } {
    const roll = Math.floor(Math.random() * 20) + 1

    // Default stats if not provided
    const stats: CharacterStats = actorStats || {
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
    }

    let modifier = 0
    let statUsed = 'none'

    // Determine which stat to use based on action type
    switch (actionType) {
        case 'attack':
            // Use higher of STR or DEX for attack rolls
            const strMod = calculateModifier(stats.strength || 10)
            const dexMod = calculateModifier(stats.dexterity || 10)
            modifier = Math.max(strMod, dexMod)
            statUsed = strMod >= dexMod ? 'STR' : 'DEX'
            break

        case 'skill':
            // Determine stat based on skill name
            if (skillName) {
                const skillLower = skillName.toLowerCase()

                // Intelligence-based skills (Arcana, Investigation, etc.)
                if (skillLower.includes('fire') || skillLower.includes('ice') ||
                    skillLower.includes('lightning') || skillLower.includes('arcane') ||
                    skillLower.includes('magic')) {
                    modifier = calculateModifier(stats.intelligence || 10)
                    statUsed = 'INT'
                }
                // Wisdom-based skills (Heal, Perception, etc.)
                else if (skillLower.includes('heal') || skillLower.includes('cure') ||
                    skillLower.includes('bless') || skillLower.includes('divine')) {
                    modifier = calculateModifier(stats.wisdom || 10)
                    statUsed = 'WIS'
                }
                // Charisma-based skills (Persuasion, Deception, etc.)
                else if (skillLower.includes('charm') || skillLower.includes('persuade')) {
                    modifier = calculateModifier(stats.charisma || 10)
                    statUsed = 'CHA'
                }
                // Default to Intelligence for generic spells
                else {
                    modifier = calculateModifier(stats.intelligence || 10)
                    statUsed = 'INT'
                }
            } else {
                // Default to Intelligence if no skill specified
                modifier = calculateModifier(stats.intelligence || 10)
                statUsed = 'INT'
            }
            break

        case 'move':
            // Dexterity for movement/acrobatics
            modifier = calculateModifier(stats.dexterity || 10)
            statUsed = 'DEX'
            break

        case 'talk':
            // Charisma for social interactions
            modifier = calculateModifier(stats.charisma || 10)
            statUsed = 'CHA'
            break

        case 'item':
            // No modifier for using items
            modifier = 0
            statUsed = 'none'
            break

        default:
            // Generic check uses Wisdom
            modifier = calculateModifier(stats.wisdom || 10)
            statUsed = 'WIS'
            break
    }

    return {
        roll,
        modifier,
        total: roll + modifier,
        statUsed,
    }
}

/**
 * Generate a scene image using DALL-E (optional)
 */
export async function generateSceneImage(prompt: string): Promise<string | null> {
    try {
        const response = await openai.images.generate({
            model: 'dall-e-3',
            prompt: `Fantasy RPG scene: ${prompt}. Dark, atmospheric, cinematic lighting. High quality digital art.`,
            size: '1792x1024',
            quality: 'standard',
            n: 1,
        })

        return response.data?.[0]?.url || null
    } catch (error) {
        console.error('Image generation error:', error)
        return null
    }
}
