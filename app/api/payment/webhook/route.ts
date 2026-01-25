// app/api/payment/webhook/route.ts
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

export async function POST(req: Request) {
    try {
        // Check if Stripe is configured
        if (!stripe) {
            return NextResponse.json(
                { error: 'Payment system not configured' },
                { status: 503 }
            )
        }

        const body = await req.text()
        const headersList = await headers()
        const signature = headersList.get('stripe-signature')

        if (!signature) {
            return NextResponse.json(
                { error: 'No signature' },
                { status: 400 }
            )
        }

        // Verify webhook signature
        let event: Stripe.Event
        try {
            event = stripe.webhooks.constructEvent(
                body,
                signature,
                process.env.STRIPE_WEBHOOK_SECRET!
            )
        } catch (err: any) {
            console.error('Webhook signature verification failed:', err.message)
            return NextResponse.json(
                { error: `Webhook Error: ${err.message}` },
                { status: 400 }
            )
        }

        // Handle the event
        switch (event.type) {
            case 'checkout.session.completed':
                const session = event.data.object as Stripe.Checkout.Session
                await handleCheckoutCompleted(session)
                break

            case 'checkout.session.expired':
                const expiredSession = event.data.object as Stripe.Checkout.Session
                await handleCheckoutExpired(expiredSession)
                break

            default:
                console.log(`Unhandled event type: ${event.type}`)
        }

        return NextResponse.json({ received: true })

    } catch (error: any) {
        console.error('Webhook error:', error)
        return NextResponse.json(
            { error: error.message || 'Webhook processing failed' },
            { status: 500 }
        )
    }
}

/**
 * Handle successful checkout
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    try {
        const { orderNo, transactionId, itemType, itemId } = session.metadata || {}

        if (!transactionId) {
            console.error('No transaction ID in session metadata')
            return
        }

        console.log('Processing successful payment:', {
            sessionId: session.id,
            orderNo,
            transactionId
        })

        // Update transaction
        await prisma.transaction.update({
            where: { id: transactionId },
            data: {
                status: 'SUCCESS',
                stripePaymentIntent: session.payment_intent as string,
                paymentDate: new Date(),
                paymentMethod: session.payment_method_types?.[0] || 'unknown'
            }
        })

        // Process the purchase
        await processPurchase({
            transactionId,
            itemType: itemType || '',
            itemId: itemId || '',
            userId: session.metadata?.userId || ''
        })

        console.log('Payment processed successfully:', orderNo)

    } catch (error) {
        console.error('Error handling checkout completed:', error)
        throw error
    }
}

/**
 * Handle expired/cancelled checkout
 */
async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
    try {
        const { transactionId } = session.metadata || {}

        if (!transactionId) {
            return
        }

        console.log('Processing expired checkout:', session.id)

        await prisma.transaction.update({
            where: { id: transactionId },
            data: {
                status: 'FAILED'
            }
        })

    } catch (error) {
        console.error('Error handling checkout expired:', error)
    }
}

/**
 * Process purchase after successful payment
 */
async function processPurchase(params: {
    transactionId: string
    itemType: string
    itemId: string
    userId: string
}) {
    const { itemType, itemId, userId } = params

    try {
        switch (itemType) {
            case 'MARKETPLACE_ITEM':
                console.log('Processing marketplace item purchase:', {
                    userId,
                    itemId
                })

                // TODO: Add item to user's inventory
                // Example:
                // await prisma.inventoryItem.create({
                //   data: {
                //     userId,
                //     marketplaceItemId: itemId,
                //     acquiredAt: new Date()
                //   }
                // })
                break

            case 'CAMPAIGN':
                console.log('Processing campaign purchase:', {
                    userId,
                    itemId
                })

                // TODO: Grant access to campaign
                // await prisma.purchase.create({
                //   data: {
                //     userId,
                //     campaignId: itemId,
                //     purchasedAt: new Date()
                //   }
                // })
                break

            case 'GM_QUEUE':
                console.log('Processing GM queue booking:', {
                    userId,
                    itemId
                })
                // TODO: Create GM session booking
                break

            default:
                console.warn('Unknown item type:', itemType)
        }

        // TODO: Send email notification
        // await sendPurchaseConfirmationEmail(params)

    } catch (error) {
        console.error('Purchase processing error:', error)
        // Don't throw - transaction is already marked as SUCCESS
    }
}
