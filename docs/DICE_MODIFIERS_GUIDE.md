# Dynamic Dice Modifiers - D&D 5e Implementation

## Overview

The AI Game Master now uses **dynamic dice modifiers** based on character ability scores following D&D 5e rules. Instead of fixed modifiers, the system calculates modifiers from character stats (STR, DEX, CON, INT, WIS, CHA).

## How It Works

### Ability Score Modifier Formula

Following D&D 5e rules:

```
Modifier = floor((Ability Score - 10) / 2)
```

**Examples**:
- Strength 16 → Modifier +3
- Dexterity 14 → Modifier +2
- Intelligence 8 → Modifier -1
- Wisdom 10 → Modifier +0

### Stat Selection by Action Type

The system automatically selects the appropriate ability score based on the action:

| Action Type | Stat Used | Logic |
|------------|-----------|-------|
| **Attack** | STR or DEX | Uses higher of the two (finesse weapons) |
| **Skill** (Magic) | INT | Fire, Ice, Lightning, Arcane, Magic spells |
| **Skill** (Divine) | WIS | Heal, Cure, Bless, Divine spells |
| **Skill** (Social) | CHA | Charm, Persuade spells |
| **Skill** (Generic) | INT | Default for unspecified skills |
| **Move** | DEX | Movement, acrobatics, stealth |
| **Talk** | CHA | Social interactions, persuasion |
| **Item** | None | No modifier for using items |
| **Custom** | WIS | Generic wisdom check |

## Implementation

### Character Stats Structure

Character stats are stored in the `stats` JSONB field:

```json
{
  "hp": 45,
  "maxHp": 60,
  "ac": 15,
  "class": "Ranger",
  "strength": 16,
  "dexterity": 14,
  "constitution": 13,
  "intelligence": 10,
  "wisdom": 12,
  "charisma": 8
}
```

### Code Flow

1. **Player Action** → Server receives action
2. **Extract Stats** → Server gets character stats from database
3. **Calculate Modifier** → `rollDice()` calculates modifier based on relevant stat
4. **AI Processing** → AI receives dice roll with accurate modifier
5. **Narration** → AI generates outcome based on roll + modifier

### Example

**Character**: Aragorn the Ranger
- Strength: 16 (+3)
- Dexterity: 14 (+2)
- Intelligence: 10 (+0)

**Action**: Attack with sword

```typescript
// Server extracts stats
const actorStats = {
  strength: 16,
  dexterity: 14,
  // ... other stats
}

// rollDice calculates modifier
const diceRoll = rollDice('attack', actorStats)
// Uses max(STR +3, DEX +2) = +3

// Result: d20 = 15 + 3 = 18
```

## API Changes

### processGameTurn Function

**Before**:
```typescript
processGameTurn(gameState, playerAction)
```

**After**:
```typescript
processGameTurn(gameState, playerAction, actorStats)
```

**New Parameter**:
```typescript
actorStats?: {
  strength?: number
  dexterity?: number
  constitution?: number
  intelligence?: number
  wisdom?: number
  charisma?: number
}
```

### rollDice Function

**Before**:
```typescript
rollDice(actionType: string)
// Returns: { roll, modifier, total }
```

**After**:
```typescript
rollDice(actionType: string, actorStats?: CharacterStats, skillName?: string)
// Returns: { roll, modifier, total, statUsed }
```

**New Fields**:
- `actorStats`: Character's ability scores
- `skillName`: Specific skill being used (for skill-based stat selection)
- `statUsed`: Which stat was used (e.g., "STR", "INT", "CHA")

## Skill-Based Stat Selection

The system intelligently selects stats based on skill names:

### Intelligence-Based Skills
- Fireball
- Ice Storm
- Lightning Bolt
- Arcane Missile
- Magic Missile

### Wisdom-Based Skills
- Healing Touch
- Cure Wounds
- Bless
- Divine Shield

### Charisma-Based Skills
- Charm Person
- Persuade

### Example

```typescript
// Fireball uses Intelligence
rollDice('skill', { intelligence: 16 }, 'Fireball')
// Modifier: +3 (from INT 16)

// Healing Touch uses Wisdom
rollDice('skill', { wisdom: 14 }, 'Healing Touch')
// Modifier: +2 (from WIS 14)
```

## Database Integration

### Server-Side Extraction

```typescript
// Extract actor's stats from database
const actorCharacter = campaign.characters.find(char => char.id === actionData.actorId)
const actorStats = {
  strength: actorCharacter.stats.strength || 10,
  dexterity: actorCharacter.stats.dexterity || 10,
  constitution: actorCharacter.stats.constitution || 10,
  intelligence: actorCharacter.stats.intelligence || 10,
  wisdom: actorCharacter.stats.wisdom || 10,
  charisma: actorCharacter.stats.charisma || 10,
}

// Pass to AI Game Master
processGameTurn(gameState, actionData, actorStats)
```

## Default Values

If stats are not provided or missing:
- All ability scores default to **10** (modifier +0)
- This ensures the system never crashes from missing data

## Benefits

✅ **Accurate D&D 5e Mechanics** - Follows official rules  
✅ **Character Differentiation** - High-INT wizards vs high-STR fighters  
✅ **Balanced Gameplay** - Modifiers scale appropriately with level  
✅ **Flexible** - Works with any stat distribution  
✅ **Fallback Safe** - Defaults to 10 if stats missing  

## Testing Examples

### High Strength Fighter

```json
{
  "strength": 18,
  "dexterity": 10,
  "intelligence": 8
}
```

- Attack roll: d20 + 4 (STR modifier)
- Fireball: d20 - 1 (INT modifier)

### High Intelligence Wizard

```json
{
  "strength": 8,
  "dexterity": 12,
  "intelligence": 18
}
```

- Attack roll: d20 + 1 (DEX modifier, higher than STR)
- Fireball: d20 + 4 (INT modifier)

### Balanced Ranger

```json
{
  "strength": 14,
  "dexterity": 16,
  "wisdom": 14
}
```

- Attack roll: d20 + 3 (DEX modifier, higher than STR)
- Healing Touch: d20 + 2 (WIS modifier)

## Future Enhancements

- [ ] Proficiency bonuses based on character level
- [ ] Skill proficiencies (double proficiency for trained skills)
- [ ] Advantage/disadvantage rolls
- [ ] Saving throws
- [ ] Critical hit/miss special effects
- [ ] Ability check DCs based on difficulty

## Troubleshooting

### Modifier seems wrong

**Check**:
1. Character stats in database
2. Action type matches expected stat
3. Skill name for skill-based actions

### Stats not being used

**Check**:
1. `actorStats` is being passed to `processGameTurn`
2. Character ID matches in database
3. Stats field is properly formatted JSONB

### Default modifier (0) always used

**Cause**: Stats not found or all set to 10  
**Fix**: Ensure character has stats in database with values other than 10
