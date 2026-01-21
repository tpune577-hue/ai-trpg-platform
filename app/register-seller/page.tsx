'use client'

import { useFormState, useFormStatus } from "react-dom"
import { registerSellerAction } from "@/app/actions/seller"

export default function RegisterSellerPage() {
    const [state, formAction] = useFormState(registerSellerAction, null)

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">

                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black text-white uppercase tracking-widest">Become a Seller</h1>
                    <p className="text-slate-400 mt-2 text-sm">Join our marketplace and start earning.</p>
                </div>

                <form action={formAction} className="space-y-6">

                    {/* Identity Info */}
                    <div className="space-y-4">
                        <h3 className="text-emerald-500 font-bold text-xs uppercase tracking-wider border-b border-slate-800 pb-2">1. Identity Verification</h3>
                        <InputGroup label="Real Name (Legal Name)" name="realName" placeholder="John Doe" required />
                        <InputGroup label="ID Card Number" name="idCardNumber" placeholder="x-xxxx-xxxxx-xx-x" required />
                        <div className="grid grid-cols-2 gap-4">
                            <InputGroup label="ID Card Image URL" name="idCardImage" placeholder="https://..." textClass="font-mono text-xs" />
                            <InputGroup label="Address" name="address" placeholder="123 Street..." />
                        </div>
                    </div>

                    {/* Bank Info */}
                    <div className="space-y-4">
                        <h3 className="text-amber-500 font-bold text-xs uppercase tracking-wider border-b border-slate-800 pb-2">2. Payout Information</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">Bank Name</label>
                                <select name="bankName" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white text-sm focus:border-amber-500 outline-none">
                                    <option value="KBANK">KBANK (กสิกรไทย)</option>
                                    <option value="SCB">SCB (ไทยพาณิชย์)</option>
                                    <option value="BBL">BBL (กรุงเทพ)</option>
                                    <option value="KTB">KTB (กรุงไทย)</option>
                                </select>
                            </div>
                            <InputGroup label="Account Number" name="bankAccount" placeholder="xxx-x-xxxxx-x" required />
                        </div>
                        <InputGroup label="Book Bank Image URL" name="bookBankImage" placeholder="https://..." textClass="font-mono text-xs" />
                    </div>

                    {/* Error Message */}
                    {state?.error && (
                        <div className="p-3 bg-red-900/30 border border-red-800 text-red-200 text-sm rounded text-center">
                            ❌ {state.error}
                        </div>
                    )}

                    {/* Submit */}
                    <SubmitButton />

                </form>
            </div>
        </div>
    )
}

function InputGroup({ label, name, placeholder, required, textClass }: any) {
    return (
        <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">{label}</label>
            <input
                name={name}
                required={required}
                placeholder={placeholder}
                className={`w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none transition-all ${textClass || 'text-sm'}`}
            />
        </div>
    )
}

function SubmitButton() {
    const { pending } = useFormStatus()
    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-black font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-all disabled:opacity-50 mt-4"
        >
            {pending ? 'Submitting...' : '🚀 Submit Application'}
        </button>
    )
}