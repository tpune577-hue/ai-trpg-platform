import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
// ❌ ลบการ import stripe จาก lib ออก
// import { stripe, generateOrderNo } from '@/lib/stripe' 
import { generateOrderNo } from '@/lib/stripe' // import แค่ function สร้างเลข Order พอ
import Stripe from 'stripe' // ✅ Import Class Stripe โดยตรง
import { fulfillOrder } from '@/lib/payment-service'

export async function POST(req: Request) {
    try {
        // 2. Check authentication
        const session = await auth()
        if (!session?.user?.email || !session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // 3. Parse request body
        const body = await req.json()
        const { itemType, itemId, metadata } = body

        if (!itemType || !itemId) {
            return NextResponse.json(
                { error: 'Missing required fields: itemType, itemId' },
                { status: 400 }
            )
        }

        // 4. Validate item & Fetch Data
        let itemData: any = null
        let itemName = ''
        let itemDescription = ''
        let price = 0
        let images: string[] = []

        switch (itemType) {
            case 'DIGITAL_ASSET':
            case 'LIVE_SESSION':
            case 'MARKETPLACE_ITEM':
                itemData = await prisma.marketplaceItem.findUnique({
                    where: { id: itemId }
                })

                if (itemData) {
                    if (itemType === 'LIVE_SESSION' && itemData.type === 'LIVE_SESSION') {
                        const currentSeats = itemData.currentPlayers || 0
                        const maxSeats = itemData.maxPlayers || 0

                        if (currentSeats >= maxSeats) {
                            return NextResponse.json({ error: 'Sorry, this session is fully booked!' }, { status: 400 })
                        }
                        itemName = `Ticket: ${itemData.title || itemData.name}`
                        itemDescription = `Session Date: ${itemData.sessionDate ? new Date(itemData.sessionDate).toLocaleString() : 'TBA'}`
                    } else {
                        itemName = itemData.title || itemData.name || 'Digital Asset'
                        itemDescription = itemData.description || 'Digital Download'
                    }

                    price = itemData.price
                    if (itemData.imageUrl) images = [itemData.imageUrl]
                }
                break

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

        // 5. Create transaction record
        const orderNo = generateOrderNo()
        const transaction = await prisma.transaction.create({
            data: {
                orderNo,
                amount: price,
                userId: session.user.id,
                itemType,
                itemId,
                metadata: {
                    ...metadata,
                    itemName,
                    itemDescription
                },
                status: 'PENDING'
            }
        })

        // 6. Handle Free Items (Price = 0)
        // ✅ ถ้าฟรี ตัดจบตรงนี้เลย ไม่ต้องไปยุ่งกับ Stripe Key
        if (price === 0) {
            await fulfillOrder(
                transaction.id,
                itemType,
                itemId,
                session.user.id,
                'free',
                null
            )

            // ✅ Determine base URL safely
            const protocol = req.headers.get('x-forwarded-proto') || 'http'
            const host = req.headers.get('host')
            const origin = req.headers.get('origin') || `${protocol}://${host}`
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || origin

            return NextResponse.json({
                success: true,
                url: `${baseUrl}/payment/success?orderNo=${orderNo}`,
                sessionId: 'free-order',
                orderNo,
                transactionId: transaction.id
            })
        }

        // 7. Create Stripe Checkout Session (For Paid Items Only)
        // ---------------------------------------------------------
        // ✅ ย้าย Logic การ Init Stripe มาไว้ตรงนี้
        const stripeKey = process.env.STRIPE_SECRET_KEY
        if (!stripeKey) {
            console.error("❌ STRIPE_SECRET_KEY is missing in runtime!")
            return NextResponse.json(
                { error: 'Payment system not configured' },
                { status: 503 }
            )
        }

        const stripe = new Stripe(stripeKey, {
            apiVersion: '2025-12-15.clover',
            typescript: true,
        })
        // ---------------------------------------------------------

        const checkoutSession = await stripe.checkout.sessions.create({
            mode: 'payment',
            customer_email: session.user.email,
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'thb',
                        product_data: {
                            name: itemName,
                            description: itemDescription?.substring(0, 100),
                            images: images.length > 0 ? images : undefined,
                        },
                        unit_amount: Math.round(price * 100),
                    },
                    quantity: 1,
                }
            ],
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

        // 7. Update transaction
        await prisma.transaction.update({
            where: { id: transaction.id },
            data: {
                stripeSessionId: checkoutSession.id
            }
        })

        return NextResponse.json({
            success: true,
            url: checkoutSession.url,
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