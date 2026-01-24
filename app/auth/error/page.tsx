'use client'

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Suspense } from "react"

function ErrorContent() {
    const searchParams = useSearchParams()
    const error = searchParams.get("error")
    const reason = searchParams.get("reason")

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
            <div className="bg-slate-900 border border-red-900/50 p-8 rounded-2xl max-w-md w-full text-center shadow-2xl">

                {error === "Banned" ? (
                    <>
                        <div className="text-6xl mb-4">🚫</div>
                        <h1 className="text-2xl font-bold text-red-500 mb-2">Account Suspended</h1>
                        <p className="text-slate-300 mb-6">
                            You cannot access the platform at this time.
                        </p>
                        <div className="bg-black/30 p-4 rounded-lg border border-red-900/30 mb-8">
                            <span className="text-xs text-slate-500 uppercase font-bold block mb-1">Reason</span>
                            <span className="text-white font-medium">{reason || "Violation of Terms"}</span>
                        </div>
                    </>
                ) : (
                    <>
                        <h1 className="text-2xl font-bold text-white mb-4">Authentication Error</h1>
                        <p className="text-slate-400 mb-8">Something went wrong during sign in.</p>
                    </>
                )}

                <Link
                    href="/"
                    className="block w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-all"
                >
                    Return to Home
                </Link>
            </div>
        </div>
    )
}

export default function AuthErrorPage() {
    return (
        <Suspense fallback={<div className="text-white p-10">Loading...</div>}>
            <ErrorContent />
        </Suspense>
    )
}