# Player Controller - Mobile View

## Overview

The Player Controller is a mobile-first interface designed for players to interact with the game on their smartphones or tablets. It features large touch targets, intuitive tabbed navigation, and real-time Socket.io integration for seamless gameplay.

## Features

### 1. CharacterCard Component

**Location**: `components/player/CharacterCard.tsx`

Displays the player's character information in a visually appealing card format.

**Features**:
- Large circular avatar (20x20 on mobile)
- Character name and class
- Level display
- HP bar with color-coded gradient
- Status indicator (healthy, wounded, critical, unconscious)
- Quick stats (AC, Initiative, Speed)
- Responsive design optimized for mobile

**Props**:
```typescript
{
  name: string
  className: string
  level: number
  hp: number
  maxHp: number
  avatarUrl?: string
  status?: 'healthy' | 'wounded' | 'critical' | 'unconscious'
}
```

### 2. ActionTabs Component

**Location**: `components/player/ActionTabs.tsx`

Tabbed interface for player actions with three categories.

**Tabs**:
1. **Attack** (⚔️ Red theme)
   - Basic Attack
   - Power Attack
   - Large touch-friendly buttons

2. **Skills** (✨ Purple theme)
   - Fireball (15 MP)
   - Healing Touch (10 MP)
   - Magic Shield (12 MP)
   - Lightning Bolt (20 MP)
   - Shows mana cost for each skill

3. **Items** (🎒 Blue theme)
   - Health Potion (x3)
   - Mana Potion (x2)
   - Smoke Bomb (x1)
   - Shows quantity for each item

**Props**:
```typescript
{
  onAction: (action: {
    type: 'attack' | 'skill' | 'item'
    id: string
    name: string
    target?: string
  }) => void
  disabled?: boolean
}
```

**Touch Optimization**:
- Minimum 48px touch targets
- `touch-manipulation` CSS for better responsiveness
- Active scale animation (0.95) for visual feedback
- Large padding (p-4 to p-6)

### 3. FeedbackPanel Component

**Location**: `components/player/FeedbackPanel.tsx`

Provides visual feedback for player actions.

**States**:
- **Idle**: Hidden
- **Waiting**: Amber spinner with "Waiting for GM..." message
- **Success**: Green checkmark with success message
- **Error**: Red X with error message

**Features**:
- Auto-hide after 3 seconds (configurable)
- Slide-up animation
- Manual close button for success/error states
- Progress bar for waiting state
- Fixed position at bottom of screen

**Props**:
```typescript
{
  status: 'idle' | 'waiting' | 'success' | 'error'
  message?: string
  autoHide?: boolean
  autoHideDuration?: number
  onHide?: () => void
}
```

## Main Page

**Location**: `app/play/[campaignId]/page.tsx`

### Layout

```
┌─────────────────────────────────┐
│ ← Player Controller          ● │ Header
├─────────────────────────────────┤
│ 📖 Current Narration            │ Scene Info
│ "You stand at the entrance..." │
├─────────────────────────────────┤
│                                 │
│     Character Card              │
│     (Avatar, HP, Stats)         │
│                                 │
├─────────────────────────────────┤
│                                 │
│   ⚔️ Attack | ✨ Skills | 🎒 Items │ Tabs
│                                 │
│   [Action Button 1]             │
│   [Action Button 2]             │ Actions
│   [Action Button 3]             │
│                                 │
└─────────────────────────────────┘
│ Waiting for GM... 🔄           │ Feedback
└─────────────────────────────────┘
```

### Socket.io Integration

The player controller automatically:

**Sends Actions**:
```typescript
await sendPlayerAction({
  actionType: 'skill',
  actorId: characterId,
  actorName: characterName,
  skillName: 'Fireball',
  description: 'Aragorn uses Fireball!',
  target: 'enemy'
})
```

**Receives Updates**:
- Game state changes (scene updates)
- Character HP/status updates
- Other player actions (optional)

### Feedback Flow

1. **User taps action button**
   - Feedback shows "Waiting for GM..."
   - Action sent via Socket.io

2. **Server processes action**
   - GM board updates in real-time
   - Dice rolls calculated
   - Damage applied

3. **Response received**
   - Success: "Fireball successful!" (green)
   - Error: "Action failed" (red)
   - Auto-hide after 3 seconds

## Usage

### Accessing the Controller

Navigate to: `/play/[campaignId]`

Example: `http://localhost:3000/play/abc123`

### Player Flow

1. **Open on mobile device**
2. **Auto-connect** to campaign via Socket.io
3. **View character card** with current HP/status
4. **Read current narration** from GM
5. **Select action tab** (Attack/Skills/Items)
6. **Tap action button** to perform action
7. **Wait for feedback** from server
8. **See result** (success/error)

### Example Action Sequence

