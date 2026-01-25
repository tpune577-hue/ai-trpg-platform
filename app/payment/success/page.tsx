'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { stripe } from '@/lib/stripe'

function PaymentSuccessContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const sessionId = searchParams.get('session_id')

    const [session, setSession] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!sessionId) {
            router.push('/')
            return
        }

        // Fetch session details
        const fetchSession = async () => {
            try {
                const res = await fetch(`/api/payment/session/${sessionId}`)
                const data = await res.json()

                if (data.success) {
                    setSession(data.session)
                }
            } catch (error) {
                console.error('Failed to fetch session:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchSession()
    }, [sessionId, router])

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-white flex items-center gap-3">
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    Loading...
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-slate-900 border border-emerald-500 rounded-2xl p-8 shadow-2xl shadow-emerald-900/20">
                {/* Success Icon */}
                <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center animate-pulse">
                        <svg className="w-12 h-12 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-3xl font-bold text-white text-center mb-2">
                    Payment Successful!
                </h1>
                <p className="text-slate-400 text-center mb-8">
                    Your payment has been processed successfully
                </p>

                {/* Session Details */}
                {session && (
                    <div className="bg-slate-950 rounded-xl p-4 mb-6 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Amount Paid:</span>
                            <span className="text-white font-bold">
                                ฿{(session.amount_total / 100).toFixed(2)}
                            </span>
                        </div>
                        {session.payment_status && (
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Status:</span>
                                <span className="text-emerald-400 font-bold uppercase">
                                    {session.payment_status}
                                </span>
                            </div>
                        )}
                        {session.customer_email && (
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Email:</span>
                                <span className="text-white">{session.customer_email}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div className="space-y-3">
                    <Link
                        href="/marketplace"
                        className="block w-full bg-emerald-600 hover:bg-emerald-500 text-black font-bold py-3 rounded-xl text-center transition-all"
                    >
                        Go to Marketplace
                    </Link>
                    <Link
                        href="/"
                        className="block w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl text-center transition-all"
                    >
                        Back to Home
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default function PaymentSuccessPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-white">Loading...</div>
            </div>
        }>
            <PaymentSuccessContent />
        </Suspense>
    )
}
