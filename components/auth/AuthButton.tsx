import { signIn, signOut } from "@/auth"

export function SignIn() {
    return (
        <form
            action={async () => {
                "use server"
                await signIn("google", { redirectTo: "/" })
            }}
        >
            <button
                type="submit"
                className="bg-white text-slate-900 px-4 py-2 rounded-full font-bold hover:bg-slate-200 transition-colors flex items-center gap-2 text-sm"
            >
                <img src="https://authjs.dev/img/providers/google.svg" className="w-4 h-4" alt="Google" />
                Sign in
            </button>
        </form>
    )
}

export function SignOut() {
    return (
        <form
            action={async () => {
                "use server"
                await signOut({ redirectTo: "/" })
            }}
        >
            <button
                type="submit"
                className="text-slate-400 hover:text-white text-xs font-bold uppercase tracking-wider"
            >
                Sign Out
            </button>
        </form>
    )
}