'use client'

import { useState, useEffect } from 'react'
import { uploadToSupabase } from '@/lib/storage'

interface ImageUploaderProps {
    value: string
    onChange: (url: string) => void
    label?: string
    aspectRatio?: string // e.g., "aspect-video", "aspect-square", "aspect-[4/3]"
    placeholder?: string
    required?: boolean
    className?: string
}

export default function ImageUploader({
    value,
    onChange,
    label = "Image",
    aspectRatio = "aspect-video",
    placeholder = "Click to upload or drag and drop",
    required = false,
    className = ""
}: ImageUploaderProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string>(value)
    const [isUploading, setIsUploading] = useState(false)
    const [error, setError] = useState<string>()

    // Update preview when value prop changes
    useEffect(() => {
        setPreviewUrl(value)
    }, [value])

    // Handle file preview
    useEffect(() => {
        if (!selectedFile) return

        const objectUrl = URL.createObjectURL(selectedFile)
        setPreviewUrl(objectUrl)

        return () => URL.revokeObjectURL(objectUrl)
    }, [selectedFile])

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        setError(undefined)

        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]

            // Validate file size (5MB)
            if (file.size > 5 * 1024 * 1024) {
                setError("File is too large. Maximum size is 5MB")
                return
            }

            // Validate file type
            if (!file.type.startsWith('image/')) {
                setError("Please select an image file")
                return
            }

            setSelectedFile(file)

            // Auto-upload immediately
            setIsUploading(true)
            try {
                const uploadedUrl = await uploadToSupabase(file)
                onChange(uploadedUrl)
                setError(undefined)
            } catch (err: any) {
                setError(err.message || "Failed to upload image")
                setSelectedFile(null)
            } finally {
                setIsUploading(false)
            }
        }
    }

    return (
        <div className={className}>
            {label && (
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}

            <div className={`relative border-2 border-dashed rounded-lg overflow-hidden transition-all ${previewUrl
                    ? 'border-amber-500/50 bg-slate-950/50'
                    : 'border-slate-700 hover:border-amber-500/50 bg-slate-950/30'
                } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>

                <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    disabled={isUploading}
                />

                {previewUrl ? (
                    <div className={`${aspectRatio} relative`}>
                        <img
                            src={previewUrl}
                            alt="Preview"
                            className="w-full h-full object-cover"
                            onError={(e: any) => {
                                e.currentTarget.src = 'https://placehold.co/600x400/1e293b/FFF?text=Error'
                            }}
                        />
                        {isUploading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-white text-sm font-bold">Uploading...</p>
                                </div>
                            </div>
                        )}
                        {!isUploading && (
                            <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                                <p className="text-white text-sm font-bold">Click to change</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className={`${aspectRatio} flex flex-col items-center justify-center p-4`}>
                        <div className="text-3xl mb-2">🖼️</div>
                        <p className="text-slate-300 font-medium text-sm text-center">{placeholder}</p>
                        <p className="text-slate-500 text-xs mt-1">PNG, JPG or WEBP (Max 5MB)</p>
                    </div>
                )}
            </div>

            {error && (
                <p className="mt-2 text-xs text-red-400 flex items-center gap-1">
                    <span>⚠️</span> {error}
                </p>
            )}
        </div>
    )
}
