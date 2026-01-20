// Helper functions for R&R character stats

export interface RnRModifiers {
    attributeValue: number
    abilityValue: number
    attributeName: string
    abilityName: string
}

/**
 * Get appropriate attribute and ability modifiers for a given action
 * @param characterStats - R&R character stats object
 * @param actionType - Type of action being performed
 * @returns Object with attribute and ability values
 */
export function getRnRModifiersForAction(
    characterStats: any,
    actionType: string = 'attack'
): RnRModifiers {
    const attributes = characterStats?.attributes || {}
    const abilities = characterStats?.abilities || {}

    // Default mapping for common actions
    const actionMap: Record<string, { attr: string; abil: string }> = {
        'attack': { attr: 'Strength', abil: 'Brawl' },
        'shoot': { attr: 'Dexterity', abil: 'Weapons' },
        'melee': { attr: 'Strength', abil: 'Sword Play' },
        'throw': { attr: 'Dexterity', abil: 'Throwing' },
        'investigate': { attr: 'Intellect', abil: 'Search' },
        'search': { attr: 'Intellect', abil: 'Search' },
        'perceive': { attr: 'Intellect', abil: 'Perception' },
        'persuade': { attr: 'Charm', abil: 'Persuade' },
        'intimidate': { attr: 'Ego', abil: 'Intimidate' },
        'sneak': { attr: 'Dexterity', abil: 'Stealth' },
        'hide': { attr: 'Dexterity', abil: 'Hide & Sneak' },
        'climb': { attr: 'Strength', abil: 'Climb' },
        'athletics': { attr: 'Strength', abil: 'Athlete' },
        'reflex': { attr: 'Dexterity', abil: 'Reflex' },
        'medicine': { attr: 'Intellect', abil: 'Medicine' },
        'first_aid': { attr: 'Intellect', abil: 'First Aid' },
        'survival': { attr: 'Toughness', abil: 'Survival' },
        'empathy': { attr: 'Charm', abil: 'Empathy' },
    }

    // Get mapping or default to Strength + Brawl
    const mapping = actionMap[actionType.toLowerCase()] || { attr: 'Strength', abil: 'Brawl' }

    const attributeValue = Number(attributes[mapping.attr]) || 0
    const abilityValue = Number(abilities[mapping.abil]) || 0

    return {
        attributeValue,
        abilityValue,
        attributeName: mapping.attr,
        abilityName: mapping.abil
    }
}

/**
 * Get R&R modifiers for a specific stat check (e.g., "Strength Check")
 * @param characterStats - R&R character stats object
 * @param checkType - Type of check (e.g., "Strength Check", "Intellect Check")
 * @returns Object with attribute and ability values
 */
export function getRnRModifiersForCheck(
    characterStats: any,
    checkType: string
): RnRModifiers {
    const attributes = characterStats?.attributes || {}
    const abilities = characterStats?.abilities || {}

    // Extract attribute name from check type (e.g., "Strength Check" → "Strength")
    const attrName = checkType.replace(' Check', '').trim()

    // Map attributes to related abilities
    const attrToAbilityMap: Record<string, string> = {
        'Strength': 'Brawl',
        'Dexterity': 'Reflex',
        'Toughness': 'Survival',
        'Intellect': 'Search',
        'Aptitude': 'General Education',
        'Sanity': 'Occult',
        'Charm': 'Persuade',
        'Rhetoric': 'Persuade',
        'Ego': 'Intimidate',
    }

    const abilName = attrToAbilityMap[attrName] || 'Brawl'

    const attributeValue = Number(attributes[attrName]) || 0
    const abilityValue = Number(abilities[abilName]) || 0

    return {
        attributeValue,
        abilityValue,
        attributeName: attrName,
        abilityName: abilName
    }
}

/**
 * Get list of relevant abilities for a given attribute
 * Used for ability selector in R&R dice roller
 * @param characterStats - R&R character stats object
 * @param attributeName - Name of attribute (e.g., "Strength", "Intellect")
 * @returns Array of abilities with their values
 */
export function getRelevantAbilities(
    characterStats: any,
    attributeName: string
): { name: string; value: number }[] {
    const abilities = characterStats?.abilities || {}

    // Map attributes to related ability categories
    const attributeToAbilityMap: Record<string, string[]> = {
        'Strength': ['Brawl', 'Climb', 'Athlete'],
        'Dexterity': ['Stealth', 'Reflex', 'Throwing', 'Weapons'],
        'Toughness': ['Survival'],
        'Intellect': ['Search', 'General Education', 'History', 'Medicine', 'First Aid'],
        'Aptitude': ['Electronic', 'Mechanical', 'Art'],
        'Sanity': ['Occult'],
        'Charm': ['Persuade', 'Empathy'],
        'Rhetoric': ['Persuade'],
        'Ego': ['Intimidate']
    }

    const relevantAbilityNames = attributeToAbilityMap[attributeName] || []

    return relevantAbilityNames
        .filter(name => abilities[name] !== undefined)
        .map(name => ({
            name,
            value: Number(abilities[name]) || 0
        }))
}
