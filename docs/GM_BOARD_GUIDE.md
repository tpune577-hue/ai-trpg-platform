# GM Board - Host View

## Overview

The GM Board is an immersive, full-screen interface designed for Game Masters to display on a large screen or monitor during gameplay. It provides real-time updates, visual storytelling, and party management in a dark fantasy theme.

## Features

### 1. SceneDisplay Component

**Location**: `components/board/SceneDisplay.tsx`

- **Background Images**: Dynamic scene backgrounds with gradient overlays
- **Typewriter Effect**: Smooth narration text animation (30ms per character)
- **Click to Skip**: Players can click anywhere to skip the animation
- **Decorative Elements**: Amber-themed borders and floating particles
- **Scene Name**: Prominently displayed with glowing effects

**Props**:
```typescript
{
  backgroundImage?: string  // URL to scene background
  narrationText: string     // Current narration text
  sceneName?: string        // Name of current location
  onTypewriterComplete?: () => void
}
```

### 2. PartyStatus Component

**Location**: `components/board/PartyStatus.tsx`

- **Player Cards**: Shows each player with avatar, HP bar, and status
- **HP Visualization**: Color-coded bars (green > amber > orange > red)
- **Status Indicators**: Healthy, Wounded, Critical, Unconscious
- **Active Tracking**: Visual indicators for connected players
- **GM Info**: Special section for Game Master
- **Summary Stats**: Quick view of healthy vs critical players

**Props**:
```typescript
{
  players: PlayerStatus[]  // Array of player data
  gmProfile?: UserProfile  // GM information
}
```

**PlayerStatus Interface**:
```typescript
{
  profile: UserProfile
  hp: number
  maxHp: number
  isActive: boolean
  status?: 'healthy' | 'wounded' | 'critical' | 'unconscious'
  level?: number
  class?: string
}
```

### 3. GameLog Component

**Location**: `components/board/GameLog.tsx`

- **Dice Rolls**: Visual dice with critical/fumble highlighting
- **Chat Messages**: Narration, talk, and action messages
- **Auto-Scroll**: Automatically scrolls to latest entries
- **Manual Control**: Scroll-to-bottom button when user scrolls up
- **Timestamps**: Each entry shows time
- **Type Indicators**: Different styling for different message types

**Props**:
```typescript
{
  entries: GameLogEntry[]  // Log entries
  maxEntries?: number      // Max entries to display (default: 100)
  autoScroll?: boolean     // Auto-scroll to bottom (default: true)
}
```

**GameLogEntry Interface**:
```typescript
{
  id: string
  type: 'chat' | 'dice' | 'action' | 'system'
  content: string
  playerName?: string
  timestamp: Date
  data?: any  // Type-specific data
}
```

## Main Board Page

**Location**: `app/campaign/[id]/board/page.tsx`

### Layout

```
┌─────────────────────────────────────────────────────┬──────────┐
│ Campaign Title | Status | Players | Latency          │          │
├─────────────────────────────────────────────────────┤          │
│                                                      │          │
│                                                      │  Party   │
│           Scene Display (60%)                        │  Status  │
│                                                      │          │
│                                                      │          │
├─────────────────────────────────────────────────────┤          │
│                                                      │          │
│           Game Log (40%)                             │          │
│                                                      │          │
└─────────────────────────────────────────────────────┴──────────┘
```

### Real-time Integration

The board automatically updates via Socket.io:

**Player Actions**:
- Displays in game log
- Updates target HP if applicable
- Shows dice rolls for attacks

**Game State Updates**:
- Updates scene information
- Logs system messages

**Chat Messages**:
- Appears in game log with appropriate styling
- Supports narration, talk, and action types

**Player Join/Leave**:
- Updates party status
- Adds system log entry

## Usage

### Accessing the Board

Navigate to: `/campaign/[campaignId]/board`

Example: `http://localhost:3000/campaign/abc123/board`

### Starting a Session

1. **Open the board** on your display screen
2. **Players connect** to the campaign via their devices
3. **Board auto-updates** as players join
4. **GM controls** game state via Socket.io events

### Updating Narration

```typescript
// From GM interface
await sendGMUpdate({
  currentScene: 'The Dark Cave',
  metadata: {
    narration: 'You hear dripping water echoing through the cavern...'
  }
})
```

