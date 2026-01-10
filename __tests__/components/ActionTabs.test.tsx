import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ActionTabs from '@/components/player/ActionTabs'

describe('ActionTabs Component', () => {
    it('renders all three tabs', () => {
        const mockOnAction = vi.fn()
        render(<ActionTabs onAction={mockOnAction} />)

        expect(screen.getByText(/⚔️.*ATTACK/i)).toBeInTheDocument()
        expect(screen.getByText(/✨.*SKILLS/i)).toBeInTheDocument()
        expect(screen.getByText(/🎒.*ITEMS/i)).toBeInTheDocument()
    })

    it('switches between tabs when clicked', () => {
        const mockOnAction = vi.fn()
        render(<ActionTabs onAction={mockOnAction} />)

        // Click Skills tab
        const skillsTab = screen.getByText(/✨.*SKILLS/i)
        fireEvent.click(skillsTab)

        // Should show skill buttons
        expect(screen.getByText(/Fireball/i)).toBeInTheDocument()
    })

    it('calls onAction when attack button is clicked', () => {
        const mockOnAction = vi.fn()
        render(<ActionTabs onAction={mockOnAction} />)

        // Find and click attack button
        const attackButton = screen.getByText(/Basic Attack/i)
        fireEvent.click(attackButton)

        expect(mockOnAction).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'attack',
                name: 'Basic Attack',
            })
        )
    })

    it('calls onAction when skill is used', () => {
        const mockOnAction = vi.fn()
        render(<ActionTabs onAction={mockOnAction} />)

        // Switch to Skills tab
        fireEvent.click(screen.getByText(/✨.*SKILLS/i))

        // Click Fireball skill
        const fireballButton = screen.getByText(/Fireball/i)
        fireEvent.click(fireballButton)

        expect(mockOnAction).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'skill',
                name: 'Fireball',
            })
        )
    })

    it('disables all buttons when disabled prop is true', () => {
        const mockOnAction = vi.fn()
        render(<ActionTabs onAction={mockOnAction} disabled={true} />)

        const attackButton = screen.getByText(/Basic Attack/i)
        expect(attackButton).toBeDisabled()
    })

    it('shows mana cost for skills', () => {
        const mockOnAction = vi.fn()
        render(<ActionTabs onAction={mockOnAction} />)

        // Switch to Skills tab
        fireEvent.click(screen.getByText(/✨.*SKILLS/i))

        // Check for mana cost display
        expect(screen.getByText(/15.*MP/i)).toBeInTheDocument() // Fireball costs 15 MP
    })
})
