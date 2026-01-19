// Define หน้าเต๋าที่เป็นไปได้
export type RnRFace = 'BLANK' | 'STAR' | 'R'

// Structure ของผลลัพธ์การทอย 1 ลูก
export interface RnRRollResult {
    face: RnRFace
    score: number
    triggersReroll: boolean
}

/**
 * ฟังก์ชันสุ่มเต๋า D4 สำหรับระบบ Role & Roll
 * - 1, 2 : Blank (0 คะแนน)
 * - 3    : Star (*) (1 คะแนน)
 * - 4    : R (1 คะแนน + ได้ทอยใหม่)
 */
export const rollD4RnR = (): RnRRollResult => {
    const roll = Math.floor(Math.random() * 4) + 1

    if (roll <= 2) {
        return { face: 'BLANK', score: 0, triggersReroll: false }
    }
    if (roll === 3) {
        return { face: 'STAR', score: 1, triggersReroll: false }
    }
    // roll === 4
    return { face: 'R', score: 1, triggersReroll: true }
}

/**
 * Helper แปลงหน้าเต๋าเป็น Icon เพื่อนำไปแสดงผล
 */
export const getRnRIcon = (face: RnRFace) => {
    switch (face) {
        case 'STAR': return '⭐'
        case 'R': return '®️'
        default: return '△' // หรือจะใช้ไอคอนอื่นสำหรับหน้าว่างก็ได้
    }
}