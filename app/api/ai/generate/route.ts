import { GoogleGenerativeAI } from "@google/generative-ai"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
    try {
        const apiKey = process.env.GEMINI_API_KEY
        if (!apiKey) {
            return NextResponse.json({ error: "Missing API Key" }, { status: 500 })
        }

        const body = await req.json()
        const { campaignId, history = [], gameState } = body

        // 1. ดึงข้อมูล Campaign
        const campaign = await prisma.campaign.findUnique({
            where: { id: campaignId },
        })

        if (!campaign) {
            return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
        }

        // 2. เตรียมข้อความ System Prompt (บทบาท)
        const systemPromptText = `
      You are the Game Master named "${campaign.aiName || 'GM'}".
      
      [CAMPAIGN INFO]
      Title: ${campaign.title}
      Description: ${campaign.description || '-'}
      System: ${campaign.system || 'Standard'}
      
      [YOUR PERSONALITY]
      Style: ${campaign.aiStyle || 'Balanced'}
      Traits: ${campaign.aiPersonality || 'Fair'}
      ${campaign.aiCustomPrompt ? `Extra Rules: ${campaign.aiCustomPrompt}` : ''}
      
      [CURRENT CONTEXT]
      Scene: ${gameState?.currentScene || 'Unknown'}
      Active NPCs: ${gameState?.activeNpcs?.join(', ') || 'None'}
      
      [INSTRUCTIONS]
      - Roleplay as the GM.
      - Keep responses concise (under 3-4 sentences).
      - Ask players for rolls when needed.
      - Do NOT break character.
    `

        // 3. เริ่มต้น Gemini
        const genAI = new GoogleGenerativeAI(apiKey)

        // ✅ แก้ไข 1: เปลี่ยนมาใช้ "gemini-pro" (เสถียรที่สุด)
        // และเอา systemInstruction ออก (เพราะ gemini-pro บางเวอร์ชันไม่รองรับ parameter นี้)
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
        })

        // 4. เตรียม Chat History
        // ✅ แก้ไข 2: ยัด System Prompt ไปเป็นข้อความแรกสุดของ User
        // เพื่อบังคับให้ gemini-pro เข้าใจบทบาท (Technical workaround)
        let chatHistory = [
            {
                role: "user",
                parts: [{ text: `SYSTEM INSTRUCTION: ${systemPromptText}` }]
            },
            {
                role: "model",
                parts: [{ text: "Understood. I am ready to be the Game Master." }]
            }
        ]

        // เอา History จาก Frontend มาต่อท้าย
        const userHistory = history.map((msg: any) => ({
            role: (msg.role === 'assistant' || msg.role === 'GM' || msg.role === 'model') ? 'model' : 'user',
            parts: [{ text: String(msg.content || "") }]
        }))

        // รวมร่าง (System Init + User History)
        // ดึงข้อความล่าสุดออกมาส่งแยก (ตามท่ามาตรฐาน SDK)
        const lastMessageObj = userHistory.pop()
        const lastMessage = lastMessageObj?.parts[0]?.text || "Hello"

        const finalHistory = [...chatHistory, ...userHistory]

        // 5. ส่งข้อความ
        const chat = model.startChat({
            history: finalHistory,
        })

        const result = await chat.sendMessage(lastMessage)
        const responseText = result.response.text()

        return NextResponse.json({ result: responseText })

    } catch (error: any) {
        console.error("Gemini Error:", error)
        return NextResponse.json({
            error: "AI Processing Failed",
            details: error.message
        }, { status: 500 })
    }
}