```typescript
// 1. Player taps "Fireball" skill
onAction({
  type: 'skill',
  id: 'fireball',
  name: 'Fireball',
  target: 'enemy'
})

// 2. Socket.io sends action
sendPlayerAction({
  actionType: 'skill',
  actorId: 'char-1',
  actorName: 'Aragorn',
  skillName: 'Fireball',
  description: 'Aragorn casts Fireball!',
  target: 'enemy'
})

// 3. GM board receives and displays
// - Game log shows: "Aragorn casts Fireball!"
// - Dice roll: d20 + modifier
// - Damage calculated and applied

// 4. Player receives feedback
// - "Fireball successful!" (green)
// - HP updates if hit
```

## Mobile Optimization

### Touch Targets

All interactive elements meet accessibility guidelines:
- Minimum 48x48px touch targets
- Large padding for easy tapping
- Visual feedback on press (scale animation)

### Responsive Design

- Mobile-first approach
- Max-width container (2xl = 672px)
- Flexible layouts with proper spacing
- Sticky header for easy navigation

### Performance

- Optimized re-renders with React hooks
- Efficient Socket.io event listeners
- Auto-cleanup on unmount
- Debounced state updates

## Customization

### Adding New Skills

Edit `ActionTabs.tsx`:

```typescript
const MOCK_SKILLS: Skill[] = [
  ...existing skills,
  {
    id: 'ice-storm',
    name: 'Ice Storm',
    description: 'Summon a freezing blizzard',
    icon: '❄️',
    manaCost: 25,
  }
]
```

### Adding New Items

Edit `ActionTabs.tsx`:

```typescript
const MOCK_ITEMS: Item[] = [
  ...existing items,
  {
    id: 'elixir',
    name: 'Elixir of Strength',
    description: '+5 STR for 1 hour',
    icon: '💪',
    quantity: 1,
  }
]
```

### Customizing Character Stats

Edit `CharacterCard.tsx` quick stats section:

```typescript
<div className="mt-4 pt-4 border-t border-slate-700/50 grid grid-cols-3 gap-3">
  <div className="text-center">
    <div className="text-xs text-gray-400 mb-1">STR</div>
    <div className="text-lg font-bold text-white">16</div>
  </div>
  // Add more stats...
</div>
```

## Styling

### Theme Colors

- **Primary**: Amber (#F59E0B) - Headers, borders
- **Attack**: Red (#EF4444) - Attack actions
- **Skills**: Purple (#A855F7) - Skill actions
- **Items**: Blue (#3B82F6) - Item actions
- **Success**: Emerald (#10B981) - Success feedback
- **Error**: Red (#EF4444) - Error feedback

### Animations

- **Slide-up**: Feedback panel entrance
- **Shimmer**: HP bar shine effect
- **Scale**: Button press feedback
- **Pulse**: Connection status indicator

## Accessibility

- **Semantic HTML**: Proper heading hierarchy
- **ARIA Labels**: Screen reader support
- **Color Contrast**: WCAG AA compliant
- **Touch Targets**: Minimum 48x48px
- **Focus States**: Keyboard navigation support

## Troubleshooting

### Actions Not Sending

**Check**:
- Socket.io connection status (green dot in header)
- `isInRoom` is true
- No console errors
- Network connectivity

**Solution**:
```typescript
console.log('Connected:', isConnected)
console.log('In room:', isInRoom)
console.log('Error:', connectionError)
```

### Feedback Not Showing

**Check**:
- `feedbackStatus` is not 'idle'
- No CSS conflicts
- Component is mounted

**Solution**:
```typescript
console.log('Feedback status:', feedbackStatus)
console.log('Feedback message:', feedbackMessage)
```

### HP Not Updating

**Check**:
- `onGameStateUpdate` listener is registered
- Server is sending character updates
- Character ID matches

**Solution**:
```typescript
onGameStateUpdate((state) => {
  console.log('State update:', state)
  console.log('Character updates:', state.metadata?.characterUpdates)
})
```

## Future Enhancements

- [ ] Dice rolling animation
- [ ] Skill cooldown timers
- [ ] Inventory management
- [ ] Character sheet viewer
- [ ] Party member list
- [ ] Chat integration
- [ ] Sound effects
- [ ] Haptic feedback
- [ ] Offline mode
- [ ] Push notifications

## Testing

### Manual Testing

1. **Open on mobile device** or use Chrome DevTools mobile emulation
2. **Test all tabs**: Attack, Skills, Items
3. **Tap each action** and verify feedback
4. **Check responsiveness** at different screen sizes
5. **Test connection loss** and reconnection

### Device Testing

Recommended devices:
- iPhone SE (small screen)
- iPhone 14 Pro (standard)
- iPad Mini (tablet)
- Android phones (various sizes)

### Performance Testing

- Lighthouse mobile score
- Touch response time
- Socket.io latency
- Animation smoothness

## Resources

- [Socket.io Documentation](../SOCKET_IO_GUIDE.md)
- [GM Board Guide](../GM_BOARD_GUIDE.md)
- [Component API Reference](../../types/socket.ts)
- [Mobile Web Best Practices](https://web.dev/mobile/)
