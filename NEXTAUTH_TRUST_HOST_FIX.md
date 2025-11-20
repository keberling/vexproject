# Fixing NextAuth UntrustedHost Error

## Problem

When running the application, you may see this error:
```
[auth][error] UntrustedHost: Host must be trusted.
URL was: http://localhost:3000/api/auth/error.
```

This is a security feature in NextAuth v5 that requires hosts to be explicitly trusted.

## Solution

### Option 1: Add Environment Variable (Recommended)

Add this to your `.env` file:

```env
AUTH_TRUST_HOST="true"
```

Or for production:
```env
AUTH_TRUST_HOST="false"  # Only trust specific hosts
AUTH_URL="https://yourdomain.com"  # Your production URL
```

### Option 2: The Code Already Handles This

The `auth.ts` file has been updated to automatically trust the host in development mode. If you're still seeing the error:

1. **Restart your dev server** after adding the environment variable
2. **Check your `.env` file** - make sure `AUTH_TRUST_HOST="true"` is set
3. **Verify the environment variable is loaded** - the app reads from `.env` automatically

## Environment Variables for NextAuth v5

NextAuth v5 uses these environment variables:

- `AUTH_URL` - The base URL of your application (replaces `NEXTAUTH_URL` in v5)
- `AUTH_TRUST_HOST` - Set to `"true"` or `"1"` to trust the host (for development)
- `NEXTAUTH_SECRET` - Still required for JWT signing

### Development `.env` Example

```env
# NextAuth Configuration
AUTH_URL="http://localhost:3000"
AUTH_TRUST_HOST="true"
NEXTAUTH_SECRET="your-secret-here"
```

### Production `.env` Example

```env
# NextAuth Configuration
AUTH_URL="https://yourdomain.com"
AUTH_TRUST_HOST="false"  # Only trust the AUTH_URL host
NEXTAUTH_SECRET="your-production-secret-here"
```

## Quick Fix

If you just want to get it working quickly, add this line to your `.env` file:

```env
AUTH_TRUST_HOST="true"
```

Then restart your dev server (`npm run dev` or `npm start`).

## Why This Happens

NextAuth v5 introduced stricter security to prevent host header injection attacks. The `trustHost` option (or `AUTH_TRUST_HOST` environment variable) tells NextAuth to trust requests from the specified host.

In development, it's safe to set `AUTH_TRUST_HOST="true"` to trust localhost. In production, you should set `AUTH_URL` to your production domain and keep `AUTH_TRUST_HOST="false"` (or omit it) to only trust that specific host.

