import Link from 'next/link'

export default function SuccessPage() {
    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="text-center space-y-6 max-w-md">
                <div className="text-6xl">🎉</div>
                <h1 className="text-3xl font-bold text-white">Application Received!</h1>
                <p className="text-slate-400">
                    Your seller application has been submitted successfully.
                    <br />Our admin team will review your details shortly.
                </p>

                <div className="pt-6">
                    <Link href="/" className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-full font-bold transition-all">
                        Return Home
                    </Link>
                </div>
            </div>
        </div>
    )
}