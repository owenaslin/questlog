# Authentication & Database Access Guide

This guide explains when and how to use different Supabase authentication methods in this codebase.

## Quick Reference

| Scenario | Helper | Where | Why |
|----------|--------|-------|-----|
| **Client-side queries** | `getSupabaseClient()` | Client components, browser | Uses anon key with PKCE flow; auto-refreshes tokens |
| **Server-side private data** | `getSupabaseServerClient()` | Server components, API routes | Uses service role; bypasses RLS safely on server |
| **Public data query** | `getSupabaseClient()` | Either | Anon key sufficient for public data |
| **API with user token** | Bearer token in header | API routes | Secure user context propagation |

---

## Pattern 1: Client-Side Authentication (Browser)

### Use When
- Querying in client components
- User data that belongs to logged-in user
- Interactive features needing real-time updates
- Mutations (INSERT, UPDATE, DELETE)

### How To Use

```typescript
// Client Component
"use client";

import { getSupabaseClient } from "@/lib/supabase";

export default function MyComponent() {
  const supabase = getSupabaseClient();

  async function fetchMyProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    return profile;
  }

  // ...
}
```

### How It Works
- `getSupabaseClient()` creates a client with the public anon key
- Browser PKCE flow handles authentication automatically
- Tokens stored in browser (localStorage/sessionStorage)
- RLS policies see authenticated `auth.uid()` context
- Auto-refresh handles token expiration

### Security
✅ Safe - relies on browser's Origin isolation and secure storage  
✅ Only sends public anon key to browser  
✅ Tokens managed by browser securely

---

## Pattern 2: Server-Side Authentication (Next.js Server Components)

### Use When
- Server components need to fetch private data
- Fetch user profile, preferences, or user-owned resources
- Avoid client-side data exposure
- Need guaranteed RLS enforcement

### How To Use

```typescript
// Server Component
import { getSupabaseServerClient } from "@/lib/supabase";

export default async function ProfilePage() {
  // First, get authenticated user (if needed)
  const anonClient = getSupabaseClient();
  const { data: { user } } = await anonClient.auth.getUser();
  
  if (!user) {
    redirect("/auth");
  }

  // Then fetch user data with service role
  const supabase = getSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return <ProfileView profile={profile} />;
}
```

### How It Works
- `getSupabaseServerClient()` uses `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- Service role bypasses RLS policies safely (only runs server-side)
- Environment variable never exposed to client
- Throws error if key is not configured

### Security
✅ Safe - service role key never reaches client  
✅ Server-side execution only  
✅ Can fetch any data securely  
⚠️ Must validate user identity yourself (use auth.getUser() first)

### Common Pattern: Check Auth, Then Fetch

```typescript
// Step 1: Verify user is authenticated
const anonClient = getSupabaseClient();
const { data: { user } } = await anonClient.auth.getUser();

if (!user) {
  redirect("/auth");
}

// Step 2: Fetch user's private data with service role
const serverClient = getSupabaseServerClient();
const { data: profile } = await serverClient
  .from("profiles")
  .select("*")
  .eq("id", user.id)
  .single();
```

---

## Pattern 3: API Routes with User Tokens

### Use When
- Building REST/RPC API endpoints
- Need to verify user who made the request
- Propagating user context to database

### How To Use

```typescript
// src/app/api/my-endpoint/route.ts
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );

  // Now queries use the user's context from token
  const { data: { user } } = await supabase.auth.getUser();
  // ... your logic with authenticated context
}
```

### How It Works
- Client sends Bearer token in Authorization header
- API creates client with that token
- RLS sees the token's user context
- Queries enforce user permissions via RLS

### Security
✅ User token in Authorization header (standard)  
✅ Server validates token and enforces permissions  
✅ Token lifetime is limited  
✅ RLS policies enforce user isolation

---

## Pattern 4: Public Data (Predefined Quests)

### Use When
- Accessing predefined, world-readable data
- Displaying content to anonymous users
- No user-specific data needed

### How To Use

```typescript
// In-memory data (fastest, no DB query needed)
import { ALL_QUESTS } from "@/lib/quests";

const quest = ALL_QUESTS.find((q) => q.id === questId);

