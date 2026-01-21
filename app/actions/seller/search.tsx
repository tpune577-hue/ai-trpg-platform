'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useDebouncedCallback } from 'use-debounce' // ถ้าไม่มี library นี้ ให้ใช้ timeout ธรรมดา หรือ onKeyDown Enter ก็ได้
// *ถ้าไม่อยากลง lib เพิ่ม ใช้แบบ onKeyDown Enter ด้านล่างนี้ครับ*

export default function SearchInput() {
    const searchParams = useSearchParams()
    const pathname = usePathname()
    const { replace } = useRouter()

    const handleSearch = (term: string) => {
        const params = new URLSearchParams(searchParams)
        if (term) {
            params.set('query', term)
        } else {
            params.delete('query')
        }
        // Reset page เมื่อค้นหา (ถ้ามี pagination)
        // params.set('page', '1')

        replace(`${pathname}?${params.toString()}`)
    }

    return (
        <div className="relative flex-1 max-w-md">
            <input
                className="peer block w-full rounded-md border border-slate-700 bg-slate-900 py-[9px] pl-10 text-sm text-white placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
                placeholder="Search ID, Name, User ID..."
                onChange={(e) => handleSearch(e.target.value)}
                defaultValue={searchParams.get('query')?.toString()}
            />
            <div className="absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-500 peer-focus:text-amber-500">
                🔍
            </div>
        </div>
    )
}