# Socket.io Secure Authentication Guide

## Overview

The Socket.io server now uses **session-based authentication** instead of accepting user IDs directly. This prevents user impersonation and ensures secure connections.

## How It Works

### Server-Side (server.ts)

The authentication middleware:

1. **Extracts session token** from `socket.handshake.auth.sessionToken`
2. **Verifies token** in database using `prisma.session.findUnique()`
3. **Checks expiration** to ensure session is still valid
4. **Attaches verified user data** to `socket.data`:
   - `userId`
   - `userName`
   - `userRole`
   - `userEmail`
5. **Rejects invalid/expired sessions** with descriptive error messages

### Authentication Flow

```
Client                    Socket.io Server              Database
  |                              |                          |
  |  Connect with sessionToken   |                          |
  |----------------------------->|                          |
  |                              |  Verify session          |
  |                              |------------------------->|
  |                              |  Return user data        |
  |                              |<-------------------------|
  |                              |  Check expiration        |
  |                              |                          |
  |  Connection established      |                          |
  |<-----------------------------|                          |
```

## Client-Side Integration

### Getting the Session Token

If using **NextAuth.js**, get the session token from the client:

```typescript
import { useSession } from 'next-auth/react'

function MyComponent() {
  const { data: session } = useSession()
  
  // Get session token
  const sessionToken = session?.user?.sessionToken
  
  // Or from cookies (if using cookie-based sessions)
  const sessionToken = document.cookie
    .split('; ')
    .find(row => row.startsWith('next-auth.session-token='))
    ?.split('=')[1]
}
```

### Connecting to Socket.io

Update your Socket.io client connection to send the session token:

```typescript
import { io } from 'socket.io-client'

const socket = io('http://localhost:3000', {
  auth: {
    sessionToken: sessionToken, // NOT userId!
  },
})
```

### Updating useGameSocket Hook

The `useGameSocket` hook needs to be updated to accept and use session token:

```typescript
// hooks/useGameSocket.ts

interface UseGameSocketOptions {
  sessionToken: string  // Changed from userProfile
  autoConnect?: boolean
  onError?: (error: Error) => void
  onReconnect?: () => void
}

export function useGameSocket(
  roomId: string,
  options: UseGameSocketOptions
) {
  const { sessionToken, autoConnect = true, onError, onReconnect } = options

  useEffect(() => {
    const socket = io(SERVER_URL, {
      auth: {
        sessionToken: sessionToken,  // Send session token
      },
      autoConnect,
    })

    // ... rest of hook logic
  }, [sessionToken, roomId])
}
```

### Usage Example

```typescript
'use client'

import { useSession } from 'next-auth/react'
import { useGameSocket } from '@/hooks/useGameSocket'

export default function GameComponent() {
  const { data: session } = useSession()
  
  // Get session token
  const sessionToken = session?.user?.sessionToken || ''

  const { isConnected, sendPlayerAction } = useGameSocket('campaign-id', {
    sessionToken: sessionToken,
    autoConnect: true,
    onError: (error) => {
      console.error('Socket error:', error.message)
      // Handle authentication errors
      if (error.message.includes('Authentication failed')) {
        // Redirect to login or refresh session
      }
    },
  })

  // ... rest of component
}
```

## Error Handling

The server returns specific error messages:

| Error Message | Cause | Solution |
|--------------|-------|----------|
| `Authentication required: No session token provided` | No `sessionToken` in auth | Ensure session token is sent in `socket.handshake.auth` |
| `Authentication failed: Invalid session token` | Session not found in database | User needs to log in again |
| `Authentication failed: Session expired` | Session has expired | Refresh session or redirect to login |
| `Authentication failed: Server error` | Database or server error | Check server logs |

## Security Benefits

✅ **Prevents Impersonation**: Users cannot fake their identity  
✅ **Session Validation**: Verifies session exists and is valid  
✅ **Expiration Checking**: Rejects expired sessions automatically  
✅ **Database Verification**: All user data comes from trusted source  
✅ **Audit Trail**: Logs all authentication attempts  

## Migration from Old System

### Before (Insecure)

```typescript
// ❌ OLD - Accepts userId directly (insecure)
const socket = io('http://localhost:3000', {
  auth: {
    userId: 'user-123',
    userName: 'John',
    userRole: 'PLAYER',
  },
})
```

### After (Secure)

```typescript
// ✅ NEW - Uses session token (secure)
const socket = io('http://localhost:3000', {
  auth: {
    sessionToken: session.sessionToken,
  },
})
```

## Testing

### Valid Session

```typescript
// Create a test session in database
const session = await prisma.session.create({
  data: {
    sessionToken: 'test-session-token',
    userId: 'user-123',
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  },
})

// Connect with valid token
const socket = io('http://localhost:3000', {
  auth: {
    sessionToken: 'test-session-token',
  },
})

// Should connect successfully
```

### Invalid/Expired Session

```typescript
// Try to connect with invalid token
const socket = io('http://localhost:3000', {
  auth: {
    sessionToken: 'invalid-token',
  },
})

// Should receive error: "Authentication failed: Invalid session token"

socket.on('connect_error', (error) => {
  console.error(error.message)
  // Handle authentication failure
})
```

## Best Practices

1. **Always use HTTPS** in production to protect session tokens
2. **Implement session refresh** before expiration
3. **Handle authentication errors** gracefully on client
4. **Log authentication failures** for security monitoring
5. **Use short session expiration** times (e.g., 24 hours)
6. **Implement automatic logout** on session expiration

## NextAuth.js Integration

If using NextAuth.js, the session token is automatically managed:

```typescript
// pages/api/auth/[...nextauth].ts
import NextAuth from 'next-auth'

export default NextAuth({
  // ... providers
  callbacks: {
    async session({ session, token }) {
      // Add session token to client session
      session.sessionToken = token.sessionToken
      return session
    },
  },
})
```

Then access it in your components:

```typescript
const { data: session } = useSession()
const sessionToken = session?.sessionToken
```

## Troubleshooting

### "No session token provided"

**Cause**: Client not sending session token  
**Fix**: Ensure `sessionToken` is in `auth` object when connecting

### "Invalid session token"

**Cause**: Token doesn't exist in database  
**Fix**: User needs to log in to create a valid session

### "Session expired"

**Cause**: Session expiration date has passed  
**Fix**: Implement session refresh or redirect to login

### Connection keeps failing

**Cause**: Session token not being sent correctly  
**Fix**: Check browser console and network tab for auth data

## Production Considerations

- Use environment variables for Socket.io URL
- Implement rate limiting on authentication attempts
- Monitor failed authentication attempts
- Set up alerts for suspicious activity
- Use secure cookies for session tokens
- Implement CSRF protection
- Enable CORS only for trusted origins

## Resources

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Socket.io Authentication](https://socket.io/docs/v4/middlewares/#sending-credentials)
- [Prisma Session Model](https://www.prisma.io/docs/concepts/components/prisma-schema)
