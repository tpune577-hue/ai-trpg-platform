'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

// ---------------------------------------------------------
// 1. ฟังก์ชันแบน/ปลดแบน (ของเดิม)
// ---------------------------------------------------------
export async function banUserAction(userId: string, banDuration: string, reason?: string) {
    const session = await auth()
    if (session?.user?.role !== 'ADMIN') return { error: "Unauthorized" }

    // ห้ามแบนตัวเอง
    if (userId === session.user.id) return { error: "Cannot ban yourself" }

    let bannedUntil: Date | null = null

    // คำนวณวันหมดอายุตาม Duration ที่ส่งมา
    if (banDuration !== 'UNBAN') {
        const now = new Date()
        switch (banDuration) {
            case '1_DAY':
                now.setDate(now.getDate() + 1)
                bannedUntil = now
                break
            case '7_DAYS':
                now.setDate(now.getDate() + 7)
                bannedUntil = now
                break
            case '30_DAYS':
                now.setDate(now.getDate() + 30)
                bannedUntil = now
                break
            case 'PERMANENT':
                now.setFullYear(now.getFullYear() + 100) // อีก 100 ปี
                bannedUntil = now
                break
            default:
                // กรณีส่ง Custom Date มาเป็น String (YYYY-MM-DD)
                if (!isNaN(Date.parse(banDuration))) {
                    bannedUntil = new Date(banDuration)
                    bannedUntil.setHours(23, 59, 59) // ให้หมดตอนสิ้นวัน
                }
        }
    }

    try {
        await prisma.user.update({
            where: { id: userId },
            data: {
                bannedUntil: bannedUntil,
                banReason: bannedUntil ? reason : null // ถ้าปลดแบน ให้ลบเหตุผลออก
            }
        })

        revalidatePath('/admin/users')
        return { success: true }
    } catch (error) {
        return { error: "Failed to update ban status" }
    }
}

// ---------------------------------------------------------
// 2. ฟังก์ชันเปลี่ยน Role (Promote/Demote) ✅ เพิ่มส่วนนี้
// ---------------------------------------------------------
export async function updateUserRole(userId: string, newRole: 'ADMIN' | 'USER') {
    const session = await auth()

    // เช็คสิทธิ์: คนกดต้องเป็น ADMIN
    if (session?.user?.role !== 'ADMIN') {
        return { error: "Unauthorized" }
    }

    // ห้ามลดขั้นตัวเอง (เดี๋ยวไม่มี Admin เหลือในระบบ)
    if (userId === session.user.id && newRole === 'USER') {
        return { error: "Action Denied: You cannot demote yourself." }
    }

    try {
        await prisma.user.update({
            where: { id: userId },
            data: { role: newRole }
        })

        revalidatePath('/admin/users') // รีเฟรชหน้าจอ
        return { success: true }
    } catch (error) {
        console.error("Failed to update role:", error)
        return { error: "Database Error: Failed to update user role." }
    }
}

// ---------------------------------------------------------
// 3. ฟังก์ชันลบ User (Optional: เผื่อใช้ปุ่ม Trash)
// ---------------------------------------------------------
export async function deleteUser(userId: string) {
    const session = await auth()
    if (session?.user?.role !== 'ADMIN') return { error: "Unauthorized" }

    // ห้ามลบตัวเอง
    if (userId === session.user.id) return { error: "Cannot delete yourself" }

    try {
        await prisma.user.delete({
            where: { id: userId }
        })
        revalidatePath('/admin/users')
        return { success: true }
    } catch (error) {
        // กรณีลบไม่ได้เพราะติด Foreign Key (เช่น มี Order, Campaign ค้างอยู่)
        return { error: "Cannot delete user. They may have related data (Orders, Campaigns)." }
    }
}