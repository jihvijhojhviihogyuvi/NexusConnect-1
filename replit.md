# ChatFlow - Real-Time Communication Platform

## Overview

ChatFlow is a real-time communication platform that enables instant messaging, voice calls, and video calls. The application draws inspiration from Discord, Slack, and Microsoft Teams while implementing Material Design principles for a consistent and scalable user experience. Built with a modern tech stack, it supports direct messaging, group conversations, file sharing, and WebRTC-based calling features.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server with HMR support
- Wouter for client-side routing (lightweight alternative to React Router)
- TanStack Query (React Query) for server state management and caching

**UI Component System**
- Radix UI primitives for accessible, unstyled component foundations
- shadcn/ui component library built on Radix UI (New York style variant)
- Tailwind CSS for utility-first styling with custom design tokens
- Custom theming system supporting light/dark modes via ThemeContext

**State Management Strategy**
- Context API for global state (Theme, Socket, Call contexts)
- TanStack Query for server state with optimistic updates
- Local component state for UI interactions
- WebSocket integration for real-time data synchronization

**Real-Time Communication**
- WebSocket client for bidirectional communication with server
- SocketContext provides application-wide WebSocket access
- CallContext manages WebRTC peer connections for voice/video calls
- Custom hooks for authentication and mobile responsiveness

**Styling & Design System**
- Tailwind configuration with custom color variables using HSL format
- CSS custom properties for theme switching without class name changes
- Inter font family for UI text, Roboto Mono for code snippets
- Responsive breakpoints: mobile (<768px) collapses to single column layout
- Three-column desktop layout: sidebar (240px), conversation list (280px), main content (flex)

### Backend Architecture

**Server Framework**
- Express.js with TypeScript for API routes and middleware
- HTTP server with WebSocket upgrade support using 'ws' library
- Session-based authentication using express-session with PostgreSQL storage
- Custom logging middleware for request/response tracking

**API Design**
- RESTful endpoints for CRUD operations on users, conversations, messages
- WebSocket protocol for real-time message delivery and presence updates
- File upload handling with multer (10MB limit, image files only)
- Broadcast patterns for multi-user updates (typing indicators, message delivery)

**Authentication & Authorization**
- Replit Auth integration via OpenID Connect (OIDC)
- Passport.js strategy for authentication flow
- Session storage in PostgreSQL for persistence across restarts
- Session secrets and token refresh logic for long-lived sessions

**Data Access Layer**
- Drizzle ORM for type-safe database queries
- Centralized storage interface (IStorage) abstracting database operations
- Connection pooling via @neondatabase/serverless
- Schema-first approach with shared types between client and server

### Database Schema

**Core Tables**
- `users`: User profiles with status, bio, notification preferences, and Replit Auth fields
- `conversations`: Direct and group chat containers with type enum
- `conversation_participants`: Join table with role-based permissions (owner/admin/member)
- `messages`: Chat messages with type (text/image/system), attachments JSON, reply threading
- `message_receipts`: Read/delivery tracking per user per message
- `calls`: Voice/video call records with status tracking
- `call_participants`: Call participation tracking with join/leave timestamps
- `sessions`: Express session storage (required for Replit Auth)

**Database Enums**
- `user_status`: online, away, busy, offline
- `conversation_type`: direct, group
- `participant_role`: owner, admin, member
- `message_type`: text, image, system
- `message_status`: sent, delivered, read
- `call_type`: voice, video
- `call_status`: initiated, ringing, active, ended, missed, declined

**Key Relationships**
- Users to Conversations: many-to-many through conversation_participants
- Messages to Users: many-to-one (sender relationship)
- Messages to Messages: self-referential for reply threading
- Calls to Conversations: many-to-one
- Message receipts track per-user read status for each message

### External Dependencies

**Primary Database**
- PostgreSQL via Neon serverless driver (@neondatabase/serverless)
- WebSocket constructor override for serverless compatibility
- Connection string configured via DATABASE_URL environment variable

**Authentication Provider**
- Replit Authentication service via OIDC
- Environment variables: ISSUER_URL, REPL_ID, SESSION_SECRET
- Auto-discovery of OpenID configuration with 1-hour cache

**UI Component Libraries**
- Radix UI primitives (20+ components): dialogs, dropdowns, popovers, tooltips, etc.
- react-day-picker for calendar/date selection
- cmdk for command palette functionality
- vaul for mobile-friendly drawer components

**Real-Time Infrastructure**
- WebSocket protocol (ws library) for bi-directional communication
- WebRTC for peer-to-peer voice/video calling
- STUN servers: Google's public STUN servers for NAT traversal

**File Storage**
- Local filesystem storage in /uploads directory
- Multer middleware for multipart form handling
- Image file type validation (jpeg, jpg, png, gif, webp)

**Development Tools**
- Replit-specific plugins for development environment integration
- Vite plugins: runtime error overlay, cartographer, dev banner
- TypeScript strict mode with path aliases for imports

**Build & Deployment**
- esbuild for server bundling with selective dependency bundling
- Vite for client-side bundling with tree-shaking
- Production build outputs to /dist directory (server: index.cjs, client: /dist/public)