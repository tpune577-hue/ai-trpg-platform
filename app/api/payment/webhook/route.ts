import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { sendBookingEmail } from '@/lib/email'
import { fulfillOrder } from '@/lib/payment-service'

export async function POST(req: Request) {
    const body = await req.text()
    const headerList = await headers()
    const signature = headerList.get('Stripe-Signature') as string

    let event

    // 1. Initialize Stripe
    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (!stripeKey) {
        console.error("❌ STRIPE_SECRET_KEY is missing in runtime!")
        return NextResponse.json({ error: "Stripe not initialized" }, { status: 500 })
    }

    const stripe = new Stripe(stripeKey, {
        apiVersion: '2025-12-15.clover',
        typescript: true,
    })

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        )
    } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`)
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as any
        const { userId, itemId, itemType, transactionId } = session.metadata

        console.log(`💰 Payment success for ${itemType}: ${itemId}`)

        // ✅ Use shared fulfillment logic
        if (transactionId) {
            await fulfillOrder(
                transactionId,
                itemType,
                itemId,
                userId,
                session.payment_method_types?.[0] || 'card',
                session.payment_intent as string
            )
        }
    }

    return NextResponse.json({ received: true })
}