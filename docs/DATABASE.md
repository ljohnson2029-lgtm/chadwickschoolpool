# SchoolPool - Database Schema Documentation

## 🗄️ Overview

**Database:** PostgreSQL (Supabase)  
**Type:** Relational with JSONB support  
**Security:** Row Level Security (RLS) enabled on all tables  
**Realtime:** Enabled on key tables for live updates

---

## 📊 Entity Relationship Diagram

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    users     │────▶│   profiles   │────▶│ account_links│
│  (auth core) │     │(extended)    │     │(parent/student│
└──────────────┘     └──────────────┘     └──────────────┘
       │                                              │
       │                                              │
       ▼                                              ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    rides     │◀────│ ride_requests│     │ parent_email │
│  (offers)    │     │  (requests)  │     │   whitelist  │
└──────────────┘     └──────────────┘     └──────────────┘
       │
       │
       ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ ride_conver- │────▶│ recurring_  │     │   banned_    │
 │  sations   │     │    rides     │     │    emails    │
└──────────────┘     └──────────────┘     └──────────────┘
```

---

## 📋 Table Definitions

### 1. users (Core Authentication)
```sql
CREATE TABLE public.users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id),
  email text UNIQUE NOT NULL,
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone_number text,
  is_verified boolean DEFAULT false,
  failed_login_attempts integer DEFAULT 0,
  last_failed_login timestamp with time zone,
  last_login timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);
```

**Purpose:** Core user authentication data  
**RLS:** Service role only (managed by Edge Functions)  
**Relationships:**
- `user_id` → `auth.users(id)` (Supabase Auth)
- One-to-one with `profiles`

---

### 2. profiles (Extended User Data)
```sql
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  username text UNIQUE NOT NULL,
  first_name text,
  last_name text,
  phone_number text,
  home_address text,
  home_latitude double precision,
  home_longitude double precision,
  car_make text,
  car_model text,
  car_color text,
  license_plate text,
  car_seats integer,
  account_type text CHECK (account_type IN ('parent', 'student')),
  grade_level text,
  avatar_url text,
  emergency_contact_name text,
  emergency_contact_phone text,
  parent_guardian_name text,
  parent_guardian_phone text,
  parent_guardian_email text,
  profile_complete boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

**Purpose:** Extended profile information  
**RLS:** Users can read all profiles, update own only  
**Fields:**
- `account_type`: 'parent' or 'student'
- `grade_level`: K, 1-12
- `profile_complete`: Required for full access

---

### 3. account_links (Parent-Student Linking)
```sql
CREATE TABLE public.account_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES auth.users(id),
  student_id uuid REFERENCES auth.users(id),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  linked_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);
```

**Purpose:** Links student accounts to parent accounts  
**RLS:** 
- Parents can see their linked students
- Students can see their linked parents
- Only parents can initiate links

**Workflow:**
1. Parent sends link request (status: 'pending')
2. Student approves (status: 'approved')
3. Family schedule becomes shared

---

### 4. rides (Ride Offers)
```sql
CREATE TABLE public.rides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  type text CHECK (type IN ('offer', 'request')),
  pickup_location text NOT NULL,
  pickup_latitude double precision,
  pickup_longitude double precision,
  dropoff_location text NOT NULL,
  dropoff_latitude double precision,
  dropoff_longitude double precision,
  ride_date date NOT NULL,
  ride_time time NOT NULL,
  seats_available integer,
  seats_needed integer,
  notes text,
  visibility text DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  status text DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'completed')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

**Purpose:** Parent ride offers or requests  
**RLS:** 
- Public rides: readable by all authenticated users
- Private rides: readable by invited users only
- Users can update/delete own rides

**Fields:**
- `type`: 'offer' (I can drive) or 'request' (I need ride)
- `visibility`: 'public' (all see) or 'private' (invitation only)
- `seats_available`: For offers (how many seats free)
- `seats_needed`: For requests (how many seats needed)

---

### 5. ride_requests (Ride Join Requests)
```sql
CREATE TABLE public.ride_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid REFERENCES rides(id),
  requester_id uuid REFERENCES auth.users(id),
  driver_id uuid REFERENCES auth.users(id),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  seats_needed integer DEFAULT 1,
  message text,
  requested_at timestamp with time zone DEFAULT now(),
  responded_at timestamp with time zone
);
```

**Purpose:** Parents requesting to join a ride offer  
**RLS:**
- Requester can see own requests
- Driver can see requests for their rides
- Public read for ride participants

---

### 6. ride_conversations (Ride Messaging)
```sql
CREATE TABLE public.ride_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid REFERENCES rides(id),
  sender_id uuid REFERENCES auth.users(id),
  recipient_id uuid REFERENCES auth.users(id),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  message text,
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

