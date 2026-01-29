import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { sendBookingEmail } from '@/lib/email'

export async function POST(req: Request) {
    const body = await req.text()
    const headerList = await headers()
    const signature = headerList.get('Stripe-Signature') as string

    let event

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

        try {
            // ✅ 1. อัปเดตสถานะ Transaction
            if (transactionId) {
                await prisma.transaction.update({
                    where: { id: transactionId },
                    data: {
                        status: 'COMPLETED',
                        paymentMethod: session.payment_method_types?.[0] || 'card',
                        paymentDate: new Date(),
                        stripePaymentIntent: session.payment_intent as string
                    }
                }).catch(e => console.error("Failed to update transaction status:", e))
            }

            // ✅ 2. แยก Logic ตามประเภทสินค้า

            // --- กรณีสินค้าใหม่ (Asset & Live Session) ---
            if (itemType === 'LIVE_SESSION' || itemType === 'DIGITAL_ASSET' || itemType === 'MARKETPLACE_ITEM') {

                // A. สร้าง Booking (Ownership)
                await prisma.booking.create({
                    data: {
                        userId: userId,
                        itemId: itemId,
                        status: 'CONFIRMED'
                    }
                })

                // B. ถ้าเป็น Session ต้องตัดที่นั่งและส่งอีเมล
                if (itemType === 'LIVE_SESSION') {
                    // B1. อัปเดตจำนวนผู้เล่น +1 และดึงข้อมูล GM
                    const updatedItem = await prisma.marketplaceItem.update({
                        where: { id: itemId },
                        data: {
                            currentPlayers: { increment: 1 }
                        },
                        // ✅ แก้เป็น creator ตาม Schema เดิม
                        include: { creator: true }
                    })

                    // B2. ส่งอีเมล (ใส่ Try-Catch แยก เพื่อไม่ให้ Webhook พังถ้าส่งเมลไม่ได้)
                    try {
                        const buyer = await prisma.user.findUnique({ where: { id: userId } })
                        const recipientEmail = buyer?.email || session.customer_details?.email
                        const creatorEmail = updatedItem.creator?.email // Safe access

                        if (recipientEmail && creatorEmail) {
                            await sendBookingEmail(
                                recipientEmail,
                                creatorEmail,
                                {
                                    title: updatedItem.title || 'Game Session',
                                    date: updatedItem.sessionDate,
                                    duration: updatedItem.duration,
                                    link: updatedItem.gameLink,
                                    price: updatedItem.price
                                }
                            )
                            console.log(`📧 Booking email sent to ${recipientEmail}`)
                        } else {
                            console.warn("⚠️ Skipping email: Missing recipient or creator email.")
                        }
                    } catch (emailError) {
                        console.error("❌ Failed to send booking email:", emailError)
                        // ไม่ throw error ต่อ เพื่อให้ Webhook จบการทำงานได้ (เพราะจ่ายเงินและจองสำเร็จแล้ว)
                    }
                }
            }

            // --- กรณีสินค้าเก่า (Campaign Legacy) ---
            else if (itemType === 'CAMPAIGN') {
                await prisma.purchase.create({
                    data: {
                        userId: userId,
                        campaignId: itemId,
                        price: session.amount_total ? session.amount_total / 100 : 0
                    }
                })
            }

        } catch (error) {
            console.error('❌ Error processing webhook database update:', error)
            return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
        }
    }

    return NextResponse.json({ received: true })
}