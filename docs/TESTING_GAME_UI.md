# Testing Game UI Components - Complete Guide

## Quick Start

To test your game UI components, run:

```bash
# Run all tests
npm test

# Run with UI dashboard
npm run test:ui

# Run specific test file
npm test -- CharacterCard.test.tsx
```

## What We've Created

I've created example tests for your game components:

1. **CharacterCard Test** - `__tests__/components/CharacterCard.test.tsx`
2. **ActionTabs Test** - `__tests__/components/ActionTabs.test.tsx`
3. **Button Test** - `__tests__/example.test.tsx`

## How to Write Tests for Your Game UI

### Step 1: Create a Test File

Create a file in `__tests__/` folder with `.test.tsx` extension:

```
__tests__/
  ├── components/
  │   ├── CharacterCard.test.tsx
  │   ├── ActionTabs.test.tsx
  │   └── FeedbackPanel.test.tsx
  └── pages/
      └── PlayerController.test.tsx
```

### Step 2: Write Your Test

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import YourComponent from '@/components/YourComponent'

describe('YourComponent', () => {
  it('renders correctly', () => {
    render(<YourComponent />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })
})
```

### Step 3: Run the Test

```bash
npm test
```

## Testing Different Game Components

### Testing CharacterCard

```typescript
import { render, screen } from '@testing-library/react'
import CharacterCard from '@/components/player/CharacterCard'

it('shows character info', () => {
  render(
    <CharacterCard
      name="Aragorn"
      className="Ranger"
      level={5}
      hp={45}
      maxHp={60}
      status="healthy"
    />
  )
  
  expect(screen.getByText('Aragorn')).toBeInTheDocument()
  expect(screen.getByText('Ranger')).toBeInTheDocument()
})
```

### Testing ActionTabs (with user interaction)

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import ActionTabs from '@/components/player/ActionTabs'

it('calls action when button clicked', () => {
  const mockAction = vi.fn()
  
  render(<ActionTabs onAction={mockAction} />)
  
  const attackButton = screen.getByText(/attack/i)
  fireEvent.click(attackButton)
  
  expect(mockAction).toHaveBeenCalled()
})
```

### Testing FeedbackPanel (different states)

```typescript
import { render, screen } from '@testing-library/react'
import FeedbackPanel from '@/components/player/FeedbackPanel'

it('shows waiting state', () => {
  render(
    <FeedbackPanel
      status="waiting"
      message="Processing..."
    />
  )
  
  expect(screen.getByText('Processing...')).toBeInTheDocument()
})

it('shows success state', () => {
  render(
    <FeedbackPanel
      status="success"
      message="Action successful!"
    />
  )
  
  expect(screen.getByText('Action successful!')).toBeInTheDocument()
})
```

## Testing Pages

### Testing Player Controller Page

```typescript
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'

// Mock the useGameSocket hook
vi.mock('@/hooks/useGameSocket', () => ({
  useGameSocket: () => ({
    isConnected: true,
    isInRoom: true,
    sendPlayerAction: vi.fn(),
  }),
}))

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useParams: () => ({ campaignId: 'test-campaign' }),
}))

it('renders player controller', () => {
  const PlayerController = require('@/app/play/[campaignId]/page').default
  render(<PlayerController />)
  
  expect(screen.getByText('Player Controller')).toBeInTheDocument()
})
```

## Common Testing Patterns

### 1. Testing Conditional Rendering

```typescript
it('shows loading state', () => {
  render(<Component isLoading={true} />)
  expect(screen.getByText('Loading...')).toBeInTheDocument()
})

it('shows content when loaded', () => {
  render(<Component isLoading={false} />)
  expect(screen.getByText('Content')).toBeInTheDocument()
})
```

### 2. Testing User Interactions

```typescript
import userEvent from '@testing-library/user-event'

it('handles button click', async () => {
  const user = userEvent.setup()
  const mockClick = vi.fn()
  
  render(<Button onClick={mockClick}>Click</Button>)
  
  await user.click(screen.getByRole('button'))
  expect(mockClick).toHaveBeenCalled()
})
```

### 3. Testing Forms

```typescript
it('submits form with data', async () => {
  const user = userEvent.setup()
  const mockSubmit = vi.fn()
  
  render(<Form onSubmit={mockSubmit} />)
  
  await user.type(screen.getByLabelText('Name'), 'Aragorn')
  await user.click(screen.getByRole('button', { name: /submit/i }))
  
  expect(mockSubmit).toHaveBeenCalledWith({ name: 'Aragorn' })
})
```

### 4. Testing Socket.io Integration

```typescript
import { vi } from 'vitest'

// Mock the socket hook
vi.mock('@/hooks/useGameSocket', () => ({
  useGameSocket: vi.fn(() => ({
    isConnected: true,
    sendPlayerAction: vi.fn().mockResolvedValue({ success: true }),
  })),
}))

it('sends action via socket', async () => {
  const { useGameSocket } = require('@/hooks/useGameSocket')
  const mockSend = vi.fn()
  useGameSocket.mockReturnValue({
    isConnected: true,
    sendPlayerAction: mockSend,
  })
  
  render(<GameComponent />)
  
  fireEvent.click(screen.getByText('Attack'))
  expect(mockSend).toHaveBeenCalled()
})
```

## Debugging Failed Tests

### 1. See What's Rendered

```typescript
import { screen } from '@testing-library/react'

it('debug test', () => {
  render(<Component />)
  screen.debug() // Prints HTML to console
})
```

### 2. Check Specific Element

```typescript
const element = screen.getByRole('button')
console.log(element.outerHTML)
```

### 3. Use Test UI

```bash
npm run test:ui
```

Then click on failed tests to see:
- What was rendered
- What the test expected
- Error messages
- Stack traces

## Best Practices for Game UI Testing

### ✅ DO:
- Test user-visible behavior
- Test interactions (clicks, typing)
- Test different states (loading, error, success)
- Mock external dependencies (API, sockets)
- Use accessible queries (getByRole, getByLabelText)

### ❌ DON'T:
- Test implementation details
- Test internal state directly
- Rely on CSS classes for queries
- Test third-party libraries
- Make tests depend on each other

## Example: Complete Test Suite

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CharacterCard from '@/components/player/CharacterCard'

describe('CharacterCard', () => {
  const defaultProps = {
    name: 'Aragorn',
    className: 'Ranger',
    level: 5,
    hp: 50,
    maxHp: 100,
    status: 'healthy' as const,
  }

  it('renders character information', () => {
    render(<CharacterCard {...defaultProps} />)
    
    expect(screen.getByText('Aragorn')).toBeInTheDocument()
    expect(screen.getByText('Ranger')).toBeInTheDocument()
  })

  it('shows correct HP percentage', () => {
    render(<CharacterCard {...defaultProps} />)
    
    // 50/100 = 50%
    expect(screen.getByText(/50%/)).toBeInTheDocument()
  })

  it('displays critical status when HP is low', () => {
    render(
      <CharacterCard
        {...defaultProps}
        hp={10}
        status="critical"
      />
    )
    
    expect(screen.getByText(/critical/i)).toBeInTheDocument()
  })
})
```

## Running Tests

### Watch Mode (Development)
```bash
npm test
```
- Auto-runs when files change
- Fast feedback loop

### UI Mode (Visual)
```bash
npm run test:ui
```
- Beautiful dashboard
- Click to run specific tests
- See detailed results

### Coverage Report
```bash
npm run test:coverage
```
- Shows which code is tested
- HTML report in `coverage/` folder

## Next Steps

1. **Run existing tests**: `npm test`
2. **Open UI dashboard**: `npm run test:ui`
3. **Write tests for your components**
4. **Check coverage**: `npm run test:coverage`

## Resources

- Test files: `__tests__/components/`
- Testing guide: `docs/TESTING_GUIDE.md`
- Vitest docs: https://vitest.dev/
- Testing Library: https://testing-library.com/

---

**Start testing now!** Run `npm run test:ui` to see all your tests in a beautiful dashboard! 🧪✨