**Purpose:** Direct messaging about rides between parents  
**RLS:**
- Sender can see sent messages
- Recipient can see received messages
- Both parties can update status

---

### 7. recurring_rides (Weekly Series)
```sql
CREATE TABLE public.recurring_rides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  type text CHECK (type IN ('offer', 'request')),
  pickup_location text NOT NULL,
  dropoff_location text NOT NULL,
  days_of_week text[] NOT NULL, -- ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  start_date date NOT NULL,
  end_date date,
  time time NOT NULL,
  seats_available integer,
  seats_needed integer,
  notes text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  created_at timestamp with time zone DEFAULT now()
);
```

**Purpose:** Weekly recurring carpool schedules  
**RLS:** Same as `rides` table

**Fields:**
- `days_of_week`: Array of day names
- `start_date`/`end_date`: Series duration

---

### 8. parent_email_whitelist (Access Control)
```sql
CREATE TABLE public.parent_email_whitelist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  first_name text,
  last_name text,
  phone text,
  grade text,
  notes text,
  added_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now()
);
```

**Purpose:** Whitelist for non-Chadwick parent emails  
**RLS:** Admin-only write, readable by authenticated users

**Usage:**
- Non-@chadwickschool.org emails must be in this list to register
- Chadwick emails are automatically approved

---

### 9. banned_emails (Security)
```sql
CREATE TABLE public.banned_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  reason text,
  banned_by text,
  created_at timestamp with time zone DEFAULT now()
);
```

**Purpose:** Block specific emails from registering  
**RLS:** Service role only

---

### 10. access_requests (Admin)
```sql
CREATE TABLE public.access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  full_name text NOT NULL,
  user_type text NOT NULL,
  reason text,
  status text DEFAULT 'pending',
  approved_by uuid REFERENCES auth.users(id),
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

**Purpose:** Store access requests from non-approved emails  
**RLS:** Admin-only write, requester can view own request

**Workflow:**
1. User submits access request with contact info
2. Admin reviews in approval dashboard
3. Approved emails added to whitelist
4. User can then register normally

---

### 11. approved_emails (Verification)
```sql
CREATE TABLE public.approved_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  approved_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now()
);
```

**Purpose:** Track emails that have been manually approved  
**RLS:** Admin write, authenticated read

---

### 12. children (Family Data)
```sql
CREATE TABLE public.children (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  name text NOT NULL,
  first_name text,
  last_name text,
  age integer NOT NULL,
  grade_level text,
  school text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);
```

**Purpose:** Store children's information for parents  
**RLS:** Parents can manage own children, linked accounts can view

**Fields:**
- `user_id`: Parent who owns this child record
- `grade_level`: K-12 or preschool
- `school`: School name (defaults to Chadwick School)

---

### 13. co_parent_links (Co-Parenting)
```sql
CREATE TABLE public.co_parent_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid REFERENCES auth.users(id),
  requested_id uuid REFERENCES auth.users(id),
  status text DEFAULT 'pending',
  approved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);
```

**Purpose:** Link co-parents for shared ride management  
**RLS:** Linked co-parents can see each other's rides

**Workflow:**
1. Parent A sends link request to co-parent (Parent B)
2. Parent B approves the link
3. Both parents can manage rides for shared children

---

## 🔐 Row Level Security (RLS) Policies

### Profiles Table
```sql
-- Everyone can read profiles (for public viewing)
CREATE POLICY "Public profiles are viewable"
ON profiles FOR SELECT
TO authenticated
USING (true);

