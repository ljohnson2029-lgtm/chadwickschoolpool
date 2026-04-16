# SchoolPool - Features Documentation

## 🎯 Core Features

### 1. 🔐 Authentication & Security

#### Two-Factor Authentication (2FA)
**What it does:**
- Sends 6-digit verification code via email on login
- Rate limited to 10 attempts per minute
- 3 attempts before temporary lockout

**User Flow:**
1. Enter email/username and password
2. Click "Continue"
3. Check email for 6-digit code
4. Enter code within 10 minutes
5. Successfully logged in

#### Account Types
**Parent Accounts:**
- Can create rides (offers and requests)
- Can view and respond to all public rides
- Can link student accounts
- Full access to platform features

**Student Accounts:**
- View-only access to family rides
- Cannot create or modify rides
- Can see linked parent schedules
- Read-only profile management

---

### 2. 🚗 Ride Management

#### Create Ride Offer
**What it does:**
Parents can offer to drive other students to/from school.

**Fields:**
- Pickup location (with map selection)
- Dropoff location (usually Chadwick School)
- Date and time
- Number of seats available
- Additional notes
- Visibility (public or private)

#### Create Ride Request
**What it does:**
Parents can request rides for their children.

**Fields:**
- Pickup needed or dropoff needed
- Location and time
- Number of seats needed
- Child's name/grade
- Special requirements

#### Find Rides (Map View)
**What it does:**
Interactive map showing all available rides near you.

**Features:**
- Mapbox integration with custom markers
- Filter by date, time, type
- See ride details on click
- Request to join directly from map
- Color-coded markers (offers vs requests)

#### My Rides Dashboard
**What it does:**
Personal ride management center.

**Sections:**
- **Active Rides:** Current/upcoming rides you're driving or joining
- **Past Rides:** History of completed rides
- **Family Rides:** (Students) See linked parent schedules
- **Manage:** Cancel, edit, or duplicate rides

---

### 3. 📅 Recurring Ride Series

#### Weekly Series Creation
**What it does:**
Create repeating rides for regular carpools (e.g., every Monday-Friday).

**Setup:**
- Select days of week
- Start and end dates
- Consistent pickup/dropoff locations
- Automatic generation of individual ride instances

#### Series Management
**Features:**
- View entire series calendar
- Cancel individual days (e.g., "No school Monday")
- Cancel entire series
- Parents can join series (not just individual days)
- Automatic notifications for series members

---

### 4. 💬 Messaging & Conversations

#### Ride Conversations
**What it does:**
Direct messaging system for ride coordination.

**Features:**
- Send requests to join rides
- Accept/decline requests
- Cancel existing arrangements
- View conversation history
- Real-time message updates

#### Quick Replies
**Pre-written messages:**
- "Running 5 min late"
- "I'm here in pickup line"
- "Can't make it today"
- "Different driver today"
- "Confirmed! See you then."

---

### 5. 👨‍👩‍👧 Family Linking

#### Parent-Student Account Linking
**What it does:**
Connect parent and student accounts for shared schedule visibility.

**Process:**
1. Parent sends link request to student email
2. Student receives notification
3. Student accepts link request
4. Accounts linked - schedules shared

**Benefits:**
- Students see all family carpools
- Parents manage rides, students view-only
- Reduces duplicate ride creation
- Improves family coordination

---

### 6. 🔔 Notifications

#### In-App Notifications
**Types:**
- New ride request received
- Ride request accepted/declined
- Conversation message received
- Linked account requests
- Reminders for upcoming rides

#### Notification Settings
**Controls:**
- Enable/disable notification types
- Email notification preferences
- In-app notification center

---

### 7. 👤 Profile Management

#### Public Profiles
**What others see:**
- First and last name
- Username
- Account type (parent/student)
- Vehicle information (parents)
  - Make, model, color
  - License plate
  - Number of seats
- Emergency contact information

