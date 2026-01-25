// lib/stripe.ts
import Stripe from 'stripe'

// Make Stripe optional - won't throw error if not configured
export const stripe = process.env.STRIPE_SECRET_KEY
    ? new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2025-12-15.clover',
        typescript: true
    })
    : null

/**
 * Generate unique order number
 */
export function generateOrderNo(): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8).toUpperCase()
    return `ORDER-${timestamp}-${random}`
}
