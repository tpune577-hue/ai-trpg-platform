import { Resend } from 'resend';

// Initialize Resend safely - won't crash build if env var is missing
const apiKey = process.env.RESEND_API_KEY
const resend = apiKey ? new Resend(apiKey) : null;

// กำหนด Type ของข้อมูลที่จะส่งเข้ามา เพื่อความชัวร์
interface SessionDetails {
    title: string;
    date: Date | null;
    duration: number | null;
    link: string | null;
    price: number;
}

export const sendBookingEmail = async (
    playerEmail: string,
    gmEmail: string | null, // GM อาจไม่มี email ในบางกรณี (แต่ควรมี)
    sessionDetails: SessionDetails
) => {
    try {
        if (!resend) {
            console.warn("⚠️ Resend is not initialized (missing API Key). Skipping email.")
            return
        }

        // แปลงวันที่เป็น format ที่อ่านง่าย (เช่น Mon, 25 Dec 2023, 08:00 PM)
        const dateStr = sessionDetails.date
            ? new Date(sessionDetails.date).toLocaleString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            })
            : 'Date to be announced';

        const durationStr = sessionDetails.duration ? `${sessionDetails.duration} Minutes` : '-';

        // ==========================================
        // 1. ส่งอีเมลหาผู้เล่น (Player) - ตั๋วเข้างาน
        // ==========================================
        await resend.emails.send({
            from: 'TRPG Platform <onboarding@resend.dev>', // ถ้ายังไม่ได้ verify domain ให้ใช้เมลนี้ทดสอบก่อน
            to: playerEmail,
            subject: `🎟️ Ticket Confirmed: ${sessionDetails.title}`,
            html: `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
          
          <div style="background-color: #1e293b; padding: 20px; text-align: center;">
            <h1 style="color: #f59e0b; margin: 0; font-size: 24px;">Adventure Confirmed! ⚔️</h1>
          </div>

          <div style="padding: 30px;">
            <p style="font-size: 16px; color: #334155;">Hello Traveler,</p>
            <p style="font-size: 16px; color: #334155;">Your seat for <strong>"${sessionDetails.title}"</strong> has been successfully booked.</p>

            <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 20px; margin: 25px 0;">
              <div style="margin-bottom: 10px;">
                <strong style="color: #64748b; font-size: 12px; text-transform: uppercase;">Date & Time</strong>
                <div style="font-size: 18px; color: #0f172a; font-weight: bold;">${dateStr}</div>
              </div>
              
              <div style="margin-bottom: 10px;">
                <strong style="color: #64748b; font-size: 12px; text-transform: uppercase;">Duration</strong>
                <div style="font-size: 16px; color: #0f172a;">${durationStr}</div>
              </div>

              <div>
                <strong style="color: #64748b; font-size: 12px; text-transform: uppercase;">Game Link</strong>
                <div style="margin-top: 5px;">
                  <a href="${sessionDetails.link || '#'}" style="color: #2563eb; text-decoration: none; font-weight: bold;">
                    ${sessionDetails.link || 'Link will be provided by GM'}
                  </a>
                </div>
              </div>
            </div>

            <div style="text-align: center; margin-top: 30px;">
              <a href="${sessionDetails.link || process.env.NEXT_PUBLIC_APP_URL + '/marketplace'}" 
                 style="background-color: #22c55e; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
                 Open Game Link 🚀
              </a>
            </div>
            
            <p style="font-size: 14px; color: #64748b; margin-top: 30px; text-align: center;">
              Please ensure you have a working microphone and arrive 10 minutes early.
            </p>
          </div>
          
          <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #94a3b8;">
            TRPG Platform - Your Gateway to Adventure
          </div>
        </div>
      `,
        });

        console.log(`✅ Email sent to player: ${playerEmail}`);

        // ==========================================
        // 2. ส่งอีเมลหา GM (Seller) - แจ้งเตือนลูกค้าใหม่
        // ==========================================
        if (gmEmail) {
            await resend.emails.send({
                from: 'TRPG Platform <onboarding@resend.dev>',
                to: gmEmail,
                subject: `🔔 New Booking Alert: ${sessionDetails.title}`,
                html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0f172a;">New Player Joined! 🎉</h2>
            <p>You have a new booking for your session.</p>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px; color: #64748b;">Session</td>
                <td style="padding: 10px; font-weight: bold;">${sessionDetails.title}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px; color: #64748b;">Player Email</td>
                <td style="padding: 10px; font-weight: bold; color: #2563eb;">${playerEmail}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px; color: #64748b;">Date</td>
                <td style="padding: 10px;">${dateStr}</td>
              </tr>
              <tr>
                <td style="padding: 10px; color: #64748b;">Earnings</td>
                <td style="padding: 10px; color: #22c55e; font-weight: bold;">+ ฿${sessionDetails.price}</td>
              </tr>
            </table>

            <p style="margin-top: 20px; font-size: 14px; color: #64748b;">
              You can view all bookings in your <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard">Dashboard</a>.
            </p>
          </div>
        `,
            });
            console.log(`✅ Email notification sent to GM: ${gmEmail}`);
        }

    } catch (error) {
        console.error('❌ Failed to send email:', error);
        // ไม่ throw error เพื่อไม่ให้ Webhook ของ Stripe พัง (เพราะจ่ายเงินสำเร็จไปแล้ว)
    }
};