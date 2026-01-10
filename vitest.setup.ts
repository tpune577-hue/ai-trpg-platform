import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Cleanup after each test
afterEach(() => {
    cleanup()
})

// Mock environment variables if needed
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000'
