# SchoolPool - API Reference

## 🌐 Base URL

```
Production: https://dchwbbvpsgxwqezqhbfw.supabase.co
Functions:  https://dchwbbvpsgxwqezqhbfw.supabase.co/functions/v1/
```

---

## 🔐 Authentication

### Overview
Authentication uses a **two-step process**:
1. **Edge Function validation** (custom users table)
2. **Supabase Auth JWT** (after 2FA verification)

### Authentication Flow
```
1. POST /auth-check-email
   ↓
2. POST /auth-send-2fa
   ↓
3. POST /auth-verify-2fa
   ↓
4. POST /auth-login (with 2FA code)
   ↓
5. Supabase Auth signInWithPassword
   ↓
6. JWT stored in localStorage
```

---

## 📚 Edge Functions Reference

### Authentication Functions

#### 1. auth-check-email
**Endpoint:** `POST /functions/v1/auth-check-email`  
**Public:** Yes (no JWT required)  
**Purpose:** Validate email eligibility before registration

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (Chadwick email):**
```json
{
  "approved": true,
  "reason": "Chadwick School email",
  "isStudent": true
}
```

**Response (Whitelisted parent):**
```json
{
  "approved": true,
  "reason": "Email in parent whitelist",
  "isStudent": false
}

```

**Response (Denied):**
```json
{
  "approved": false,
  "message": "This email is not recognized..."
}
```

**Logic:**
- @chadwickschool.org → Approved (student if not whitelisted, parent if whitelisted)
- Other emails → Must be in `parent_email_whitelist` table

---

#### 2. auth-send-2fa
**Endpoint:** `POST /functions/v1/auth-send-2fa`  
**Public:** Yes  
**Purpose:** Send 6-digit verification code via email

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Verification code sent"
}
```

**Rate Limiting:** 10 requests per minute per IP

---

#### 3. auth-verify-2fa
**Endpoint:** `POST /functions/v1/auth-verify-2fa`  
**Public:** Yes  
**Purpose:** Verify 6-digit code

**Request:**
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Code verified"
}
```

**Response (Failure):**
```json
{
  "success": false,
  "error": "Invalid verification code",
  "attemptsRemaining": 2
}
```

---

#### 4. auth-login
**Endpoint:** `POST /functions/v1/auth-login`  
**Public:** Yes  
**Purpose:** Validate credentials and return user data

**Request:**
```json
{
  "usernameOrEmail": "username or email",
  "password": "userpassword"
}
```

**Response (Success):**
```json
{
  "success": true,
  "user": {
    "user_id": "uuid",
    "email": "user@example.com",
    "username": "username",
    "first_name": "First",
    "last_name": "Last",
    "phone_number": "+1234567890",
    "is_verified": true
    // ... (no password_hash)
  }
}
```

**Response (Failure):**
```json
{
  "error": "Invalid username/email or password"
}
```

**Security:**
- Rate limiting: 5 failed attempts triggers 1-hour lockout
- Passwords compared using bcrypt

---

#### 5. auth-create-account
**Endpoint:** `POST /functions/v1/auth-create-account`  
**Public:** Yes  
**Purpose:** Create new user account

**Request:**
```json
{
  "email": "user@chadwickschool.org",
  "username": "username",
  "password": "SecurePass123",
  "firstName": "First",
  "lastName": "Last",
  "phoneNumber": "+1234567890"
}
```

**Response (Success):**
```json
{
  "success": true,
  "user": {
    "user_id": "uuid",
    "email": "user@chadwickschool.org",
    "username": "username"
  }
}
```

**Account Type Assignment:**
1. Check `parent_email_whitelist` → If found = parent
2. @chadwickschool.org + NOT in whitelist = student
3. Non-Chadwick + NOT in whitelist = DENIED

---

#### 6. auth-check-username
**Endpoint:** `POST /functions/v1/auth-check-username`  
**Public:** Yes  
**Purpose:** Check username availability

**Request:**
```json
{
  "username": "desiredusername"
}
```

**Response:**
```json
{
  "available": true
}
```

---

