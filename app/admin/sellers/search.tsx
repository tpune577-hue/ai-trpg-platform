'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
// ไม่ต้องใช้ use-debounce library

export default function SearchInput() {
    const searchParams = useSearchParams()
    const pathname = usePathname()
    const { replace } = useRouter()

    // ตัวแปรเก็บ Timer (ใช้นอกฟังก์ชัน handleSearch เพื่อให้จำค่าได้ระหว่างการพิมพ์)
    let timeoutId: NodeJS.Timeout

    const handleSearch = (term: string) => {
        // 1. เคลียร์ Timer เก่าทิ้ง (ถ้าUserยังพิมพ์ไม่หยุด ก็อย่าเพิ่งส่ง)
        clearTimeout(timeoutId)

        // 2. ตั้ง Timer ใหม่ รอ 500ms ค่อยทำงาน
        timeoutId = setTimeout(() => {
            const params = new URLSearchParams(searchParams)
            if (term) {
                params.set('query', term)
            } else {
                params.delete('query')
            }

            // ถ้าอยากให้ค้นหาแล้วกลับไปหน้า 1 เสมอ (ถ้ามี Pagination)
            // params.set('page', '1')

            replace(`${pathname}?${params.toString()}`)
        }, 500) // หน่วงเวลา 0.5 วินาที
    }

    return (
        <div className="relative flex-1 max-w-md">
            <input
                className="peer block w-full rounded-md border border-slate-700 bg-slate-900 py-[9px] pl-10 text-sm text-white placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
                placeholder="Search ID, Name, User ID..."
                // ใช้ onChange เรียกฟังก์ชันที่มี Debounce
                onChange={(e) => handleSearch(e.target.value)}
                // ใช้ defaultValue แทน value เพื่อให้พิมพ์ลื่นไหลไม่กระตุก
                defaultValue={searchParams.get('query')?.toString()}
            />
            <div className="absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-500 peer-focus:text-amber-500">
                🔍
            </div>
        </div>
    )
}