#### Private Settings
**User controls:**
- Home address (private, used for routing)
- Phone number
- Email address
- Privacy settings (what's public vs private)
- Vehicle details (optional)

#### Profile Completion
**Required for full access:**
- Home address
- Phone number
- Emergency contact
- (Parents) Vehicle information

---

### 8. 🗺️ Smart Scheduling (AI Features)

#### Smart Schedule Calculator
**What it does:**
AI-powered time calculation based on:
- Child's grade level
- School schedule (regular vs late start vs early dismissal)
- Distance from school
- Traffic patterns in Palos Verdes

**Output:**
- Suggested pickup time
- Travel time estimate
- Arrival buffer calculation
- Reasoning explanation

#### Natural Language Parser
**What it does:**
Allow parents to type ride requests in plain English.

**Examples:**
- "I need pickup for Tommy on Monday at 3:15"
  → Parsed: child=Toby, day=Monday, time=15:15
  
- "Can someone drive Sarah to school Tuesday morning?"
  → Parsed: child=Sarah, day=Tuesday, action=dropoff
  
- "Offering ride from PV to Chadwick every Wednesday at 7:45"
  → Parsed: type=offer, recurring=Wednesdays, time=07:45

**Confidence Scoring:**
- Shows how well the input was understood
- Suggests missing information
- Provides time recommendations

---

### 9. 🛡️ Safety Features

#### Email Verification
**Requirements:**
- Students: @chadwickschool.org required
- Parents: Either @chadwickschool.org OR in parent whitelist
- All emails verified via 2FA code

#### Banned Email List
**Security measure:**
- Administrators can ban problematic users
- Banned emails blocked at registration
- Prevents repeat offenders

#### Access Request System
**For non-Chadwick parents:**
1. Submit request with contact info
2. School administrator reviews
3. Approved emails added to whitelist
4. Can then register normally

---

### 10. 👨‍👩‍👧 Co-Parent Linking

#### Co-Parent Account Linking
**What it does:**
Link co-parents together for shared ride management and visibility.

**Process:**
1. Parent sends link request to co-parent
2. Co-parent receives notification
3. Co-parent accepts link
4. Both parents can see and manage shared children's rides

**Benefits:**
- Both parents see same ride schedule
- Either parent can coordinate pickups
- Reduces duplicate ride creation
- Improves family coordination

---

### 11. 👶 Children Management

#### Child Profiles
**What it does:**
Parents can add and manage their children's information.

**Fields:**
- Name, age, grade level
- School (defaults to Chadwick)
- Special requirements

**Usage:**
- Reference children when creating rides
- Other parents see children's names in ride details
- Age-appropriate pickup/dropoff logic

---

### 12. 🤖 AI-Powered Suggestions

#### Carpool Partner Suggestions
**What it does:**
AI analyzes your location and schedule to suggest compatible carpool partners.

**Factors:**
- Proximity to your home
- Similar schedules and routes
- Grade-level compatibility
- Historical ride patterns

#### Piggyback Route Optimization
**What it does:**
Suggests efficient pickup routes when driving multiple children.

**Features:**
- Optimizes pickup order
- Calculates time savings
- Shows route on map
- Considers traffic patterns

---

### 13. 🔑 Password Recovery

#### Forgot Password
**What it does:**
Allows users to reset their password via email.

**Flow:**
1. Click "Forgot Password" on login
2. Enter registered email
3. Receive reset email with secure link
4. Set new password

---

### 14. 📱 User Experience Features

#### Responsive Design
**Works on:**
- Desktop computers
- Tablets
- Mobile phones
- All major browsers

#### Loading States
**Visual feedback:**
- Skeleton screens during data fetch
- Loading spinners for actions
- Progress indicators for multi-step processes
- Animated transitions (Framer Motion)

#### Error Handling
**User-friendly errors:**
- Clear error messages
- Suggested solutions
- "Try again" buttons
- Contact support links

#### Error Boundary
**Crash protection:**
- Catches React errors
- Shows friendly error page
- "Refresh page" button
- Error details (dev mode only)

---

## 🎨 User Interface Components

### Dashboard Layout
```
┌─────────────────────────────────────┐
│  Logo    Nav        [User Menu]     │  ← Navigation
├─────────────────────────────────────┤
│                                     │
│  Welcome Back, [Name]!              │  ← Greeting
│                                     │
│  ┌─────────┐ ┌─────────┐ ┌────────┐ │
│  │ Find    │ │ My      │ │ Post   │ │  ← Quick Actions
│  │ Rides   │ │ Rides   │ │ Ride   │ │
│  └─────────┘ └─────────┘ └────────┘ │
│                                     │
│  ┌────────────────────────────────┐ │
│  │ Upcoming Rides                │ │  ← Content Area
│  │ • Ride 1                     │ │
│  │ • Ride 2                     │ │
│  └────────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

### Map Interface
```
┌─────────────────────────────────────┐
│  Filter: [Today ▼] [Offers ▼]      │
├─────────────────────────────────────┤
│                                     │
│    ╔═══╗                          │
│    ║ 🚗 ║  ← Ride Offer Marker    │
│    ╚═══╝                          │
│         ┌───┐                      │
│         │ 🎓 │ ← Ride Request       │
│         └───┘                      │
│              ╔═══╗                 │
│              ║ 🏠 ║ ← Your Home    │
│              ╚═══╝                 │
│                                     │
│  [?] Legend                        │
└─────────────────────────────────────┘
```

---

## 🔄 Feature Workflows

### Complete Ride Lifecycle

#### 1. Parent A Creates Ride Offer
```
Click "Post Ride" → Fill form → Submit
   ↓
Ride appears on Find Rides map
   ↓
Other parents can see and request
```

#### 2. Parent B Requests to Join
```
See ride on map → Click "Request"
   ↓
Send message to Parent A
   ↓
Wait for approval
```

#### 3. Parent A Accepts Request
```
Receive notification → View request
   ↓
Check Parent B's profile
   ↓
Click "Accept"
   ↓
Confirmation sent to both parents
```

#### 4. Ride Day
```
Both parents receive reminder
   ↓
Parent B drops off child
   ↓
Quick message: "Thanks!" or "Running late"
   ↓
Ride completed
```

#### 5. Post-Ride
```
Ride marked as completed
   ↓
Available for rating (future feature)
   ↓
Added to ride history
```

---

## 📊 Feature Comparison

| Feature | Parent | Student | Visitor |
|---------|--------|---------|---------|
| View Public Rides | ✅ | ✅ | ❌ |
| Create Rides | ✅ | ❌ | ❌ |
| Request Rides | ✅ | ❌ | ❌ |
| View Family Schedule | ✅ | ✅ | ❌ |
| Messaging | ✅ | ❌ | ❌ |
| Edit Profile | ✅ | ✅ | ❌ |
| Link Accounts | ✅ | ✅* | ❌ |
| Link Co-Parents | ✅ | ❌ | ❌ |
| Manage Children | ✅ | ❌ | ❌ |
| AI Carpool Suggestions | ✅ | ❌ | ❌ |
| Route Optimization | ✅ | ❌ | ❌ |
| Admin Functions | ❌ | ❌ | ❌ |

*Student can accept link requests

---

## 🚀 Future Features (Roadmap)

### Planned
- [ ] **Ratings & Reviews** - Rate drivers and riders
- [ ] **Payment Integration** - Split gas costs
- [ ] **Mobile App** - iOS and Android apps
- [ ] **Calendar Sync** - Export to Google/Apple Calendar
- [ ] **SMS Notifications** - Text message alerts
- [ ] **Emergency Contacts** - Auto-notify on delays
- [ ] **School Integration** - Sync with school calendar
- [ ] **Multi-School** - Support other schools
- [ ] **Push Notifications** - Browser push notifications
- [ ] **Advanced AI** - Smarter carpool matching

### In Progress
- [x] **AI Carpool Suggestions** - Smart partner matching
- [x] **Route Optimization** - Efficient piggyback routes
- [x] **Co-Parent Linking** - Shared ride management
- [x] **Children Management** - Child profiles in rides

### Under Consideration
- [ ] **Carpool Groups** - Create private groups
- [ ] **Rewards Program** - Points for frequent carpoolers
- [ ] **Photo Sharing** - Optional carpool photos
- [ ] **Voice Messages** - Quick audio messages
- [ ] **Dark Mode** - UI theme option

---

## 📚 Related Documentation

- [Project Overview](./PROJECT_OVERVIEW.md)
- [Architecture](./ARCHITECTURE.md)
- [API Reference](./API.md)
- [Database Schema](./DATABASE.md)

---

*Last Updated: April 16, 2026*