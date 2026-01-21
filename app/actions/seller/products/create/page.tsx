'use client'

import { createProductAction } from "@/app/actions/marketplace"
import { useFormState, useFormStatus } from "react-dom"

export default function CreateProductPage() {
    const [state, formAction] = useFormState(createProductAction, null)

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-8">Add New Product</h1>

            <form action={formAction} className="space-y-6 bg-slate-900 p-8 rounded-xl border border-slate-800">

                {/* Name */}
                <div>
                    <label className="block text-sm font-bold text-slate-400 mb-2">Product Name</label>
                    <input name="name" type="text" required placeholder="e.g. Dragon Slayer Sword" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none" />
                </div>

                {/* Price & Type */}
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-400 mb-2">Price (Coins)</label>
                        <input name="price" type="number" required min="0" placeholder="0" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-400 mb-2">Type</label>
                        <select name="type" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none cursor-pointer">
                            <option value="ITEM">⚔️ Item (Weapon/Gear)</option>
                            <option value="CHARACTER_ART">👤 Character Art</option>
                            <option value="SCENE_ART">🌄 Scene Background</option>
                            <option value="AUDIO">🎵 Audio/SFX</option>
                            <option value="RULESET">📜 Ruleset / Module</option>
                        </select>
                    </div>
                </div>

                {/* Image URL */}
                <div>
                    <label className="block text-sm font-bold text-slate-400 mb-2">Cover Image URL</label>
                    <input name="imageUrl" type="url" required placeholder="https://..." className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none font-mono text-sm" />
                    <p className="text-xs text-slate-500 mt-1">Link to your product preview image.</p>
                </div>

                {/* File URL (Digital Download) */}
                <div>
                    <label className="block text-sm font-bold text-slate-400 mb-2">Digital File URL (Download Link)</label>
                    <input name="fileUrl" type="url" placeholder="https://drive.google.com/..." className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none font-mono text-sm" />
                    <p className="text-xs text-slate-500 mt-1">The actual file link users will get after purchase.</p>
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-bold text-slate-400 mb-2">Description</label>
                    <textarea name="description" rows={4} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none resize-none" placeholder="Describe your item..." />
                </div>

                {/* Error Message */}
                {state?.error && (
                    <div className="bg-red-900/50 text-red-200 p-3 rounded text-sm border border-red-800 text-center">
                        ⚠️ {state.error}
                    </div>
                )}

                {/* Submit Button */}
                <SubmitButton />

            </form>
        </div>
    )
}

function SubmitButton() {
    const { pending } = useFormStatus()
    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-all disabled:opacity-50"
        >
            {pending ? 'Publishing...' : '✨ Publish Product'}
        </button>
    )
}