# Design Guidelines: Real-Time Communication Platform

## Design Approach

**Hybrid Approach**: Drawing inspiration from Discord, Slack, and Microsoft Teams communication patterns while applying Material Design principles for consistency and scalability. Focus on functional clarity, efficient information density, and seamless real-time interactions.

**Core Principle**: Prioritize readability, quick scanning, and immediate access to actions. Every pixel serves communication efficiency.

---

## Typography System

**Font Stack**: Inter (primary) for all UI text via Google Fonts CDN
- **Display/Headers**: 24px, 600 weight - Page titles, modal headers
- **Subheaders**: 18px, 600 weight - Section titles, user names in chat
- **Body Text**: 14px, 400 weight - Messages, list items, general content
- **Small Text**: 12px, 400 weight - Timestamps, metadata, status labels
- **Monospace**: 'Roboto Mono' 13px - Code snippets in messages

**Line Height**: 1.5 for body text, 1.3 for headers

---

## Layout System

**Spacing Scale**: Use Tailwind units of 1, 2, 3, 4, 6, 8, 12, 16 for consistent rhythm
- Component padding: p-4
- Section spacing: gap-4, gap-6
- Container margins: m-2, m-4
- Icon spacing: mr-2, ml-3

**Grid Structure**:
- **Three-column layout** for main app view:
  - Sidebar (240px fixed): Server/workspace list
  - Channel/Conversation list (280px fixed): Scrollable list of chats/channels
  - Main content (flex-1): Active conversation or call view
- **Responsive breakpoints**: Stack to single column on mobile (<768px), show only active view

---

## Component Library

### Navigation & Sidebar
- **Server/Workspace Sidebar**: Vertical icon list, 60px width on desktop, collapsible
- **Conversation List**: Full conversation cards with avatar (40px), name, last message preview (truncated), timestamp, unread badge
- **Top Navigation**: User profile button (right), settings icon, search bar (expandable)

### Chat Interface
- **Message Bubble**: Left-aligned with avatar for others, subtle background differentiation
- **Message Metadata**: Sender name (bold), timestamp (small, muted)
- **Input Field**: Fixed bottom bar, auto-expanding textarea, attachment button, emoji picker, send button
- **Media Messages**: Inline image previews (max 400px width), download option for files
- **Typing Indicator**: Animated dots, appears below last message

### Call Interface
- **Video Grid**: 
  - 1-on-1: Large video (full width), small self-view (bottom-right corner, 200px)
  - Group: CSS Grid responsive layout (2x2 for 4 people, 3x2 for 6, etc.)
- **Call Controls Bar**: Fixed bottom, centered buttons group
  - Mute/unmute (mic icon)
  - Video on/off (camera icon)
  - Screen share (monitor icon)
  - End call (red phone icon, prominent)
  - Settings/more (three dots)
- **Call Controls Styling**: 56px circular buttons, icon-only, tooltips on hover
- **Participant List**: Sidebar panel (slide-in), shows all participants with status

### User Profile
- **Profile Card**: Center-aligned, max-width 600px
- **Avatar Section**: 120px circular avatar, upload button overlay on hover
- **Info Fields**: Full-width input fields, clean borders, 48px height
- **Status Dropdown**: Custom select with emoji + text options (Online, Away, Do Not Disturb, Invisible)

### Settings Panel
- **Layout**: Sidebar navigation (left, 200px), content area (right, flex-1)
- **Settings Categories**: Notifications, Privacy, Audio/Video Devices, Chat Preferences, Account
- **Device Selection**: Dropdown selects for microphone, camera, speakers with test buttons
- **Toggle Switches**: Material Design style switches for binary options
- **Save Button**: Fixed bottom-right, prominent primary button

### UI Elements
- **Buttons**: 
  - Primary: 40px height, 16px padding horizontal, rounded-md
  - Secondary: Same size, outline style
  - Icon buttons: 40px square, rounded-full
- **Input Fields**: 48px height, rounded-md, focus state with subtle border
- **Badges**: 20px height, 6px padding horizontal, rounded-full, positioned absolute on avatars/icons
- **Avatars**: Circular, standard sizes: 32px (list), 40px (chat), 120px (profile)
- **Modals**: Centered overlay, max-width 500px, 24px padding, rounded-lg
- **Dropdown Menus**: Attached to trigger, 8px padding vertical, list items 40px height

### Status Indicators
- **Online Status Dot**: 10px circle, absolute positioned bottom-right of avatar
- **Typing Indicator**: Three animated dots, 8px each, 4px gap
- **Unread Badge**: Pill shape, minimum 20px width, bold count
- **Call Status**: Pulsing ring animation around avatar during active call

### Group Management
- **Member List**: Scrollable list, 56px row height, avatar + name + role badge
- **Add Members Button**: Top-right, icon + text
- **Admin Controls**: Three-dot menu per member, kick/promote options

---

## Icon System

**Library**: Heroicons (outline for default, solid for active states) via CDN

**Icon Sizes**:
- Navigation: 24px
- Buttons: 20px
- List items: 18px
- Inline text: 16px

---

## Animations

**Minimal, Purposeful Motion**:
- Message send: Subtle fade-in, 150ms
- Typing indicator: Continuous pulse
- Status change: 200ms fade
- Modal open/close: 250ms scale + fade
- Avoid decorative animations; focus on state feedback

---

## Responsive Behavior

**Mobile (<768px)**:
- Single column stack
- Bottom navigation bar (Home, Calls, Profile)
- Floating action button for new message/call
- Swipe gestures to navigate between views
- Full-width message input

**Desktop (≥768px)**:
- Three-column layout as described
- Hover states for all interactive elements
- Keyboard shortcuts support (Ctrl+K for search, Esc to close modals)

---

## Images

**No hero images needed** - This is a functional communication app, not a marketing site.

**User-Generated Images**:
- Avatar uploads: Circular crop, 500x500px recommended
- Message attachments: Inline previews, clickable to expand
- Profile banners: Optional 1500x400px header image

---

This design prioritizes communication efficiency, real-time interaction clarity, and professional polish suitable for both casual and professional use contexts.