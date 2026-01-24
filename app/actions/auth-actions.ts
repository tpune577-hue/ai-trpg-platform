// app/actions/auth-actions.ts
'use server'

import { signIn, signOut } from "@/auth"

export async function handleSignIn() {
    // ❌ เดิม: ไปหน้า /play (ซึ่งยังไม่มีอะไร หรือต้องการ room code)
    // await signIn("google", { redirectTo: "/play" }) 

    // ✅ แก้เป็น: กลับมาหน้า Home (เพื่อให้ ClientHome เปลี่ยนหน้าตาเป็น Dashboard)
    await signIn("google", { redirectTo: "/" })
}

export async function handleSignOut() {
    await signOut({ redirectTo: "/" })
}