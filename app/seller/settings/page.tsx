import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import SellerSettingsForm from "@/components/seller/SellerSettingsForm"

export default async function SellerSettingsPage() {
    const session = await auth()
    if (!session?.user) redirect('/')

    const seller = await prisma.sellerProfile.findUnique({
        where: { userId: session.user.id }
    })

    if (!seller) redirect('/marketplace')

    return (
        <div>
            <h1 className="text-2xl font-bold text-white mb-6">Seller Settings</h1>

            {/* Payment Information Section */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
                <h2 className="text-xl font-bold text-white mb-4">Payment Information</h2>

                {seller.status === 'PRE_REGISTER' && (
                    <div className="mb-4 p-4 bg-amber-900/20 border border-amber-500/50 rounded-lg text-amber-200">
                        <p className="font-semibold">⚠️ Payment Information Required</p>
                        <p className="text-sm mt-1">
                            Please submit your payment information to receive payouts. Your application will be reviewed by our team.
                        </p>
                    </div>
                )}

                {seller.status === 'PENDING' && (
                    <div className="mb-4 p-4 bg-blue-900/20 border border-blue-500/50 rounded-lg text-blue-200">
                        <p className="font-semibold">⏳ Application Under Review</p>
                        <p className="text-sm mt-1">
                            Your payment information has been submitted and is being reviewed by our team.
                        </p>
                    </div>
                )}

                {seller.status === 'APPROVED' && (
                    <div className="mb-4 p-4 bg-emerald-900/20 border border-emerald-500/50 rounded-lg text-emerald-200">
                        <p className="font-semibold">✅ Verified Seller</p>
                        <p className="text-sm mt-1">
                            Your seller account is approved. You can update your information below.
                        </p>
                    </div>
                )}

                {seller.status === 'REJECTED' && seller.rejectReason && (
                    <div className="mb-4 p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-200">
                        <p className="font-semibold">❌ Application Rejected</p>
                        <p className="text-sm mt-1">
                            Reason: {seller.rejectReason}
                        </p>
                        <p className="text-sm mt-2">
                            Please update your information and resubmit.
                        </p>
                    </div>
                )}

                <SellerSettingsForm seller={seller} />
            </div>
        </div>
    )
}