// Or query public table
const supabase = getSupabaseClient();
const { data: quests } = await supabase
  .from("quests")
  .select("*")
  .eq("source", "predefined");
```

### How It Works
- Uses anon key (no user context needed)
- RLS allows `source = 'predefined'` for anyone
- No authentication required

### Security
✅ Safe - data is public anyway  
✅ Anon key only for public data

---

## Common Mistakes to Avoid

### ❌ Wrong: Using Anon Client for Private Data in Server Components

```typescript
// BAD - This will fail with RLS error
const supabase = getSupabaseClient();
const { data: profile } = await supabase
  .from("profiles")
  .select("*")
  .eq("id", user.id)
  .single();
// ❌ Server component with no session = anon context = RLS blocks private data
```

### ✅ Right: Use Service Role for Server-Side Private Data

```typescript
// GOOD - Service role bypasses RLS safely
const supabase = getSupabaseServerClient();
const { data: profile } = await supabase
  .from("profiles")
  .select("*")
  .eq("id", user.id)
  .single();
```

### ❌ Wrong: Exposing Service Role Key

```typescript
// BAD - Never do this!
const supabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, ...);
export const supabaseInstance = supabase; // 💥 Exposed!
```

### ✅ Right: Keep Service Role Server-Side Only

```typescript
// GOOD - Only created and used in server components
export function getSupabaseServerClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) throw new Error("Key not configured");
  return createClient(url, serviceRoleKey, ...);
}
// Always used server-side only, never exported to client
```

---

## Environment Variables Required

Make sure these are set in your `.env.local`:

```env
# Public (safe to expose to client)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR...

# Private (server-side only)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR...
```

If `SUPABASE_SERVICE_ROLE_KEY` is missing and you try to use `getSupabaseServerClient()`, you'll get:
```
Error: SUPABASE_SERVICE_ROLE_KEY environment variable is not configured
```

---

## Decision Tree

```
Need to query database?
├─ Client component?
│  └─ Yes → Use getSupabaseClient()
├─ Server component?
│  ├─ Fetching public data (e.g., predefined quests)?
│  │  └─ Yes → Use getSupabaseClient() or ALL_QUESTS
│  └─ Fetching private/user-specific data?
│     └─ Yes → Use getSupabaseServerClient()
└─ API route?
   └─ Use Bearer token in Authorization header
```

---

## RLS Policy Examples

This is how RLS policies work with different authentication methods:

### Example 1: Public Data
```sql
CREATE POLICY "Predefined quests are public" ON quests
  FOR SELECT USING (source = 'predefined');
```
- ✅ Works with: anon key, service role, any user
- Reason: Policy allows anyone

### Example 2: User-Owned Data
```sql
CREATE POLICY "Users see their own profile" ON profiles
  FOR SELECT USING (id = auth.uid());
```
- ✅ Works with: user token (auth.uid() = user ID)
- ✅ Works with: service role (ignores RLS)
- ❌ Fails with: anon client on server (auth.uid() = NULL)

### Example 3: Mixed (Public + User-Owned)
```sql
CREATE POLICY "Predefined quests or owned quests" ON quests
  FOR SELECT USING (
    source = 'predefined' OR user_id = auth.uid()
  );
```
- ✅ Works with: anon key (can see predefined)
- ✅ Works with: user token (can see owned)
- ✅ Works with: service role (can see all)
- ❌ Fails with: anon key on server for user-owned (auth.uid() = NULL)

---

## Testing Your Authentication

### Client Component Test
```typescript
"use client";
import { getSupabaseClient } from "@/lib/supabase";

// This should show your profile
const supabase = getSupabaseClient();
const { data: { user } } = await supabase.auth.getUser();
console.log("Logged in as:", user?.email);
```

### Server Component Test
```typescript
// This should fetch any user's profile (with service role)
const supabase = getSupabaseServerClient();
const { data: profile } = await supabase
  .from("profiles")
  .select("*")
  .eq("id", "any-user-id")
  .single();
console.log("Profile:", profile);
```

### Verify No 404 Errors
After making changes, test:
1. Accept a custom quest → navigate to `/quests/{id}` (no 404)
2. Navigate to `/board/{id}` with custom quest (no 404)
3. Check `/discover` page loads with user profile (no 404)

