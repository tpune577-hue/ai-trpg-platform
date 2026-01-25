import { supabaseAdmin } from './supabaseClient'

/**
 * ฟังก์ชันสำหรับอัปโหลดไฟล์ไปที่ Supabase Storage
 * @param file ไฟล์จาก input element
 * @param bucket ชื่อ bucket (เช่น 'assets')
 */
export async function uploadToSupabase(file: File, bucket: string = 'assets') {
    // Check if Supabase is configured
    if (!supabaseAdmin) {
        throw new Error('Supabase is not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment variables.')
    }

    // 1. สร้างชื่อไฟล์ใหม่เพื่อป้องกันชื่อซ้ำ (เช่น timestamp + ชื่อเดิม)
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `uploads/${fileName}`

    // 2. สั่งอัปโหลดไฟล์ (ใช้ admin client เพื่อ bypass RLS)
    const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .upload(filePath, file)

    if (error) throw error

    // 3. ดึง Public URL มาเพื่อใช้เก็บใน Database
    const { data: { publicUrl } } = supabaseAdmin.storage
        .from(bucket)
        .getPublicUrl(filePath)

    return publicUrl
}