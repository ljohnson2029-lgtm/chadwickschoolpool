# SchoolPool - Tech Stack Documentation

## 🛠️ Core Technologies

### Frontend Framework
| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.x | UI library |
| **TypeScript** | 5.x | Type safety |
| **Vite** | 5.x | Build tool & dev server |
| **React Router** | 6.x | Client-side routing |

### UI & Styling
| Technology | Version | Purpose |
|------------|---------|---------|
| **Tailwind CSS** | 3.x | Utility-first CSS |
| **shadcn/ui** | latest | Component library |
| **Radix UI** | latest | Headless UI primitives |
| **Lucide React** | latest | Icon library |
| **date-fns** | latest | Date formatting |

### State Management & Data
| Technology | Version | Purpose |
|------------|---------|---------|
| **TanStack Query** | 5.x | Server state management |
| **Supabase JS** | 2.x | Database client |
| **Zod** | latest | Schema validation |
| **React Hook Form** | latest | Form management |

### Maps & Location
| Technology | Version | Purpose |
|------------|---------|---------|
| **Mapbox GL** | 3.x | Map rendering |
| **React Map GL** | 7.x | React Mapbox wrapper |

---

## 📦 Backend & Infrastructure

### Platform
| Service | Purpose |
|---------|---------|
| **Supabase** | Backend-as-a-Service |
| **PostgreSQL** | Primary database |
| **Deno** | Edge Functions runtime |

### Authentication
| Technology | Purpose |
|------------|---------|
| **Supabase Auth** | JWT authentication |
| **bcrypt** | Password hashing |
| **OTP (2FA)** | Email verification codes |

### Hosting
| Service | Purpose |
|---------|---------|
| **Lovable** | Frontend hosting (CDN) |
| **Supabase** | API & database hosting |

---

## 🔧 Development Tools

### Build & Bundling
```
Vite (esbuild + Rollup)
├── React Fast Refresh (HMR)
├── TypeScript compilation
├── Tailwind CSS processing
├── Asset optimization
└── Code splitting (manual chunks)
```

### Linting & Formatting
| Tool | Purpose |
|------|---------|
| **ESLint** | Code linting |
| **TypeScript** | Type checking |

---

## 📋 Dependencies (package.json)

### Production Dependencies
```json
{
  "dependencies": {
    "@hookform/resolvers": "Form validation resolvers",
    "@radix-ui/react-*": "Various Radix primitives",
    "@supabase/supabase-js": "Database client",
    "@tanstack/react-query": "Server state management",
    "@turf/turf": "Geospatial analysis",
    "class-variance-authority": "Component variants",
    "clsx": "Conditional classes",
    "cmdk": "Command palette",
    "date-fns": "Date utilities",
    "embla-carousel-react": "Carousel component",
    "framer-motion": "Animation library",
    "he": "HTML entities encoder/decoder",
    "input-otp": "OTP input component",
    "lucide-react": "Icons",
    "mapbox-gl": "Maps",
    "react": "UI framework",
    "react-day-picker": "Date picker",
    "react-dom": "React DOM",
    "react-hook-form": "Forms",
    "react-map-gl": "React Mapbox",
    "react-resizable-panels": "Resizable panel layout",
    "react-router-dom": "Routing",
    "recharts": "Chart library",
    "sonner": "Toast notifications",
    "tailwind-merge": "Class merging",
    "tailwindcss-animate": "Tailwind animations",
    "vaul": "Drawer component",
    "zod": "Validation"
  }
}
```

### Development Dependencies
```json
{
  "devDependencies": {
    "@eslint/js": "ESLint core",
    "@tailwindcss/typography": "Typography plugin",
    "@types/*": "TypeScript definitions",
    "@vitejs/plugin-react-swc": "SWC-based React plugin",
    "autoprefixer": "CSS autoprefixing",
    "eslint": "Linting",
    "eslint-plugin-react-hooks": "React hooks rules",
    "eslint-plugin-react-refresh": "React refresh rules",
    "globals": "Global variable definitions",
    "lovable-tagger": "Lovable dev tool",
    "postcss": "CSS processing",
    "tailwindcss": "CSS framework",
    "typescript": "Type system",
    "typescript-eslint": "TypeScript ESLint",
    "vite": "Build tool"
  }
}
```

---

## 🌐 Browser Support

### Target Browsers
- Chrome/Edge (last 2 versions)
- Safari (last 2 versions)
- Firefox (last 2 versions)

### Build Target
```typescript
// vite.config.ts
build: {
  target: 'es2020',
  cssTarget: 'chrome61',
}
```

