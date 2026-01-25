'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function PaymentFailedPage() {
    const router = useRouter()

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-slate-900 border border-red-500 rounded-2xl p-8 shadow-2xl shadow-red-900/20">
                {/* Error Icon */}
                <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center">
                        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-3xl font-bold text-white text-center mb-2">
                    Payment Cancelled
                </h1>
                <p className="text-slate-400 text-center mb-8">
                    Your payment was not completed
                </p>

                {/* Common Reasons */}
                <div className="bg-slate-950 rounded-xl p-4 mb-6">
                    <h3 className="text-sm font-bold text-white mb-2">Common Reasons:</h3>
                    <ul className="text-xs text-slate-400 space-y-1">
                        <li>• Payment cancelled by user</li>
                        <li>• Session timeout</li>
                        <li>• Card declined</li>
                        <li>• Insufficient funds</li>
                    </ul>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                    <button
                        onClick={() => router.back()}
                        className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition-all"
                    >
                        Try Again
                    </button>
                    <Link
                        href="/marketplace"
                        className="block w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl text-center transition-all"
                    >
                        Back to Marketplace
                    </Link>
                    <Link
                        href="/"
                        className="block w-full text-slate-500 hover:text-slate-400 font-bold py-3 text-center transition-all"
                    >
                        Go Home
                    </Link>
                </div>
            </div>
        </div>
    )
}
