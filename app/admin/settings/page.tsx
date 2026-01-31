import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import SellerTermsEditor from "@/components/admin/SellerTermsEditor"

export default async function AdminSettingsPage() {
    const session = await auth()

    if (!session?.user || session.user.role !== 'ADMIN') {
        redirect('/')
    }

    // Fetch current T&C
    const config = await prisma.siteConfig.findUnique({
        where: { id: 1 },
        select: { sellerTermsConditions: true }
    })

    return (
        <div>
            <h1 className="text-2xl font-bold text-white mb-6">Site Settings</h1>

            {/* Seller Terms & Conditions Section */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
                <h2 className="text-xl font-bold text-white mb-4">Seller Terms & Conditions</h2>
                <p className="text-gray-400 text-sm mb-6">
                    Configure the terms and conditions that sellers must accept before registration.
                </p>

                <SellerTermsEditor initialContent={config?.sellerTermsConditions || ''} />
            </div>
        </div>
    )
}