#### 7. auth-reset-password
**Endpoint:** `POST /functions/v1/auth-reset-password`  
**Public:** Yes  
**Purpose:** Send password reset email

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset instructions sent"
}
```

---

### Data & Utility Functions

#### 7. get-mapbox-token
**Endpoint:** `POST /functions/v1/get-mapbox-token`  
**Auth:** JWT Required (verify_jwt = true)  
**Purpose:** Get Mapbox API token

**Response:**
```json
{
  "token": "pk.eyJ1..."
}
```

---

#### 8. geocode-address
**Endpoint:** `POST /functions/v1/geocode-address`  
**Auth:** JWT Required  
**Purpose:** Convert address to coordinates

**Request:**
```json
{
  "address": "26800 S Academy Dr, Palos Verdes Peninsula, CA 90274"
}
```

**Response:**
```json
{
  "latitude": 33.77667,
  "longitude": -118.36111,
  "formatted_address": "26800 S Academy Dr..."
}
```

---

#### 9. calculate-route
**Endpoint:** `POST /functions/v1/calculate-route`  
**Auth:** JWT Required  
**Purpose:** Calculate driving route and time

**Request:**
```json
{
  "from": { "lat": 33.77, "lng": -118.36 },
  "to": { "lat": 33.80, "lng": -118.40 }
}
```

**Response:**
```json
{
  "distance": 4.2,
  "duration": 8,
  "geometry": { /* route coordinates */ }
}
```

---

#### 10. get-parent-locations
**Endpoint:** `POST /functions/v1/get-parent-locations`  
**Auth:** JWT Required  
**Purpose:** Get parent home locations for map display

**Response:**
```json
{
  "parents": [
    {
      "id": "uuid",
      "name": "Parent Name",
      "latitude": 33.77,
      "longitude": -118.36
    }
  ]
}
```

---

#### 11. get-parent-profile
**Endpoint:** `POST /functions/v1/get-parent-profile`  
**Auth:** JWT Required  
**Purpose:** Get public profile of a parent

**Request:**
```json
{
  "parentId": "uuid"
}
```

**Response:**
```json
{
  "profile": {
    "id": "uuid",
    "first_name": "First",
    "last_name": "Last",
    "username": "username",
    "car_make": "Toyota",
    "car_model": "Highlander",
    "car_color": "Silver",
    "license_plate": "ABC123",
    "emergency_contact_name": "...",
    "emergency_contact_phone": "..."
  }
}
```

---

#### 12. lookup-parent
**Endpoint:** `POST /functions/v1/lookup-parent`  
**Auth:** JWT Required  
**Purpose:** Search for parents by name/email

**Request:**
```json
{
  "query": "john"
}
```

**Response:**
```json
{
  "results": [
    {
      "id": "uuid",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com"
    }
  ]
}
```

---

#### 13. create-notification
**Endpoint:** `POST /functions/v1/create-notification`  
**Auth:** JWT Required  
**Purpose:** Create in-app notification

**Request:**
```json
{
  "userId": "uuid",
  "type": "ride_request",
  "message": "Someone requested to join your ride"
}
```

**Response:**
```json
{
  "success": true
}
```

---

#### 14. search-parents
**Endpoint:** `POST /functions/v1/search-parents`  
**Auth:** JWT Required  
**Purpose:** Search for parents by name, email, or username

**Request:**
```json
{
  "query": "john",
  "limit": 10
}
```

**Response:**
```json
{
  "parents": [
    {
      "id": "uuid",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "username": "johndoe"
    }
  ]
}
```

---

#### 15. suggest-carpool-partners
**Endpoint:** `POST /functions/v1/suggest-carpool-partners`  
**Auth:** JWT Required  
**Purpose:** AI-powered carpool partner suggestions based on location and schedule

**Request:**
```json
{
  "userId": "uuid",
  "location": { "lat": 33.77, "lng": -118.36 },
  "radius": 5
}
```

**Response:**
```json
{
  "suggestions": [
    {
      "parent_id": "uuid",
      "name": "Jane Smith",
      "distance": 0.8,
      "match_score": 0.92,
      "common_routes": 3
    }
  ]
}
```

---

#### 16. suggest-piggyback-routes
**Endpoint:** `POST /functions/v1/suggest-piggyback-routes`  
**Auth:** JWT Required  
**Purpose:** Suggest efficient piggyback routes for multiple pickups

**Request:**
```json
{
  "pickup_points": [
    { "lat": 33.77, "lng": -118.36 },
    { "lat": 33.78, "lng": -118.37 }
  ],
  "destination": { "lat": 33.80, "lng": -118.40 }
}
```

**Response:**
```json
{
  "optimized_route": {
    "waypoints": [...],
    "total_distance": 4.5,
    "total_duration": 12,
    "savings": "15%"
  }
}
```

---

### Admin Functions

#### 17. submit-access-request
**Endpoint:** `POST /functions/v1/submit-access-request`  
**Public:** Yes  
**Purpose:** Request access for non-approved email

**Request:**
```json
{
  "email": "parent@gmail.com",
  "firstName": "First",
  "lastName": "Last",
  "phone": "+1234567890",
  "reason": "Parent of 3rd grader"
}
```

---

#### 18. manage-access-requests
**Endpoint:** `POST /functions/v1/manage-access-requests`  
**Auth:** JWT Required (Admin only)  
**Purpose:** Approve/deny access requests

**Request:**
```json
{
  "requestId": "uuid",
  "action": "approve" // or "deny"
}
```

---

## 📊 Database Queries (Direct Supabase)

### Rides

#### Fetch All Rides
```typescript
const { data, error } = await supabase
  .from('rides')
  .select(`
    *,
    profiles:user_id (first_name, last_name, username)
  `)
  .eq('visibility', 'public')
  .eq('status', 'active')
  .gte('ride_date', today)
  .order('ride_date', { ascending: true });
