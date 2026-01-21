// types/next-auth.d.ts
import { DefaultSession } from "next-auth"

declare module "next-auth" {
    interface Session {
        user: {
            id: string
            // ✅ เพิ่ม role เข้าไป (เป็น String)
            role: string
        } & DefaultSession["user"]
    }

    interface User {
        // ✅ เพิ่ม role ให้ User ด้วย
        role: string
    }
}