// app/api/payment/create-checkout/route.ts
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { stripe, generateOrderNo } from '@/lib/stripe'

export async function POST(req: Request) {
    try {
        // 1. Check authentication
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // 2. Parse request body
        const body = await req.json()
        const { itemType, itemId, amount, metadata } = body

        if (!itemType || !itemId || !amount) {
            return NextResponse.json(
                { error: 'Missing required fields: itemType, itemId, amount' },
                { status: 400 }
            )
        }

        // 3. Validate item exists based on type
        let itemData: any = null
        let itemName = ''
        let itemDescription = ''

        switch (itemType) {
            case 'MARKETPLACE_ITEM':
                itemData = await prisma.marketplaceItem.findUnique({
                    where: { id: itemId }
                })
                if (itemData) {
                    itemName = itemData.title || 'Marketplace Item'
                    itemDescription = itemData.description || ''
                }
                break

            case 'CAMPAIGN':
                itemData = await prisma.campaign.findUnique({
                    where: { id: itemId }
                })
                if (itemData) {
                    itemName = itemData.title || 'Campaign'
                    itemDescription = itemData.description || ''
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
                amount,
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

        // 5. Create Stripe Checkout Session
        const checkoutSession = await stripe.checkout.sessions.create({
            mode: 'payment',
            line_items: [
                {
                    price_data: {
                        currency: 'thb',
                        product_data: {
                            name: itemName,
                            description: itemDescription
                        },
                        unit_amount: amount * 100 // Stripe uses cents/satang
                    },
                    quantity: 1
                }
            ],
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/failed`,
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
            sessionUrl: checkoutSession.url,
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