```

#### Create Ride
```typescript
const { data, error } = await supabase
  .from('rides')
  .insert({
    user_id: user.id,
    type: 'offer',
    pickup_location: '123 Main St',
    dropoff_location: 'Chadwick School',
    ride_date: '2026-04-20',
    ride_time: '15:15',
    seats_available: 3,
    notes: 'Pickup at front gate'
  });
```

### Conversations

#### Fetch User Conversations
```typescript
const { data, error } = await supabase
  .from('ride_conversations')
  .select(`
    *,
    sender_profile:profiles!ride_conversations_sender_id_fkey(first_name, last_name),
    recipient_profile:profiles!ride_conversations_recipient_id_fkey(first_name, last_name),
    ride:rides(id, type, pickup_location, dropoff_location, ride_date, ride_time)
  `)
  .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
  .order('created_at', { ascending: false });
```

### Realtime Subscriptions

#### Subscribe to Table Changes
```typescript
const channel = supabase
  .channel('rides-channel')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'rides'
    },
    (payload) => {
      console.log('Change received!', payload);
      refreshData();
    }
  )
  .subscribe();
```

---

## 🔒 JWT Authentication

### Token Structure
```
Header: { "alg": "HS256", "typ": "JWT" }
Payload: {
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "authenticated",
  "exp": 1234567890
}
Signature: HMACSHA256(base64url(header) + "." + base64url(payload), secret)
```

### Using JWT in Requests
```typescript
// Supabase client automatically attaches JWT
const supabase = createClient(url, key, {
  auth: {
    storage: localStorage,
    persistSession: true
  }
});

// All requests include Authorization header automatically
const { data } = await supabase.from('rides').select('*');
```

---

## ❌ Error Codes

| Code | Meaning | Resolution |
|------|---------|------------|
| 400 | Bad Request | Check request body format |
| 401 | Unauthorized | Login required or JWT expired |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 429 | Rate Limited | Wait and retry |
| 500 | Server Error | Contact support |

---

## 📚 Related Documentation

- [Project Overview](./PROJECT_OVERVIEW.md)
- [Architecture](./ARCHITECTURE.md)
- [Database Schema](./DATABASE.md)
- [Security](./SECURITY.md)

---

*Last Updated: April 16, 2026*