---

## 🔐 Security Technologies

### Authentication Flow
```
User Credentials
    ↓
bcrypt (password hashing)
    ↓
Supabase Auth (JWT generation)
    ↓
localStorage (token storage)
    ↓
React Context (session state)
```

### 2FA Implementation
- **Algorithm:** Time-based OTP (6-digit codes)
- **Delivery:** SendGrid Email API
- **Rate Limiting:** 10 attempts per minute per IP

### CORS Policy
```typescript
// Allowed Origins:
- https://chadwickschoolpool.lovable.app (production)
- https://*.lovable.app (preview branches)
- http://localhost:* (development)
- http://127.0.0.1:* (development)
```

---

## 🗺️ Mapbox Integration

### Services Used
| Service | Purpose |
|---------|---------|
| **Geocoding API** | Address to coordinates |
| **Directions API** | Route calculation |
| **Mapbox GL JS** | Map rendering |

### Token Management
- Token stored in Supabase (not hardcoded in production)
- Retrieved via Edge Function: `get-mapbox-token`
- Scoped to Chadwick School area

---

## 📊 Performance Stack

### Code Splitting Strategy
```
Manual Chunks:
├── react-core (React + Router)
├── mapbox (Mapbox GL + React Map GL)
├── ui-vendor (Radix UI components)
├── supabase (Supabase client)
├── query (TanStack Query)
├── date-utils (date-fns)
└── icons (Lucide React)
```

### Caching Strategy
| Cache Layer | TTL | Purpose |
|-------------|-----|---------|
| **React Query** | 5 min | Server data |
| **Browser HTTP** | 1 year | Static assets |
| **CDN** | Varies | Global distribution |

---

## 🔄 Data Flow Architecture

```
React Component
    ↓ (useQuery hook)
React Query Cache
    ↓ (cache miss or stale)
Supabase Client
    ↓ (HTTP request)
Supabase Edge Function (Deno)
    ↓ (execute logic)
PostgreSQL Database
    ↓ (return data)
Edge Function Response
    ↓ (JSON)
React Query Cache (updated)
    ↓ (notify subscribers)
React Component Re-renders
```

---

## 🧪 Testing (Planned)

### Recommended Stack (Not Yet Implemented)
| Tool | Purpose |
|------|---------|
| **Vitest** | Unit testing |
| **React Testing Library** | Component testing |
| **Playwright** | E2E testing |
| **MSW** | API mocking |

---

## 📱 Responsive Breakpoints

```typescript
// Tailwind Config
screens: {
  'sm': '640px',   // Mobile landscape
  'md': '768px',   // Tablet
  'lg': '1024px',  // Desktop
  'xl': '1280px',  // Large desktop
  '2xl': '1536px', // Extra large
}
```

---

## 🎨 Design Tokens

### Color Palette (Tailwind)
```
Primary:    blue-500 (#3B82F6)     // Actions, links
Secondary:  slate-500 (#64748B)    // Secondary text
Success:    green-500 (#22C55E)    // Success states
Warning:    amber-500 (#F59E0B)    // Warnings
Danger:     red-500 (#EF4444)      // Errors, alerts
Background: slate-50 (#F8FAFC)     // Page background
Card:       white (#FFFFFF)        // Card backgrounds
```

### Typography
```
Font Family: Inter (system fallback)
Heading Sizes: text-2xl to text-4xl
Body Size: text-sm to text-base
```

---

## 🚀 Deployment Pipeline

```
Developer
    ↓ git push
GitHub Repository
    ↓ webhook
Lovable Platform
    ↓ build
Vite Build (optimized)
    ↓ deploy
Global CDN (Cloudflare)
    ↓
Production (lovable.app)
```

---

## 🔧 Configuration Files

| File | Purpose |
|------|---------|
| `vite.config.ts` | Vite build config, code splitting |
| `tsconfig.json` | TypeScript compiler options |
| `tailwind.config.ts` | Tailwind theme customization |
| `postcss.config.js` | PostCSS plugins |
| `supabase/config.toml` | Edge Functions config |
| `.env` | Environment variables (local) |
| `.env.example` | Environment template |

---

## 📚 Documentation

- [Project Overview](./PROJECT_OVERVIEW.md)
- [Architecture](./ARCHITECTURE.md)
- [Database Schema](./DATABASE.md)
- [API Reference](./API.md)
- [Features](./FEATURES.md)
- [Development Guide](./DEVELOPMENT.md)

---

*Last Updated: April 16, 2026*