import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Button from '@/components/Button'

describe('Button Component', () => {
    it('renders with correct text', () => {
        render(<Button>Click Me</Button>)

        const button = screen.getByRole('button', { name: /click me/i })
        expect(button).toBeInTheDocument()
    })

    it('calls onClick handler when clicked', () => {
        let clicked = false
        const handleClick = () => {
            clicked = true
        }

        render(<Button onClick={handleClick}>Click Me</Button>)

        const button = screen.getByRole('button')
        fireEvent.click(button)

        expect(clicked).toBe(true)
    })

    it('applies custom className', () => {
        render(<Button className="custom-class">Styled Button</Button>)

        const button = screen.getByRole('button')
        expect(button).toHaveClass('custom-class')
    })

    it('is disabled when disabled prop is true', () => {
        render(<Button disabled>Disabled Button</Button>)

        const button = screen.getByRole('button')
        expect(button).toBeDisabled()
    })

    it('renders with different variants', () => {
        const { rerender } = render(<Button variant="primary">Primary</Button>)
        let button = screen.getByRole('button')
        expect(button).toHaveClass('bg-amber-500')

        rerender(<Button variant="secondary">Secondary</Button>)
        button = screen.getByRole('button')
        expect(button).toHaveClass('bg-slate-700')
    })
})