-- Users can only update own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);
```

### Rides Table
```sql
-- Public rides: readable by all authenticated
CREATE POLICY "Public rides are viewable"
ON rides FOR SELECT
TO authenticated
USING (visibility = 'public' OR user_id = auth.uid());

-- Users can manage own rides
CREATE POLICY "Users can manage own rides"
ON rides FOR ALL
TO authenticated
USING (user_id = auth.uid());
```

### Account Links Table
```sql
-- Parents can see their student links
CREATE POLICY "Parents can see their links"
ON account_links FOR SELECT
TO authenticated
USING (
  parent_id = auth.uid() OR 
  student_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM account_links al
    WHERE al.parent_id = auth.uid()
    AND al.student_id = account_links.student_id
  )
);
```

---

## 📈 Database Functions

### 1. is_student_email(email)
```sql
CREATE OR REPLACE FUNCTION is_student_email(email text)
RETURNS boolean AS $$
BEGIN
  -- Check if whitelisted parent (whitelist = NOT student)
  IF EXISTS (
    SELECT 1 FROM parent_email_whitelist 
    WHERE email = LOWER(is_student_email.email)
  ) THEN
    RETURN false;
  END IF;
  
  -- Check if @chadwickschool.org domain
  RETURN LOWER(email) LIKE '%@chadwickschool.org';
END;
$$ LANGUAGE plpgsql;
```

**Purpose:** Determine if email should be assigned student or parent account

### 2. get_family_schedule(student_user_id)
```sql
CREATE OR REPLACE FUNCTION get_family_schedule(student_user_id uuid)
RETURNS TABLE (...) AS $$
  -- Returns all rides for linked parents of a student
  -- Includes: ride details, parent info, pickup time
$$ LANGUAGE plpgsql;
```

**Purpose:** Student dashboard: view all family carpools

### 3. get_student_series_rides(student_user_id)
```sql
CREATE OR REPLACE FUNCTION get_student_series_rides(student_user_id uuid)
RETURNS TABLE (...) AS $$
  -- Returns recurring rides for linked parents
  -- With cancellation status for specific dates
$$ LANGUAGE plpgsql;
```

**Purpose:** Student view of recurring weekly rides

---

## 🔄 Realtime Subscriptions

### Enabled Tables
- `rides` - Live ride updates
- `ride_conversations` - New messages
- `ride_requests` - Status changes

### Usage Pattern
```typescript
const channel = supabase
  .channel('table-changes')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'rides' },
    (payload) => {
      // Handle realtime update
      refreshData();
    }
  )
  .subscribe();
```

---

## 📊 Indexes

### Performance Indexes
```sql
-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- Rides
CREATE INDEX idx_rides_user_id ON rides(user_id);
CREATE INDEX idx_rides_date ON rides(ride_date);
CREATE INDEX idx_rides_status ON rides(status);
CREATE INDEX idx_rides_visibility ON rides(visibility);

-- Conversations
CREATE INDEX idx_conversations_sender ON ride_conversations(sender_id);
CREATE INDEX idx_conversations_recipient ON ride_conversations(recipient_id);

-- Account Links
CREATE INDEX idx_account_links_parent ON account_links(parent_id);
CREATE INDEX idx_account_links_student ON account_links(student_id);
```

---

## 🚀 Migration History

| Migration | Description | Date |
|-----------|-------------|------|
| `20260415212558` | Add banned_emails table | Apr 15, 2026 |
| `20260414004604` | Add account linking features | Apr 14, 2026 |
| `20260414001810` | Add parent whitelist | Apr 14, 2026 |
| `20260414001745` | Add recurring rides | Apr 14, 2026 |
| `20260414001723` | Add ride conversations | Apr 14, 2026 |
| `20260414001355` | Initial rides schema | Apr 14, 2026 |

---

## 📚 Related Documentation

- [Project Overview](./PROJECT_OVERVIEW.md)
- [API Reference](./API.md)
- [Features](./FEATURES.md)

---

*Last Updated: April 16, 2026*