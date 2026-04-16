# SchoolPool - Architecture Documentation

## 🏗️ System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────┐ │
│  │   React     │  │  React      │  │   React     │  │ React  │ │
│  │   Router    │  │  Query      │  │   Context   │  │  Vite  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └────────┘ │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   shadcn/ui │  │  Tailwind   │  │   Mapbox    │             │
│  │   (Radix)   │  │    CSS      │  │     GL      │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS / REST API
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE PLATFORM                             │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    AUTHENTICATION                        │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌────────────────┐   │   │
│  │  │   Email/    │  │  2FA (OTP)  │  │   JWT Tokens   │   │   │
│  │  │  Password   │  │  (Edge Fn)  │  │   (Session)    │   │   │
│  │  └─────────────┘  └─────────────┘  └────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    DATABASE LAYER                          │   │
│  │           PostgreSQL + Row Level Security (RLS)            │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │   │
│  │  │  users   │ │ profiles │ │  rides   │ │ ride_    │     │   │
│  │  │          │ │          │ │          │ │requests  │     │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘     │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │   │
│  │  │ account_ │ │ ride_    │ │ parent_  │ │ banned_  │     │   │
│  │  │  links   │ │conversation││whitelist │ │ emails   │     │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              REALTIME SUBSCRIPTIONS                      │   │
│  │              (WebSocket-based updates)                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    EDGE FUNCTIONS                        │   │
│  │                    (Deno Runtime)                        │   │
│  │  ┌──────────────────────────────────────────────────┐   │   │
│  │  │ AUTH FUNCTIONS        │ DATA FUNCTIONS            │   │   │
│  │  │ • auth-login          │ • get-mapbox-token        │   │   │
│  │  │ • auth-create-account │ • geocode-address         │   │   │
│  │  │ • auth-send-2fa       │ • calculate-route         │   │   │
│  │  │ • auth-verify-2fa     │ • get-parent-locations    │   │   │
│  │  │ • auth-check-email    │ • get-parent-profile      │   │   │
│  │  │ • auth-check-username │ • lookup-parent           │   │   │
│  │  │ • auth-reset-password │ • search-parents          │   │   │
│  │  │ • submit-access-req   │ • create-notification     │   │   │
│  │  │ • manage-access-reqs  │ • cleanup-expired-rides   │   │   │
│  │  │ • send-link-verify    │ • generate-test-parent    │   │   │
│  │  │ • send-email          │ • delete-test-parents     │   │   │
│  │  │                       │ • suggest-carpool-partners│   │   │
│  │  │                       │ • suggest-piggyback-routes│   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
schoolpool/
├── docs/                          # Documentation
│   ├── PROJECT_OVERVIEW.md
│   ├── ARCHITECTURE.md
│   ├── TECH_STACK.md
│   ├── DATABASE.md
│   ├── API.md
│   ├── FEATURES.md
│   └── DEVELOPMENT.md
├── src/
│   ├── components/                # React Components
│   │   ├── ui/                    # shadcn/ui components
│   │   ├── series/                # Recurring ride components
│   │   ├── student/               # Student-specific components
│   │   ├── profile/               # Profile components
│   │   ├── ErrorBoundary.tsx      # Error handling
│   │   └── [50+ other components]
│   ├── contexts/
│   │   └── AuthContext.tsx        # Authentication context
│   ├── hooks/
│   │   └── useLinkedParentRides.ts
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts          # Supabase client
│   │       └── types.ts           # Database types
│   ├── lib/
│   │   ├── utils.ts               # Utilities
│   │   ├── logger.ts              # Logging utility
│   │   ├── smartSchedule.ts       # AI schedule calculator
│   │   ├── naturalLanguageParser.ts
│   │   ├── fetchUnifiedRides.ts
│   │   ├── notifications.ts
│   │   ├── permissions.ts
│   │   └── routePreload.ts
│   ├── pages/                     # Route pages
│   │   ├── Index.tsx              # Homepage
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── Dashboard.tsx
│   │   ├── FindRides.tsx
│   │   ├── MyRides.tsx
│   │   ├── Profile.tsx
│   │   ├── Conversations.tsx
│   │   ├── FamilyCarpools.tsx
│   │   ├── Series.tsx
│   │   └── [20+ other pages]
│   ├── App.tsx                    # Main app component
│   ├── main.tsx                   # Entry point
│   └── index.css                  # Global styles
├── supabase/
│   ├── functions/                 # Edge Functions
│   │   ├── _shared/
│   │   │   └── cors.ts            # CORS configuration
│   │   ├── auth-login/
│   │   │   └── index.ts
│   │   ├── auth-create-account/
│   │   │   └── index.ts
│   │   ├── auth-send-2fa/
│   │   │   └── index.ts
│   │   ├── auth-verify-2fa/
│   │   │   └── index.ts
│   │   ├── auth-check-email/
│   │   │   └── index.ts
│   │   ├── auth-check-username/
│   │   │   └── index.ts
│   │   ├── create-notification/
│   │   │   └── index.ts
│   │   ├── get-mapbox-token/
│   │   │   └── index.ts
│   │   └── [15+ other functions]
│   ├── migrations/                # Database migrations
│   └── config.toml                # Supabase config
├── public/                        # Static assets
│   └── favicon.png
├── .env.example                   # Environment template
├── vite.config.ts                 # Vite configuration
├── tsconfig.json                  # TypeScript config
├── tailwind.config.ts             # Tailwind config
└── package.json                   # Dependencies
```

---

## 🔄 Data Flow

### Authentication Flow
```
1. User enters email/password
   ↓
