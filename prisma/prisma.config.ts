import { defineConfig } from '@prisma/client'

export default defineConfig({
    datasources: {
        db: {
            url: process.env.DATABASE_URL || 'postgresql://username:password@localhost:5432/ai_trpg_platform?schema=public'
        }
    }
})
