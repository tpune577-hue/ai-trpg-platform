'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

export async function registerSellerAction(prevState: any, formData: FormData) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Please login first." }

    // รับค่าจากฟอร์ม
    const realName = formData.get('realName') as string
    const idCardNumber = formData.get('idCardNumber') as string
    const address = formData.get('address') as string
    const bankName = formData.get('bankName') as string
    const bankAccount = formData.get('bankAccount') as string

    // (ของจริงควรมีอัปโหลดรูปด้วย แต่วันนี้เอา Text ไปก่อน)
    const idCardImage = formData.get('idCardImage') as string
    const bookBankImage = formData.get('bookBankImage') as string

    if (!realName || !idCardNumber || !bankAccount) {
        return { error: "Please fill in all required fields." }
    }

    try {
        // บันทึกลง Database
        await prisma.sellerProfile.create({
            data: {
                userId: session.user.id,
                realName,
                idCardNumber,
                address,
                bankName,
                bankAccount,
                idCardImage,
                bookBankImage,
                status: 'PENDING' // รอแอดมินอนุมัติ
            }
        })

        // สำเร็จ!
    } catch (error) {
        console.error(error)
        return { error: "Registration failed. You might have already applied." }
    }

    redirect('/register-seller/success')
}

/**
 * Get seller profile status for a user
 */
export async function getSellerStatus(userId: string) {
    if (!userId) return null

    const profile = await prisma.sellerProfile.findUnique({
        where: { userId },
        select: {
            id: true,
            status: true,
            rejectReason: true,
            realName: true,
            idCardNumber: true,
            address: true,
            idCardImage: true,
            bookBankImage: true,
            bankName: true,
            bankAccount: true,
        }
    })

    return profile
}

/**
 * Update seller profile (for resubmission after rejection)
 */
export async function updateSellerProfile(userId: string, data: {
    realName?: string
    idCardNumber?: string
    address?: string
    idCardImage?: string
    bookBankImage?: string
    bankName?: string
    bankAccount?: string
}) {
    const profile = await prisma.sellerProfile.update({
        where: { userId },
        data: {
            ...data,
            status: 'PENDING', // Reset to pending on resubmission
            rejectReason: null, // Clear rejection reason
            updatedAt: new Date()
        }
    })

    return { success: true, profile }
}
/**
 * Submit payment information (PRE_REGISTER  PENDING)
 * Used in seller settings page
 */
export async function submitSellerPaymentInfo(prevState: any, formData: FormData) {
    const session = await auth()
    if (!session?.user?.id) return { error: \"Please login first.\" }

    const realName = formData.get('realName') as string
    const idCardNumber = formData.get('idCardNumber') as string
    const address = formData.get('address') as string
    const bankName = formData.get('bankName') as string
    const bankAccount = formData.get('bankAccount') as string
    const idCardImage = formData.get('idCardImage') as string
    const bookBankImage = formData.get('bookBankImage') as string

    if (!realName || !idCardNumber || !bankAccount) {
        return { error: \"Please fill in all required fields.\" }
    }

    try {
        // Update existing PRE_REGISTER profile
        await prisma.sellerProfile.update({
            where: { userId: session.user.id },
            data: {
                realName,
                idCardNumber,
                address,
                bankName,
                bankAccount,
                idCardImage,
                bookBankImage,
                status: 'PENDING', // Change from PRE_REGISTER to PENDING
                updatedAt: new Date()
            }
        })

        revalidatePath('/seller')
        revalidatePath('/marketplace')
        return { success: true, message: \"Payment information submitted successfully! Your application is now pending review.\" }
    } catch (error) {
        console.error(error)
        return { error: \"Failed to submit payment information.\" }
    }
}