2. POST to /functions/v1/auth-login
   ↓
3. Edge Function validates password (bcrypt)
   ↓
4. If valid, send 2FA code via email
   ↓
5. User enters 2FA code
   ↓
6. POST to /functions/v1/auth-verify-2fa
   ↓
7. If valid, Supabase Auth sign-in with password
   ↓
8. JWT token stored in localStorage
   ↓
9. AuthContext updates with user session
   ↓
10. React Query fetches profile data
```

### Ride Creation Flow
```
1. Parent fills ride form (PostRide page)
   ↓
2. Form validation (React Hook Form + Zod)
   ↓
3. Geocode addresses (Mapbox API via Edge Function)
   ↓
4. Calculate route/distance
   ↓
5. INSERT into rides table
   ↓
6. Real-time subscription updates FindRides page
   ↓
7. Other parents see new ride on map
```

### Ride Request Flow
```
1. Parent clicks "Request Ride" (FindRides)
   ↓
2. INSERT into ride_conversations
   ↓
3. Real-time notification to driver
   ↓
4. Driver accepts/declines (Conversations page)
   ↓
5. UPDATE ride_requests table
   ↓
6. Notifications sent to all parties
```

---

## 🏛️ Component Architecture

### Page Components
- **Eager Loaded:** Index, Login, Register, Dashboard (critical path)
- **Lazy Loaded:** All other pages (code splitting)

### Shared Components
```
┌─────────────────────────────────────────┐
│           LAYOUT COMPONENTS             │
├─────────────────────────────────────────┤
│ DashboardLayout.tsx  │ Navigation frame │
│ Navigation.tsx       │ Top nav bar      │
│ Breadcrumbs.tsx      │ Page breadcrumbs │
│ Sidebar.tsx          │ Dashboard nav    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│           UI COMPONENTS                 │
├─────────────────────────────────────────┤
│ Button, Card, Input, Dialog, etc.      │
│ (shadcn/ui + Radix primitives)          │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│           FEATURE COMPONENTS            │
├─────────────────────────────────────────┤
│ FindRidesMap.tsx     │ Map with markers │
│ UnifiedRideCard.tsx  │ Ride display card│
│ RideChatThread.tsx   │ Messaging UI     │
│ VehicleManager.tsx   │ Car info editor  │
└─────────────────────────────────────────┘
```

---

## 📡 State Management

### Global State (AuthContext)
```typescript
interface AuthContextType {
  user: User | null;           // Supabase Auth user
  profile: Profile | null;     // Extended profile data
  session: Session | null;     // JWT session
  loading: boolean;            // Auth initialization
  logout: () => Promise<void>;
}
```

### Server State (React Query)
- Caches API responses
- Automatic background refetching
- Optimistic updates
- Stale time: 5 minutes

### Local State (useState/useReducer)
- Form inputs
- UI state (dialogs, modals)
- Component-specific data

---

## 🗺️ Route Structure

```typescript
// Critical pages (eager loaded)
/                    → Index (Homepage)
/login               → Login
/register            → Register
/dashboard           → Dashboard

