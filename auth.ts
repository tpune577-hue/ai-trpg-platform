import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import Google from "next-auth/providers/google"

export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: PrismaAdapter(prisma) as any,
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
    ],
    callbacks: {
        // 🔒 1. ดักจับตอน Login (Sign In)
        async signIn({ user }) {
            // ถ้าไม่มี ID (เช่น Login ครั้งแรกสุด) ให้ผ่านไปก่อน เพราะยังไงก็ยังไม่โดนแบน
            if (!user.id) return true

            try {
                // ดึงข้อมูลล่าสุดจาก DB เพื่อเช็คสถานะ Ban แบบ Real-time
                const dbUser = await prisma.user.findUnique({
                    where: { id: user.id }
                })

                // ถ้าไม่เจอ User ใน DB (แปลว่า Login ครั้งแรก) ให้ผ่าน
                if (!dbUser) return true

                // เช็คว่ามีวันกำหนดแบน และ วันนั้นยังมาไม่ถึง (ยังไม่หมดโทษ)
                if (dbUser.bannedUntil && new Date(dbUser.bannedUntil) > new Date()) {
                    const reason = dbUser.banReason || "Your account has been suspended."

                    // 🚫 ส่งกลับเป็น URL เพื่อ Redirect ไปหน้า Error
                    // คุณต้องไปสร้างหน้า /app/auth/error/page.tsx เพื่อรับ query params นี้
                    return `/auth/error?error=Banned&reason=${encodeURIComponent(reason)}`
                }

                return true // ผ่านฉลุย
            } catch (error) {
                console.error("Sign in error:", error)
                return false // ถ้า DB Error กันไว้ก่อนไม่ให้เข้า
            }
        },

        // 👤 2. ยัดข้อมูลใส่ Session (เพื่อให้ Client เรียกใช้ได้)
        async session({ session, user }) {
            if (session.user) {
                // cast type เพื่อให้ TS ไม่โวยวาย (เพราะ Default User ไม่มี role)
                session.user.role = (user as any).role || "USER"
                session.user.id = user.id

                // (Optional) ถ้าอยากให้ Client รู้ด้วยว่าเคยโดนแบน หรือมีสถานะอะไร
                // session.user.isBanned = ...
            }
            return session
        }
    },
    pages: {
        // กำหนดหน้า Error เอง (ถ้ามี)
        error: '/auth/error',
    }
})