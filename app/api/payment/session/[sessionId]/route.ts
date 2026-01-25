// app/api/payment/session/[sessionId]/route.ts
import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

export async function GET(
    req: Request,
    { params }: { params: { sessionId: string } }
) {
    try {
        const { sessionId } = params

        // Retrieve session from Stripe
        const session = await stripe.checkout.sessions.retrieve(sessionId)

        return NextResponse.json({
            success: true,
            session: {
                id: session.id,
                amount_total: session.amount_total,
                currency: session.currency,
                payment_status: session.payment_status,
                customer_email: session.customer_details?.email,
                metadata: session.metadata
            }
        })

    } catch (error: any) {
        console.error('Session retrieval error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to retrieve session' },
            { status: 500 }
        )
    }
}