// Lazy loaded pages
/about               → About
/features            → Features
/safety              → Safety
/how-it-works        → HowItWorks
/profile             → Profile
/profile/setup       → ProfileSetup
/find-rides          → FindRides
/post-ride           → PostRide (ParentOnly)
/my-rides            → MyRides
/conversations       → Conversations
/family-links        → FamilyLinks
/family-carpools     → FamilyCarpools
/series              → Series (ParentOnly)
/settings            → Settings
/privacy             → Privacy
/terms               → Terms
/help                → Help
/feedback             → Feedback
/verify-email        → EmailVerification
/request-access      → RequestAccess
/forgot-password     → ForgotPassword
/admin/approvals     → AdminApprovals
/admin/verified-emails → AdminVerifiedEmails
/requests/private    → MyPrivateRequests (ParentOnly)

// Public profiles
/profile/:userId    → PublicProfile
```

---

## 🔐 Security Architecture

### Authentication Layers
1. **Email/Password** (bcrypt hashing)
2. **2FA Verification** (email OTP)
3. **JWT Tokens** (Supabase Auth)
4. **Row Level Security** (RLS policies)

### Access Control
```
Public Routes (no auth):
- /, /about, /features, /login, /register, /terms, /privacy

Authenticated Routes (require login):
- /dashboard, /profile, /find-rides, /my-rides, /conversations

Parent-Only Routes (require parent account_type):
- /post-ride, /series, /requests/private
```

---

## 🌐 API Communication

### Supabase Client Configuration
```typescript
// Client-side Supabase instance
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: localStorage,      // Persist session
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);
```

### Edge Function Invocation
```typescript
// From React components
const { data, error } = await supabase.functions.invoke(
  'function-name',
  { body: { param1: 'value' } }
);
```

---

## 🎯 Performance Optimizations

### Code Splitting
- **Manual chunks:** react-core, mapbox, ui-vendor, supabase, query, icons, date-utils
- **Entry point:** 194KB (under 250KB target)
- **Lazy loading:** All non-critical pages

### Caching Strategy
- **React Query:** 5 min stale time, 10 min cache time
- **Browser:** Static assets cached via CDN
- **Supabase:** Connection pooling, prepared statements

### Image Optimization
- Favicon: PNG with cache busting (?v=20260115)
- Lazy loading for below-fold images

---

## 📊 Monitoring & Error Handling

### Error Boundaries
- **App-level:** Catches all React errors, shows fallback UI
- **Development:** Shows detailed error stack
- **Production:** Shows user-friendly message

### Logging
- **Development:** Full console logging via logger utility
- **Production:** Stripped by Terser (drop_console: true)
- **Errors:** Always logged, sent to error tracking (placeholder)

---

## 🔄 Deployment Flow

```
Local Development
       ↓
   git commit
       ↓
   git push origin main
       ↓
   GitHub Repository
       ↓
   Lovable Auto-Sync
       ↓
   Production Deployment
   (chadwickschoolpool.lovable.app)
```

---

*Last Updated: April 16, 2026*