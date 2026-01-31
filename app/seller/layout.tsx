import Link from 'next/link'
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import SellerLayoutClient from './SellerLayoutClient'

export default async function SellerLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth()
    if (!session?.user) redirect('/')

    // เช็คสิทธิ์ก่อนเข้าหน้านี้
    const seller = await prisma.sellerProfile.findUnique({
        where: { userId: session.user.id }
    })

    if (!seller || (seller.status !== 'PRE_REGISTER' && seller.status !== 'APPROVED')) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-2">🚫 Access Denied</h1>
                    <p className="text-slate-400">You must be a registered seller to view this page.</p>
                    <Link href="/marketplace" className="mt-4 inline-block text-amber-500 hover:underline">Go to Marketplace</Link>
                </div>
            </div>
        )
    }

    return <SellerLayoutClient>{children}</SellerLayoutClient>
}
