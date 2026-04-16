# SchoolPool - Development Guide

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (LTS recommended)
- npm or bun package manager
- Git
- Supabase CLI (for edge function deployment)

### Quick Start

```bash
# Clone repository
git clone https://github.com/ljohnson2029-lgtm/chadwickschoolpool.git
cd chadwickschoolpool

# Install dependencies
npm install

# Start development server
npm run dev

# Open browser
open http://localhost:5173
```

---

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # shadcn/ui components
│   ├── series/         # Recurring ride components
│   ├── student/        # Student-specific components
│   └── ...
├── contexts/           # React contexts (AuthContext)
├── hooks/              # Custom React hooks
├── integrations/       # External service configs
│   └── supabase/       # Supabase client & types
├── lib/                # Utility functions
│   ├── utils.ts
│   ├── logger.ts       # Logging utility
│   ├── smartSchedule.ts
│   └── naturalLanguageParser.ts
├── pages/              # Route components
└── App.tsx            # Main app component
```

---

## 🔧 Development Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Type checking
npx tsc --noEmit

# Preview production build
npm run preview
```

---

## 🌐 Environment Variables

Copy `.env.example` to `.env` and fill in values:

```bash
cp .env.example .env
```

### Required Variables
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
VITE_MAPBOX_TOKEN=your_mapbox_token
```

---

## 🗄️ Database Migrations

### Running Migrations Locally

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to project
supabase link --project-ref dchwbbvpsgxwqezqhbfw

# Run migrations
supabase db push
```

### Creating New Migrations

```bash
supabase migration new migration_name
```

Edit the generated SQL file in `supabase/migrations/`.

---

## 🚀 Edge Functions

### Local Development

```bash
# Start Supabase locally
supabase start

# Serve functions locally
supabase functions serve
```

### Deploy Functions

```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy function-name
```

---

## 🐛 Debugging

### Browser DevTools

1. **React DevTools**: Install browser extension
2. **Network Tab**: Monitor API calls to Supabase
3. **Console Tab**: Check for errors

### Common Issues

#### CORS Errors
```
Access to fetch blocked by CORS policy
```
**Solution:** Ensure `supabase/functions/_shared/cors.ts` includes your origin.

#### Type Errors
```
Property 'X' does not exist on type 'never'
```
**Solution:** Check Supabase types in `src/integrations/supabase/types.ts`

#### Login Issues
**Solution:** 
1. Check browser console for errors
2. Verify `VITE_SUPABASE_URL` in `.env`
3. Clear localStorage and retry

---

## 🧪 Testing (Future)

### Recommended Stack
- **Vitest**: Unit testing
- **React Testing Library**: Component testing
- **Playwright**: E2E testing

### Example Test Structure
```
__tests__/
├── unit/
│   ├── lib/
│   └── components/
├── integration/
└── e2e/
```

---

## 📦 Build Process

### Vite Configuration
Key settings in `vite.config.ts`:

```typescript
export default defineConfig({
  server: {
    port: 5173,
    strictPort: false,
  },
  build: {
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks: {
          // Code splitting configuration
        }
      }
    }
  }
});
```

### Code Splitting
Automatic chunks created:
- `react-core`: React + Router
- `mapbox`: Mapbox GL
- `ui-vendor`: Radix UI
- `supabase`: Supabase client
- `query`: TanStack Query
- `date-utils`: date-fns
- `icons`: Lucide React

---

## 🔄 Git Workflow

```bash
# Check status
git status

# Stage changes
git add .

# Commit
git commit -m "feat: description"

# Push to GitHub
git push origin main

# Pull updates (from Lovable or other sources)
git pull origin main
```

---

## 🚀 Deployment

### Lovable Auto-Deploy
1. Push to GitHub
2. Lovable detects changes automatically
3. Deploys to production in ~2-3 minutes
4. URL: https://chadwickschoolpool.lovable.app

### Manual Steps (if needed)
```bash
# Build
npm run build

# Deploy (if not using Lovable)
# Upload dist/ folder to hosting provider
```

---

## 🔒 Security Checklist

Before deploying:
- [ ] Remove all `console.log` statements (or use logger)
- [ ] Verify `.env` is in `.gitignore`
- [ ] Check JWT verification is enabled
- [ ] Test CORS configuration
- [ ] Run TypeScript check: `npx tsc --noEmit`
- [ ] Build succeeds: `npm run build`

---

## 📝 Coding Standards

### TypeScript
- Use strict types (avoid `any`)
- Define interfaces for all data structures
- Use union types for status/enums

### React
- Functional components with hooks
- Custom hooks for reusable logic
- Context for global state
- Props interfaces required

### Styling
- Tailwind CSS utility classes
- shadcn/ui component patterns
- Responsive design (mobile-first)

---

## 📚 Documentation

All documentation is in `/docs`:
- [Project Overview](./PROJECT_OVERVIEW.md)
- [Architecture](./ARCHITECTURE.md)
- [Tech Stack](./TECH_STACK.md)
- [Database Schema](./DATABASE.md)
- [API Reference](./API.md)
- [Features](./FEATURES.md)

---

## 🆘 Getting Help

### Resources
- **React Docs**: https://react.dev
- **Supabase Docs**: https://supabase.com/docs
- **Tailwind Docs**: https://tailwindcss.com/docs
- **shadcn/ui**: https://ui.shadcn.com

### Support
- GitHub Issues: https://github.com/ljohnson2029-lgtm/chadwickschoolpool/issues
- Lovable Support: support@lovable.dev

---

*Last Updated: April 16, 2026*