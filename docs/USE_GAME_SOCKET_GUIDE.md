# useGameSocket Hook - Session Token Authentication

## Updated Authentication

The `useGameSocket` hook now uses **session token authentication** instead of accepting user credentials directly.

## New API

### Options Interface

```typescript
interface UseGameSocketOptions {
  sessionToken: string          // REQUIRED: Session token from NextAuth
  userProfile?: UserProfile     // OPTIONAL: For room join (backward compatibility)
  autoConnect?: boolean         // Auto-connect on mount (default: true)
  onError?: (error: SocketError) => void
  onReconnect?: () => void
}
```

### Usage with NextAuth

```typescript
'use client'

import { useSession } from 'next-auth/react'
import { useGameSocket } from '@/hooks/useGameSocket'

export default function GamePage() {
  const { data: session } = useSession()
  
  // Get session token
  const sessionToken = session?.sessionToken || ''
  
  // Optional: User profile for room join
  const userProfile = {
    id: session?.user?.id || '',
    name: session?.user?.name || '',
    role: session?.user?.role || 'PLAYER',
    characterId: 'char-1',
  }
  
  const { isConnected, sendPlayerAction } = useGameSocket('campaign-id', {
    sessionToken: sessionToken,
    userProfile: userProfile, // Optional
    autoConnect: true,
    onError: (error) => {
      console.error('Socket error:', error.message)
    },
  })
  
  // ... rest of component
}
```

## Migration Guide

### Before (Old Method)

```typescript
// ❌ OLD - Insecure
const { isConnected } = useGameSocket('campaign-id', {
  userProfile: {
    id: 'user-123',
    name: 'John',
    role: 'PLAYER',
  },
  autoConnect: true,
})
```

### After (New Method)

```typescript
// ✅ NEW - Secure with session token
const { data: session } = useSession()

const { isConnected } = useGameSocket('campaign-id', {
  sessionToken: session?.sessionToken || '',
  userProfile: {
    id: session?.user?.id || '',
    name: session?.user?.name || '',
    role: session?.user?.role || 'PLAYER',
  },
  autoConnect: true,
})
```

## Error Handling

### No Session Token

If no session token is provided:

```typescript
// Error: "Authentication required: No session token"
setConnectionError('Authentication required: No session token')
```

**Solution**: Ensure user is logged in and session token is available.

### Invalid Session Token

If session token is invalid or expired:

```typescript
// Server returns: "Authentication failed: Invalid session token"
```

**Solution**: Refresh session or redirect to login.

## Complete Example

```typescript
'use client'

import { useSession } from 'next-auth/react'
import { useGameSocket } from '@/hooks/useGameSocket'
import { useEffect } from 'react'

export default function PlayerController() {
  const { data: session, status } = useSession()
  
  // Wait for session to load
  if (status === 'loading') {
    return <div>Loading...</div>
  }
  
  // Redirect if not authenticated
  if (status === 'unauthenticated') {
    return <div>Please log in</div>
  }
  
  const sessionToken = session?.sessionToken || ''
  const userProfile = {
    id: session?.user?.id || '',
    name: session?.user?.name || 'Player',
    role: session?.user?.role || 'PLAYER',
    characterId: session?.user?.characterId,
  }
  
  const {
    isConnected,
    isInRoom,
    connectionError,
    sendPlayerAction,
    onGameStateUpdate,
  } = useGameSocket('campaign-123', {
    sessionToken: sessionToken,
    userProfile: userProfile,
    autoConnect: true,
    onError: (error) => {
      console.error('Socket error:', error)
      // Handle authentication errors
      if (error.message.includes('Authentication failed')) {
        // Redirect to login or refresh session
      }
    },
    onReconnect: () => {
      console.log('Reconnected to game!')
    },
  })
  
  // Listen for game updates
  useEffect(() => {
    onGameStateUpdate((state) => {
      console.log('Game state updated:', state)
    })
  }, [onGameStateUpdate])
  
  // Send action
  const handleAttack = async () => {
    const result = await sendPlayerAction({
      actionType: 'attack',
      actorId: userProfile.characterId || userProfile.id,
      actorName: userProfile.name,
      description: 'Attacks with sword!',
    })
    
    if (result.success) {
      console.log('Attack sent!')
    }
  }
  
  return (
    <div>
      <div>Status: {isConnected ? 'Connected' : 'Disconnected'}</div>
      <div>In Room: {isInRoom ? 'Yes' : 'No'}</div>
      {connectionError && <div>Error: {connectionError}</div>}
      <button onClick={handleAttack} disabled={!isInRoom}>
        Attack
      </button>
    </div>
  )
}
```

## Key Changes

1. **sessionToken is required** - Must be provided in options
2. **userProfile is optional** - Only needed for room join
3. **Authentication happens on connect** - Server verifies session token
4. **Better error messages** - Specific errors for auth failures

## Backward Compatibility

The hook maintains backward compatibility by keeping `userProfile` as an optional parameter. However, **sessionToken is always required** for authentication.

## Testing

### Valid Session

```typescript
const { isConnected } = useGameSocket('campaign-id', {
  sessionToken: 'valid-session-token-123',
  userProfile: { id: 'user-1', name: 'Test', role: 'PLAYER' },
})

// Should connect successfully
expect(isConnected).toBe(true)
```

### Invalid Session

```typescript
const { connectionError } = useGameSocket('campaign-id', {
  sessionToken: 'invalid-token',
})

// Should show error
expect(connectionError).toContain('Authentication failed')
```

### No Session Token

```typescript
const { connectionError } = useGameSocket('campaign-id', {
  sessionToken: '',
})

// Should show error
expect(connectionError).toBe('Authentication required: No session token')
```

## Resources

- [Socket.io Authentication Guide](../SOCKET_AUTH_GUIDE.md)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Session Management](https://next-auth.js.org/getting-started/client#usesession)
