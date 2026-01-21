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