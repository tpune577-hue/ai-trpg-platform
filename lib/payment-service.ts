import { prisma } from '@/lib/prisma'
import { sendBookingEmail } from '@/lib/email'

export async function fulfillOrder(
    transactionId: string,
    itemType: string,
    itemId: string,
    userId: string,
    paymentMethod: string = 'card',
    stripePaymentIntent: string | null = null
) {
    console.log(`💰 Processing fulfillment for ${itemType}: ${itemId} (Transaction: ${transactionId})`)

    try {
        // 1. Update Transaction
        await prisma.transaction.update({
            where: { id: transactionId },
            data: {
                status: 'COMPLETED',
                paymentMethod,
                paymentDate: new Date(),
                stripePaymentIntent
            }
        })

        // 2. Handle specific item types
        // --- Live Session, Digital Asset, Marketplace Item ---
        if (itemType === 'LIVE_SESSION' || itemType === 'DIGITAL_ASSET' || itemType === 'MARKETPLACE_ITEM') {

            // A. Create Booking/Ownership
            await prisma.booking.create({
                data: {
                    userId: userId,
                    itemId: itemId,
                    status: 'CONFIRMED'
                }
            })

            // B. Special handling for Live Sessions
            if (itemType === 'LIVE_SESSION') {
                // Update seats and get creator info
                const updatedItem = await prisma.marketplaceItem.update({
                    where: { id: itemId },
                    data: {
                        currentPlayers: { increment: 1 }
                    },
                    include: { creator: true }
                }) as any // Explicit cast for stale Prisma Client

                // Send Email
                try {
                    const buyer = await prisma.user.findUnique({ where: { id: userId } })
                    const recipientEmail = buyer?.email
                    const creatorEmail = updatedItem.creator?.email

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
                    }
                } catch (emailError) {
                    console.error("❌ Failed to send booking email:", emailError)
                }
            }
        }
        // --- Campaign Legacy ---
        else if (itemType === 'CAMPAIGN') {
            // Need to fetch transaction or pass price? 
            // For now, assuming price is not strictly needed for the Purchase record logic unless we want to record it there.
            // The Schema has price in Purchase model.
            // We'll fetch the transaction to get the amount if needed, but for now defaulting to 0 or fetching logic is complex.
            // Let's rely on standard flow.

            // To be safe, we might need to fetch the item price again or just pass it.
            // But Purchase.price is float.

            const transaction = await prisma.transaction.findUnique({ where: { id: transactionId } })

            await prisma.purchase.create({
                data: {
                    userId: userId,
                    campaignId: itemId,
                    price: transaction?.amount || 0
                }
            })
        }

        return true

    } catch (error) {
        console.error('❌ Error in fulfillOrder:', error)
        throw error // Re-throw to be handled by caller
    }
}
