# Unit Testing Guide - Vitest & React Testing Library

## Overview

This project uses **Vitest** as the test runner and **React Testing Library** for component testing. Vitest is a blazing-fast unit test framework powered by Vite, with full TypeScript support and Next.js compatibility.

## Installation

### Dependencies Installed

```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

**Packages**:
- `vitest` - Fast unit test framework
- `@vitejs/plugin-react` - React support for Vitest
- `@testing-library/react` - React component testing utilities
- `@testing-library/jest-dom` - Custom matchers for DOM elements
- `@testing-library/user-event` - User interaction simulation
- `jsdom` - DOM implementation for Node.js

## Configuration

### vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
```

**Key Features**:
- ✅ jsdom environment for DOM testing
- ✅ Global test APIs (describe, it, expect)
- ✅ TypeScript path alias support (`@/`)
- ✅ CSS import support
- ✅ Coverage reporting

### vitest.setup.ts

```typescript
import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
```

**Purpose**:
- Imports jest-dom matchers
- Auto-cleanup after each test
- Environment variable setup

## NPM Scripts

```json
{
  "test": "vitest",              // Run tests in watch mode
  "test:ui": "vitest --ui",      // Run with UI dashboard
  "test:coverage": "vitest --coverage"  // Run with coverage report
}
```

### Usage

```bash
# Run tests in watch mode
npm test

# Run tests once (CI mode)
npm test -- --run

# Run with UI dashboard
npm run test:ui

# Generate coverage report
npm run test:coverage
```

## Writing Tests

### Basic Test Structure

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MyComponent from '@/components/MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
```

### Example: Button Component Test

```typescript
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
    const handleClick = () => { clicked = true }

    render(<Button onClick={handleClick}>Click Me</Button>)
    fireEvent.click(screen.getByRole('button'))
    
    expect(clicked).toBe(true)
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
```

## Common Testing Patterns

### 1. Testing Component Rendering

```typescript
it('renders with props', () => {
  render(<Card title="Test" description="Description" />)
  
  expect(screen.getByText('Test')).toBeInTheDocument()
  expect(screen.getByText('Description')).toBeInTheDocument()
})
```

### 2. Testing User Interactions

```typescript
import userEvent from '@testing-library/user-event'

it('handles user input', async () => {
  const user = userEvent.setup()
  render(<Input />)
  
  const input = screen.getByRole('textbox')
  await user.type(input, 'Hello World')
  
  expect(input).toHaveValue('Hello World')
})
```

### 3. Testing Async Operations

```typescript
it('loads data asynchronously', async () => {
  render(<AsyncComponent />)
  
  expect(screen.getByText('Loading...')).toBeInTheDocument()
  
  const data = await screen.findByText('Data Loaded')
  expect(data).toBeInTheDocument()
})
```

### 4. Testing Hooks

```typescript
import { renderHook } from '@testing-library/react'
import { useCounter } from '@/hooks/useCounter'

it('increments counter', () => {
  const { result } = renderHook(() => useCounter())
  
  expect(result.current.count).toBe(0)
  
  result.current.increment()
  expect(result.current.count).toBe(1)
})
```

### 5. Mocking Functions

```typescript
import { vi } from 'vitest'

it('calls API on submit', async () => {
  const mockSubmit = vi.fn()
  render(<Form onSubmit={mockSubmit} />)
  
  fireEvent.click(screen.getByRole('button', { name: /submit/i }))
  
  expect(mockSubmit).toHaveBeenCalledTimes(1)
})
```

## Custom Matchers (jest-dom)

```typescript
// Visibility
expect(element).toBeVisible()
expect(element).toBeInTheDocument()

// Form elements
expect(input).toHaveValue('text')
expect(checkbox).toBeChecked()
expect(button).toBeDisabled()

// Text content
expect(element).toHaveTextContent('Hello')
expect(element).toContainHTML('<span>Hello</span>')

// Classes and styles
expect(element).toHaveClass('active')
expect(element).toHaveStyle({ color: 'red' })

// Attributes
expect(element).toHaveAttribute('href', '/home')
```

## Testing Next.js Components

### Testing with useRouter

```typescript
import { vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    pathname: '/',
  }),
  useParams: () => ({ id: '123' }),
}))

it('navigates on click', () => {
  const { useRouter } = require('next/navigation')
  render(<NavigationButton />)
  
  fireEvent.click(screen.getByRole('button'))
  expect(useRouter().push).toHaveBeenCalledWith('/home')
})
```

### Testing Server Components

```typescript
// For server components, test the logic separately
import { getData } from '@/app/actions'

it('fetches data correctly', async () => {
  const data = await getData()
  expect(data).toHaveProperty('id')
})
```

## Coverage Reports

Generate coverage with:

```bash
npm run test:coverage
```

**Output**:
- Terminal summary
- HTML report in `coverage/` directory
- JSON report for CI/CD

**Coverage Thresholds** (add to vitest.config.ts):

```typescript
coverage: {
  lines: 80,
  functions: 80,
  branches: 80,
  statements: 80,
}
```

## Best Practices

### 1. Test Behavior, Not Implementation

```typescript
// ❌ Bad - Testing implementation
expect(component.state.count).toBe(1)

// ✅ Good - Testing behavior
expect(screen.getByText('Count: 1')).toBeInTheDocument()
```

### 2. Use Accessible Queries

```typescript
// ✅ Preferred (accessible)
screen.getByRole('button', { name: /submit/i })
screen.getByLabelText('Email')

// ⚠️ Avoid (fragile)
screen.getByTestId('submit-button')
screen.getByClassName('btn-primary')
```

### 3. Keep Tests Isolated

```typescript
// Each test should be independent
describe('Counter', () => {
  it('starts at 0', () => {
    render(<Counter />)
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('increments independently', () => {
    render(<Counter />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('1')).toBeInTheDocument()
  })
})
```

### 4. Use Descriptive Test Names

```typescript
// ✅ Good
it('shows error message when email is invalid', () => {})

// ❌ Bad
it('test 1', () => {})
```

## Debugging Tests

### 1. Screen Debug

```typescript
import { screen } from '@testing-library/react'

it('debug test', () => {
  render(<Component />)
  screen.debug() // Prints DOM to console
})
```

### 2. Specific Element Debug

```typescript
const element = screen.getByRole('button')
console.log(element.outerHTML)
```

### 3. Run Single Test

```bash
npm test -- example.test.tsx
```

### 4. Run in UI Mode

```bash
npm run test:ui
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test -- --run
      - run: npm run test:coverage
```

## Troubleshooting

### Issue: "Cannot find module '@/...'"

**Solution**: Ensure `vitest.config.ts` has path alias:

```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './'),
  },
}
```

### Issue: "ReferenceError: document is not defined"

**Solution**: Ensure `environment: 'jsdom'` in config

### Issue: Tests timeout

**Solution**: Increase timeout:

```typescript
it('async test', async () => {
  // ...
}, 10000) // 10 second timeout
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [jest-dom Matchers](https://github.com/testing-library/jest-dom)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