### Simulating Player Actions

```typescript
await sendPlayerAction({
  actionType: 'attack',
  actorId: 'player-1',
  actorName: 'Aragorn',
  targetId: 'enemy-1',
  targetName: 'Orc',
  damage: 15,
  description: 'Aragorn swings his sword at the Orc!'
})
```

## Styling

### Theme

- **Primary Color**: Amber (#F59E0B)
- **Background**: Dark slate gradients
- **Accents**: Emerald (healthy), Red (critical), Purple (GM)

### Animations

- **Typewriter**: 30ms per character
- **Float**: Ambient particles
- **Shimmer**: HP bar shine effect
- **Fade-in**: Log entries

### Custom CSS Classes

Defined in `app/globals.css`:

- `.custom-scrollbar` - Styled scrollbars
- `.animate-float` - Floating particles
- `.animate-shimmer` - Shimmer effect
- `.animate-fade-in` - Fade in animation
- `.glow-amber/emerald/red` - Glow effects

## Customization

### Changing Scene Background

```typescript
setCurrentScene({
  name: 'Mystic Temple',
  backgroundImage: 'https://example.com/temple.jpg',
  narration: 'Ancient runes glow on the temple walls...'
})
```

### Adding Custom Log Entries

```typescript
setGameLog(prev => [...prev, {
  id: `custom-${Date.now()}`,
  type: 'system',
  content: 'A mysterious fog rolls in...',
  timestamp: new Date()
}])
```

### Customizing Player Status

```typescript
setPlayers(prev => prev.map(p => 
  p.profile.id === playerId 
    ? { ...p, hp: newHp, status: 'wounded' }
    : p
))
```

## Performance

### Optimization Tips

1. **Limit Log Entries**: Default max is 100, adjust via `maxEntries` prop
2. **Lazy Load Images**: Use optimized background images
3. **Debounce Updates**: Batch rapid state changes
4. **Virtual Scrolling**: For very large party sizes

### Memory Management

- Old log entries are automatically removed when exceeding `maxEntries`
- Socket listeners are cleaned up on unmount
- Images are lazy-loaded and cached

## Accessibility

- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: Semantic HTML with ARIA labels
- **High Contrast**: Dark mode optimized
- **Responsive**: Adapts to different screen sizes

## Troubleshooting

### Typewriter Effect Not Working

- Check that `narrationText` prop is changing
- Verify no console errors
- Try clicking to skip and see if full text appears

### Players Not Showing

- Verify Socket.io connection (`isConnected` should be true)
- Check `roomInfo.connectedPlayers` in console
- Ensure players have joined the room

### Log Not Auto-Scrolling

- Check `autoScroll` prop is true
- Verify user hasn't manually scrolled up
- Click scroll-to-bottom button if visible

### High Latency

- Check network connection
- Verify server is running locally or nearby
- Consider using Socket.io Redis adapter for scaling

## Future Enhancements

- [ ] Interactive map overlay
- [ ] Initiative tracker
- [ ] Condition/buff indicators
- [ ] Sound effects integration
- [ ] Video/image sharing
- [ ] Dice rolling animations
- [ ] Combat grid overlay
- [ ] NPC tracking
- [ ] Quest tracker
- [ ] Music player integration

## Examples

### Full Session Flow

```typescript
// 1. Players join
// Board automatically updates party status

// 2. GM sets scene
await sendGMUpdate({
  currentScene: 'Goblin Camp',
  metadata: { narration: 'You approach the goblin encampment...' }
})

// 3. Player takes action
await sendPlayerAction({
  actionType: 'attack',
  actorId: 'player-1',
  actorName: 'Thorin',
  targetId: 'goblin-1',
  targetName: 'Goblin Scout',
  damage: 12,
  description: 'Thorin charges with his axe!'
})

// 4. Board updates automatically:
// - Game log shows action
// - Dice roll appears
// - Target HP decreases
// - Status updates if needed
```

## Resources

- [Socket.io Documentation](../docs/SOCKET_IO_GUIDE.md)
- [Component API Reference](../types/socket.ts)
- [Tailwind CSS](https://tailwindcss.com)
- [Next.js App Router](https://nextjs.org/docs/app)
