# AI-TRPG-Platform

An AI-powered Tabletop Role-Playing Game platform built with Next.js 14, TypeScript, and PostgreSQL.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: NextAuth.js
- **Real-time**: Socket.io

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- npm or yarn

### Installation

1. **Clone and navigate to the project**:
   ```bash
   cd ai-trpg-platform
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env.local` file in the root directory:
   ```env
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/ai_trpg_platform?schema=public"

   # NextAuth
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key-here"
   
   # Generate NEXTAUTH_SECRET with:
   # openssl rand -base64 32
   ```

4. **Set up the database**:
   ```bash
   # Generate Prisma Client
   npx prisma generate
   
   # Create database migration
   npx prisma migrate dev --name init
   
   # (Optional) Open Prisma Studio to view your database
   npx prisma studio
   ```

5. **Run the development server**:
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

### Models

#### User
- Supports three roles: `PLAYER`, `GM` (Game Master), `CREATOR`
- Integrated with NextAuth for authentication
- Relations to characters, campaigns, marketplace items

#### Campaign
- Created and managed by a Game Master (GM)
- Flexible `currentState` JSONB field for any RPG rule system
- Unique invite codes for player joining
- Many-to-many relationship with players

#### Character
- Belongs to a user and a campaign
- Flexible `stats` and `inventory` JSONB fields
- Supports any RPG system (D&D, Pathfinder, custom, etc.)

#### ChatMessage
- Three types: `NARRATION`, `TALK`, `ACTION`
- Linked to campaigns for in-game communication
- Supports real-time updates via Socket.io

#### MarketplaceItem
- User-generated content (art, themes)
- Flexible `data` JSONB field for metadata
- Pricing and rating system

### Key Features

- **UUID Primary Keys**: All models use UUID for better security and distribution
- **JSONB Fields**: Flexible schema for RPG rules, character stats, and game state
- **Role-Based Access**: User roles (Player, GM, Creator) for different permissions
- **Invite System**: Campaigns use unique invite codes
- **Marketplace**: Platform for creators to share/sell content

## Database Commands

```bash
# Generate Prisma Client after schema changes
npx prisma generate

# Create a new migration
npx prisma migrate dev --name migration_name

# Apply migrations in production
npx prisma migrate deploy

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Open Prisma Studio (database GUI)
npx prisma studio

# Format schema file
npx prisma format
```

## Project Structure

```
ai-trpg-platform/
├── app/                # Next.js 14 App Router
├── components/         # React components
├── lib/               # Utilities and configurations
│   └── prisma.ts      # Prisma client singleton
├── prisma/
│   └── schema.prisma  # Database schema
├── public/            # Static assets
└── types/             # TypeScript type definitions
```

## Next Steps

1. **Configure Authentication**:
   - Set up NextAuth.js providers (Google, GitHub, etc.)
   - Create authentication pages

2. **Build Core Features**:
   - Campaign creation and management
   - Character sheet system
   - Real-time chat with Socket.io
   - Marketplace for user content

3. **AI Integration**:
   - AI-powered narration
   - Dynamic story generation
   - NPC dialogue generation

4. **Deploy**:
   - Vercel (recommended for Next.js)
   - Railway or Supabase for PostgreSQL
   - Configure production environment variables

## License

MIT
