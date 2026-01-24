import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import UsersClient from "./UsersClient"

export const dynamic = 'force-dynamic'

export default async function UserManagementPage() {
    const session = await auth()
    if (session?.user?.role !== 'ADMIN') redirect('/')

    // ดึงข้อมูล Users ทั้งหมด (เรียงตามล่าสุด)
    const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100 // จำกัดไว้ก่อนเพื่อ performance (ถ้าเยอะต้องทำ Pagination เพิ่ม)
    })

    return (
        <div className="min-h-screen bg-slate-950 text-white p-8">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center gap-4 mb-4">
                    <Link href="/admin" className="p-2 bg-slate-900 rounded-lg text-slate-400 hover:text-white transition-colors">
                        &larr; Back
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black text-white uppercase tracking-widest">User Management</h1>
                        <p className="text-slate-400">Manage roles and remove accounts.</p>
                    </div>
                </div>

                {/* Client Component */}
                <UsersClient users={users} />

            </div>
        </div>
    )
}