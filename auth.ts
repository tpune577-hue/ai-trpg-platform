import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma" // ตรวจสอบ path ให้ถูกว่า prisma client อยู่ไหน
import Google from "next-auth/providers/google"

export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: PrismaAdapter(prisma),
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
    ],
    callbacks: {
        // ✅ จุดสำคัญ: ดึง Role จาก Database มายัดใส่ Session
        async session({ session, user }) {
            if (session.user) {
                // user ตัวนี้มาจาก Database โดยตรงผ่าน PrismaAdapter
                // เราต้อง cast type เป็น any หรือเช็คค่าก่อน
                session.user.role = (user as any).role || "USER"
                session.user.id = user.id
            }
            return session
        }
    }
})