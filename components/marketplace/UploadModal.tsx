'use client'

import { useState, useEffect } from 'react'
import { uploadToSupabase } from '@/lib/storage' // มั่นใจว่าพาธนี้ถูกต้องตามที่คุณสร้างไฟล์ไว้

interface UploadModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export default function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: 'ART' as 'ART' | 'THEME',
        price: '',
        tags: '',
    })

    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string>()

    // จัดการเรื่อง Preview และล้างหน่วยความจำ (Memory Leak)
    useEffect(() => {
        if (!selectedFile) {
            setPreviewUrl(null)
            return
        }
        const objectUrl = URL.createObjectURL(selectedFile)
        setPreviewUrl(objectUrl)

        return () => URL.revokeObjectURL(objectUrl)
    }, [selectedFile])

    if (!isOpen) return null

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]
            if (file.size > 5 * 1024 * 1024) { // จำกัดขนาด 5MB
                return alert("File is too large. Maximum size is 5MB")
            }
            setSelectedFile(file)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(undefined)

        if (!selectedFile) {
            return setError("Please select an image to upload")
        }

        setIsSubmitting(true)

        try {
            // 1. อัปโหลดรูปไปที่ Supabase Storage ก่อน
            let finalImageUrl = ''
            try {
                finalImageUrl = await uploadToSupabase(selectedFile)
            } catch (err) {
                throw new Error("Failed to upload image to cloud storage")
            }

            // 2. ส่ง Metadata และ URL ที่ได้ไปบันทึกลง Database (Prisma)
            const response = await fetch('/api/marketplace/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: formData.title,
                    description: formData.description,
                    type: formData.type,
                    price: parseFloat(formData.price),
                    imageUrl: finalImageUrl, // ใช้ URL จาก Supabase
                    tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
                }),
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to create item in database')
            }

            // Reset Form
            setFormData({ title: '', description: '', type: 'ART', price: '', tags: '' })
            setSelectedFile(null)

            onSuccess()
            onClose()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="relative w-full max-w-2xl bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border-2 border-amber-500/30 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">

                {/* Header */}
                <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm p-6 border-b border-amber-500/30 z-10">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-amber-400">Upload New Asset</h2>
                        <button onClick={onClose} className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors text-gray-400">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {error && (
                        <div className="p-4 bg-red-900/30 border border-red-500/50 rounded-lg text-red-200 text-sm">
                            {error}
                        </div>
                    )}

                    {/* ✅ Image Upload Area */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Asset Image *</label>
                        <div className={`relative border-2 border-dashed rounded-xl p-4 transition-all ${previewUrl ? 'border-amber-500/50 bg-slate-950/50' : 'border-slate-700 hover:border-amber-500/50 bg-slate-950/30'}`}>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />

                            {previewUrl ? (
                                <div className="space-y-3">
                                    <img src={previewUrl} alt="Preview" className="max-h-64 mx-auto rounded-lg shadow-lg object-contain" />
                                    <p className="text-center text-xs text-amber-500 font-medium">Click or Drag to change image</p>
                                </div>
                            ) : (
                                <div className="py-8 text-center">
                                    <div className="text-4xl mb-3">🖼️</div>
                                    <p className="text-slate-300 font-medium">Click to select or drag and drop</p>
                                    <p className="text-slate-500 text-xs mt-1">PNG, JPG or WEBP (Max 5MB)</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Title *</label>
                        <input
                            type="text" required
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-lg text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                            placeholder="e.g. Ancient Forest Battlemap"
                        />
                    </div>

                    {/* Type and Price */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-2">Category *</label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-lg text-white focus:border-amber-500 outline-none"
                            >
                                <option value="ART">Character Art</option>
                                <option value="THEME">Map / Theme</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-2">Price ($) *</label>
                            <input
                                type="number" required min="0" step="0.01"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-lg text-white focus:border-amber-500 outline-none"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                            className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-lg text-white focus:border-amber-500 outline-none resize-none"
                            placeholder="Tell buyers about your asset..."
                        />
                    </div>

                    {/* Tags */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Tags (comma-separated)</label>
                        <input
                            type="text"
                            value={formData.tags}
                            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-lg text-white focus:border-amber-500 outline-none"
                            placeholder="fantasy, map, forest, hd"
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-[2] px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-900/20"
                        >
                            {isSubmitting ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Processing...
                                </span>
                            ) : 'Publish to Marketplace'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}