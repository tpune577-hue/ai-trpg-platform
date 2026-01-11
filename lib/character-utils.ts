// lib/character-utils.ts

export const CLASSES = {
    WARRIOR: { hp: 120, mp: 20, stats: { STR: 16, DEX: 12, CON: 15, INT: 8, WIS: 10, CHA: 10 } },
    MAGE: { hp: 60, mp: 100, stats: { STR: 8, DEX: 12, CON: 10, INT: 18, WIS: 14, CHA: 12 } },
    ROGUE: { hp: 80, mp: 40, stats: { STR: 10, DEX: 18, CON: 12, INT: 12, WIS: 10, CHA: 14 } },
}

export const generateCharacter = (playerId: string) => {
    // สุ่มอาชีพ
    const classKeys = Object.keys(CLASSES)
    const randomClassKey = classKeys[Math.floor(Math.random() * classKeys.length)] as keyof typeof CLASSES
    const baseData = CLASSES[randomClassKey]

    // สุ่มชื่อ
    const names = ["Kaelen", "Elara", "Finn", "Seraphina", "Drakon", "Lyra"]
    const randomName = names[Math.floor(Math.random() * names.length)]

    return {
        id: playerId,
        name: `${randomName} (${randomClassKey})`, // เช่น Kaelen (WARRIOR)
        role: randomClassKey,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${playerId}`,
        hp: baseData.hp,
        maxHp: baseData.hp,
        mp: baseData.mp,
        maxMp: baseData.mp,
        stats: baseData.stats,
        status_effects: [] // เช่น 'POISONED', 'BLESSED'
    }
}