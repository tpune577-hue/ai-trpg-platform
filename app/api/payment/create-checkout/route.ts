import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { stripe, generateOrderNo } from '@/lib/stripe'

export async function POST(req: Request) {
    try {
        // Check if Stripe is configured
        // Check if Stripe is configured
        if (!stripe) {
            console.error("Stripe is not initialized. Key present:", !!process.env.STRIPE_SECRET_KEY)
            return NextResponse.json(
                {
                    error: 'Payment system not configured',
                    debug: {
                        hasKey: !!process.env.STRIPE_SECRET_KEY,
                        env: process.env.NODE_ENV
                    }
                },
                { status: 503 }
            )
        }

        // 1. Check authentication
        const session = await auth()
        if (!session?.user?.email || !session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // 2. Parse request body
        const body = await req.json()
        const { itemType, itemId, metadata } = body // amount ไม่ต้องรับจาก Frontend ให้ดึงจาก DB เองเพื่อความปลอดภัย

        if (!itemType || !itemId) {
            return NextResponse.json(
                { error: 'Missing required fields: itemType, itemId' },
                { status: 400 }
            )
        }

        // 3. Validate item & Fetch Data
        let itemData: any = null
        let itemName = ''
        let itemDescription = ''
        let price = 0
        let images: string[] = []

        switch (itemType) {
            // ✅ Case 1: ระบบใหม่ (Asset & Live Session)
            case 'DIGITAL_ASSET':
            case 'LIVE_SESSION':
            case 'MARKETPLACE_ITEM': // เผื่อไว้ถ้า Frontend ส่ง type นี้มา
                itemData = await prisma.marketplaceItem.findUnique({
                    where: { id: itemId }
                })

                if (itemData) {
                    // ⚠️ สำคัญ: เช็คที่นั่งว่างสำหรับ LIVE_SESSION
                    if (itemType === 'LIVE_SESSION' && itemData.type === 'LIVE_SESSION') {
                        const currentSeats = itemData.currentPlayers || 0
                        const maxSeats = itemData.maxPlayers || 0

                        if (currentSeats >= maxSeats) {
                            return NextResponse.json({ error: 'Sorry, this session is fully booked!' }, { status: 400 })
                        }
                        itemName = `Ticket: ${itemData.title || itemData.name}`
                        itemDescription = `Session Date: ${itemData.sessionDate ? new Date(itemData.sessionDate).toLocaleString() : 'TBA'}`
                    } else {
                        itemName = itemData.title || 'Digital Asset'
                        itemDescription = itemData.description || 'Digital Download'
                    }

                    price = itemData.price
                    if (itemData.imageUrl) images = [itemData.imageUrl]
                }
                break

            // ✅ Case 2: ระบบเก่า (Campaign)
            case 'CAMPAIGN':
                itemData = await prisma.campaign.findUnique({
                    where: { id: itemId }
                })
                if (itemData) {
                    itemName = itemData.title || 'Campaign'
                    itemDescription = itemData.description || 'Digital Campaign Asset'
                    price = itemData.price
                    if (itemData.coverImage) images = [itemData.coverImage]
                }
                break

            default:
                return NextResponse.json(
                    { error: `Unsupported item type: ${itemType}` },
                    { status: 400 }
                )
        }

        if (!itemData) {
            return NextResponse.json(
                { error: 'Item not found' },
                { status: 404 }
            )
        }

        // 4. Create transaction record
        const orderNo = generateOrderNo()
        const transaction = await prisma.transaction.create({
            data: {
                orderNo,
                amount: price,
                userId: session.user.id,
                itemType, // เก็บ type ที่ส่งมาเพื่อใช้แยกใน Webhook
                itemId,
                metadata: {
                    ...metadata,
                    itemName,
                    itemDescription
                },
                status: 'PENDING'
            }
        })

        // 5. Create Stripe Checkout Session
        const checkoutSession = await stripe.checkout.sessions.create({
            mode: 'payment',
            // ✅ Auto-fill Email ลูกค้าจาก Google Account
            customer_email: session.user.email,
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'thb',
                        product_data: {
                            name: itemName,
                            description: itemDescription?.substring(0, 100), // Stripe จำกัดความยาว
                            images: images.length > 0 ? images : undefined,
                        },
                        unit_amount: Math.round(price * 100), // แปลงเป็นสตางค์
                    },
                    quantity: 1,
                }
            ],
            // ใช้ URL เดิมของคุณ
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/marketplace?canceled=true`,
            metadata: {
                orderNo,
                transactionId: transaction.id,
                itemType,
                itemId,
                userId: session.user.id
            }
        })

        // 6. Update transaction with Stripe session ID
        await prisma.transaction.update({
            where: { id: transaction.id },
            data: {
                stripeSessionId: checkoutSession.id
            }
        })

        // 7. Return checkout URL
        return NextResponse.json({
            success: true,
            url: checkoutSession.url, // ✅ ส่ง url กลับไปให้ Frontend redirect
            sessionId: checkoutSession.id,
            orderNo,
            transactionId: transaction.id
        })

    } catch (error: any) {
        console.error('Checkout creation error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to create checkout session' },
            { status: 500 }
        )
    }
}