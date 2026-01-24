'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createProductAction } from "@/app/actions/marketplace"
import ImageUploader from '@/components/shared/ImageUploader'

export default function CreateProductPage() {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string>()

    // Form state
    const [name, setName] = useState('')
    const [price, setPrice] = useState('')
    const [type, setType] = useState('ITEM')
    const [imageUrl, setImageUrl] = useState('')
    const [fileUrl, setFileUrl] = useState('')
    const [description, setDescription] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(undefined)
        setIsSubmitting(true)

        try {
            // Create FormData to pass to server action
            const formData = new FormData()
            formData.append('name', name)
            formData.append('price', price)
            formData.append('type', type)
            formData.append('imageUrl', imageUrl)
            formData.append('fileUrl', fileUrl)
            formData.append('description', description)

            const result = await createProductAction(null, formData)

            if (result?.error) {
                setError(result.error)
            } else {
                // Success - redirect to products list or show success message
                alert('✅ Product published successfully!')
                router.push('/seller/products')
            }
        } catch (err: any) {
            setError(err.message || 'Failed to publish product')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-8">Add New Product</h1>

            <form onSubmit={handleSubmit} className="space-y-6 bg-slate-900 p-8 rounded-xl border border-slate-800">

                {/* Name */}
                <div>
                    <label className="block text-sm font-bold text-slate-400 mb-2">Product Name</label>
                    <input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        type="text"
                        required
                        placeholder="e.g. Dragon Slayer Sword"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none"
                    />
                </div>

                {/* Price & Type */}
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-400 mb-2">Price (Coins)</label>
                        <input
                            value={price}
                            onChange={e => setPrice(e.target.value)}
                            type="number"
                            required
                            min="0"
                            placeholder="0"
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-400 mb-2">Type</label>
                        <select
                            value={type}
                            onChange={e => setType(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none cursor-pointer"
                        >
                            <option value="ITEM">⚔️ Item (Weapon/Gear)</option>
                            <option value="CHARACTER_ART">👤 Character Art</option>
                            <option value="SCENE_ART">🌄 Scene Background</option>
                            <option value="AUDIO">🎵 Audio/SFX</option>
                            <option value="RULESET">📜 Ruleset / Module</option>
                        </select>
                    </div>
                </div>

                {/* Cover Image - FILE UPLOAD */}
                <div>
                    <label className="block text-sm font-bold text-slate-400 mb-2">Cover Image</label>
                    <ImageUploader
                        value={imageUrl}
                        onChange={setImageUrl}
                        aspectRatio="aspect-video"
                        placeholder="Upload product cover image"
                        required
                    />
                    <p className="text-xs text-slate-500 mt-2">Product preview image for the marketplace.</p>
                </div>

                {/* File URL (Digital Download) - Keep as URL input */}
                <div>
                    <label className="block text-sm font-bold text-slate-400 mb-2">Digital File URL (Download Link)</label>
                    <input
                        value={fileUrl}
                        onChange={e => setFileUrl(e.target.value)}
                        type="url"
                        placeholder="https://drive.google.com/..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none font-mono text-sm"
                    />
                    <p className="text-xs text-slate-500 mt-1">The actual file link users will get after purchase.</p>
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-bold text-slate-400 mb-2">Description</label>
                    <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        rows={4}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none resize-none"
                        placeholder="Describe your item..."
                    />
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-900/50 text-red-200 p-3 rounded text-sm border border-red-800 text-center">
                        ⚠️ {error}
                    </div>
                )}

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isSubmitting || !imageUrl}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? 'Publishing...' : '✨ Publish Product'}
                </button>

            </form>
        </div>
    )
}