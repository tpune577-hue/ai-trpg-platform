'use client'

import { useState } from 'react'
import { updateSellerTerms } from '@/app/actions/site-config'

interface SellerTermsEditorProps {
    initialContent: string
}

export default function SellerTermsEditor({ initialContent }: SellerTermsEditorProps) {
    const [content, setContent] = useState(initialContent)
    const [isSaving, setIsSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    const handleSave = async () => {
        setIsSaving(true)
        setMessage(null)

        try {
            const result = await updateSellerTerms(content)

            if (result.success) {
                setMessage({ type: 'success', text: 'Terms & Conditions updated successfully!' })
            } else {
                setMessage({ type: 'error', text: result.error || 'Failed to update terms' })
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'An error occurred while saving' })
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="space-y-4">
            {/* Message */}
            {message && (
                <div className={`p-4 rounded-lg ${message.type === 'success'
                        ? 'bg-emerald-900/30 border border-emerald-500/50 text-emerald-200'
                        : 'bg-red-900/30 border border-red-500/50 text-red-200'
                    }`}>
                    {message.text}
                </div>
            )}

            {/* Editor */}
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    Terms & Conditions Content
                </label>
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={20}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all font-mono text-sm"
                    placeholder="Enter seller terms and conditions here..."
                />
                <p className="text-xs text-gray-500 mt-2">
                    Plain text format. This will be displayed to sellers when they register.
                </p>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </div>
    )
}
