// components/auth/AuthButton.tsx
"use client"

import { handleSignIn, handleSignOut } from "@/app/actions/auth-actions"

export function SignIn() {
    return (
        <form action={handleSignIn}>
            <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-500">
                Sign In
            </button>
        </form>
    )
}

export function SignOut() {
    return (
        <form action={handleSignOut}>
            <button className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-500">
                Sign Out
            </button>
        </form>
    )
}