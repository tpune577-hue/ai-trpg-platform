import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth' // ✅ นำเข้า auth เพื่อเช็ค session

export async function POST(request: NextRequest) {
    try {
        // 1. ตรวจสอบสิทธิ์ (Authentication)
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'You must be logged in to create an asset' },
                { status: 401 }
            )
        }

        const body = await request.json()
        const { title, description, type, price, imageUrl, tags } = body

        // 2. Validate required fields
        if (!title || !type || price === undefined || !imageUrl) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        // 3. สร้าง Marketplace Item ผูกกับ ID ของคนที่ Login อยู่
        const item = await prisma.marketplaceItem.create({
            data: {
                title,
                description,
                type,
                price: Number(price),
                creatorId: session.user.id, // ✅ ใช้ ID จาก Session จริง
                isPublished: true,
                // ✅ เก็บข้อมูลลงใน JSON ฟิลด์เดียวตาม Schema ของคุณ
                data: JSON.stringify({
                    imageUrl,
                    tags: tags || [],
                    createdAt: new Date().toISOString()
                }),
            },
        })

        return NextResponse.json({
            success: true,
            item: {
                ...item,
                data: JSON.parse(item.data) // ส่งกลับไปเป็น Object ให้ Frontend ใช้ง่ายๆ
            }
        })

    } catch (error: any) {
        console.error('Error creating marketplace item:', error)

        // จัดการ Error เฉพาะกรณี เช่น Database ล่ม
        return NextResponse.json(
            { error: error.message || 'Failed to create item' },
            { status: 500 }
        )
    }
}