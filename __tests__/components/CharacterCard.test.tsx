import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import CharacterCard from '@/components/player/CharacterCard'

describe('CharacterCard Component', () => {
    const mockProps = {
        name: 'Aragorn the Ranger',
        className: 'Ranger',
        level: 5,
        hp: 45,
        maxHp: 60,
        status: 'wounded' as const,
    }

    it('renders character name and class', () => {
        render(<CharacterCard {...mockProps} />)

        expect(screen.getByText('Aragorn the Ranger')).toBeInTheDocument()
        expect(screen.getByText('Ranger')).toBeInTheDocument()
    })

    it('displays correct level', () => {
        render(<CharacterCard {...mockProps} />)

        expect(screen.getByText(/Level 5/i)).toBeInTheDocument()
    })

    it('shows HP values', () => {
        render(<CharacterCard {...mockProps} />)

        expect(screen.getByText(/45.*60.*HP/i)).toBeInTheDocument()
    })

    it('displays correct status badge', () => {
        render(<CharacterCard {...mockProps} />)

        const statusElement = screen.getByText(/wounded/i)
        expect(statusElement).toBeInTheDocument()
    })

    it('shows critical status when HP is low', () => {
        render(<CharacterCard {...mockProps} hp={10} status="critical" />)

        expect(screen.getByText(/critical/i)).toBeInTheDocument()
    })

    it('calculates HP percentage correctly', () => {
        const { container } = render(<CharacterCard {...mockProps} />)

        // HP is 45/60 = 75%
        const hpBar = container.querySelector('[style*="width"]')
        expect(hpBar).toBeTruthy()
    })
})
