# SchoolPool - Project Overview

**SchoolPool** is a modern carpooling platform designed specifically for Chadwick School families. It enables parents and students to coordinate ride sharing safely and efficiently, reducing individual driving time while building community connections.

---

## 🎯 Mission

Connect Chadwick School families for safe, verified carpooling to:
- Reduce driving time and traffic congestion
- Save money on gas and vehicle wear
- Build community relationships
- Meet Conditional Use Permit (CUP) requirements

---

## 📊 Key Statistics

| Metric | Value |
|--------|-------|
| **Target Users** | Chadwick School parents & students |
| **Platform** | Web application (React + TypeScript) |
| **Deployment** | Lovable hosting + Supabase backend |
| **Architecture** | Serverless (Edge Functions) |
| **Bundle Size** | ~194KB (main) |
| **Code Splitting** | 7 manual chunks |

---

## 🏫 Chadwick School Context

**Location:** Palos Verdes Peninsula, CA  
**Address:** 26800 S Academy Dr  
**Grades Served:** K-12

### School Schedule (built into app logic):
- **K-6:** 7:55 AM - 3:15 PM (Mon, Tue, Thu)
- **K-6:** 8:55 AM - 3:15 PM (Wed - late start)
- **K-6:** 7:55 AM - 2:30 PM (Fri - early dismissal)
- **7-12:** 7:55 AM - 3:40 PM (Mon, Tue, Thu)
- **7-12:** 8:55 AM - 3:40 PM (Wed - late start)
- **9-12 Sports:** until 5:00 PM

---

## 👥 User Types

### Parents
- Create ride offers ("I can drive")
- Request rides ("I need pickup")
- Manage family schedules
- Link student accounts
- View public profiles of other parents
- Rate/review other drivers

### Students
- View family schedules
- See linked parent rides
- Cannot create rides (view-only)
- Linked to parent accounts

---

## 🔄 Core Workflows

### 1. Ride Offer Flow
```
Parent creates offer → Posted to Find Rides → Other parents request → 
Driver accepts → Ride confirmed → Notifications sent
```

### 2. Ride Request Flow
```
Parent creates request → Posted to Find Rides → Drivers offer help → 
Requester accepts → Ride confirmed → Notifications sent
```

### 3. Recurring Ride Series
```
Create weekly ride (Mon-Fri) → System generates instances → 
Parents join series → Weekly notifications → Occasional cancellations
```

### 4. Family Linking
```
Student account created → Parent sends link request → 
Student approves → Accounts linked → Shared schedule visible
```

---

## 🛡️ Safety Features

1. **Verified Emails Only**
   - @chadwickschool.org for students
   - Parent email whitelist for non-Chadwick parents
   - Banned email list for security

2. **Two-Factor Authentication (2FA)**
   - Email verification code on login
   - Rate limiting (10 attempts per minute)

3. **Public Profile View**
   - Parents can see each other's verified info
   - Vehicle details (make, model, color, license plate)
   - Emergency contact information
   - Privacy settings controlled by user

4. **Ride Visibility Controls**
   - Private rides (invitation only)
   - Public rides (visible to all verified users)
   - Linked family rides (shared with linked students)

---

## 📱 Key Screens

| Screen | Purpose | User Types |
|--------|---------|------------|
| **Dashboard** | Overview, quick actions, notifications | All |
| **Find Rides** | Map view of all available rides | All |
| **My Rides** | Personal ride management | Parents |
| **Post Ride** | Create new ride offer/request | Parents |
| **Conversations** | Ride request management | Parents |
| **Family Links** | Student-parent linking | All |
| **Profile** | User information & settings | All |
| **Series** | Recurring ride management | Parents |

---

## 🎨 Design System

- **Framework:** shadcn/ui + Tailwind CSS
- **Color Scheme:** Blue primary (#3B82F6), with amber/green accents
- **Typography:** Inter font family
- **Icons:** Lucide React
- **Components:** Radix UI primitives

---

## 📈 Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| First Contentful Paint | < 1.5s | ✓ |
| Time to Interactive | < 3.5s | ✓ |
| Main Bundle Size | < 250KB | 194KB ✓ |
| Lighthouse Score | > 90 | TBD |

---

## 🚀 Deployment Architecture

```
┌─────────────────────────────────────────────────────┐
│                    User Browser                      │
│              (Chrome, Safari, Firefox)               │
└──────────────────┬──────────────────────────────────┘
                   │ HTTPS
                   ▼
┌─────────────────────────────────────────────────────┐
│              Lovable Hosting (CDN)                   │
│         (chadwickschoolpool.lovable.app)             │
│            - Static assets (JS, CSS, HTML)            │
│            - React SPA                               │
└──────────────────┬──────────────────────────────────┘
                   │ API Calls
                   ▼
┌─────────────────────────────────────────────────────┐
│              Supabase Platform                       │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │   Auth       │  │  Database    │  │  Storage │ │
│  │  (JWT)       │  │  (Postgres)  │  │ (Files)  │ │
│  └──────────────┘  └──────────────┘  └──────────┘ │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │         Edge Functions (Deno)                 │  │
│  │  - auth-login, auth-create-account           │  │
│  │  - auth-send-2fa, auth-verify-2fa            │  │
│  │  - create-notification, etc.                 │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## 📚 Documentation Index

- [Architecture](./ARCHITECTURE.md) - Technical architecture & data flow
- [Tech Stack](./TECH_STACK.md) - Technologies, libraries, dependencies
- [Database Schema](./DATABASE.md) - Tables, relationships, RLS policies
- [API Reference](./API.md) - Edge Functions, endpoints, authentication
- [Features](./FEATURES.md) - Detailed feature documentation
- [Development Guide](./DEVELOPMENT.md) - Setup, debugging, deployment
- [Security](./SECURITY.md) - Security measures, authentication flow
- [Deployment](./DEPLOYMENT.md) - Production deployment process

---

## 📞 Support & Contact

- **Created by:** Ethan Fang & Luke Johnson
- **School:** Chadwick School, Palos Verdes
- **Platform:** Lovable (lovable.dev)
- **Repository:** https://github.com/ljohnson2029-lgtm/chadwickschoolpool

---

*Last Updated: April 15, 2026*