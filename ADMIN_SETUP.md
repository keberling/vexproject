# Admin Section Setup Guide

## Overview

The admin section provides:
- **User Management**: View all users, their activity, and manage user roles
- **Database Backup**: Create zipped backups of the entire database
- **Database Restore**: Restore the database from a backup file
- **Scheduled Backups**: Automated backups uploaded to SharePoint

## Initial Setup

### 1. Update Database Schema

After adding the `role` field to the User model, run:

```bash
npm run db:push
```

This will add the `role` field to your database. All existing users will default to `role: "user"`.

### 2. Set First User as Admin

You need to manually set at least one user as admin. You can do this in several ways:

#### Option A: Using Prisma Studio (Recommended)

```bash
npm run db:studio
```

1. Open Prisma Studio (usually at http://localhost:5555)
2. Navigate to the `User` model
3. Find your user account
4. Click to edit
5. Change `role` from `"user"` to `"admin"`
6. Save

#### Option B: Using SQL

If you have direct database access:

```sql
UPDATE "User" SET role = 'admin' WHERE email = 'your-email@example.com';
```

#### Option C: Using a Script

Create a temporary script `scripts/set-admin.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2]
  if (!email) {
    console.error('Usage: tsx scripts/set-admin.ts <email>')
    process.exit(1)
  }

  const user = await prisma.user.update({
    where: { email },
    data: { role: 'admin' },
  })

  console.log(`User ${user.email} is now an admin`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

Then run:
```bash
tsx scripts/set-admin.ts your-email@example.com
```

## Accessing the Admin Section

Once you have admin privileges:

1. Log in to the application
2. You'll see an "Admin" link in the sidebar (shield icon)
3. Click it to access the admin dashboard

## Features

### User Management

- View all users and their activity counts
- Change user roles (user ↔ admin)
- Filter activity by specific user
- View user provider (email/Microsoft SSO)

### Database Backup

1. Click "Create Backup" to download a zipped backup
2. Optionally check "Upload to SharePoint" to also upload to SharePoint
3. The backup includes:
   - Complete database file (`database.db`)
   - Metadata file (`backup-metadata.json`)

### Database Restore

1. Click "Restore Backup"
2. Select a `.zip` backup file
3. Confirm the restore (this will replace the current database)
4. **Important**: Restart the server after restoring

### Scheduled Backups

Scheduled backups can be set up to automatically create backups and upload them to SharePoint.

#### Setup Scheduled Backups

1. **Add Environment Variable**

   Add to your `.env` file:
   ```env
   ADMIN_BACKUP_SECRET="your-secret-key-here"
   ```

   Generate a secure secret:
   ```bash
   openssl rand -base64 32
   ```

2. **Set Up Cron Job or Scheduler**

   Use a cron job (Linux/Mac) or Task Scheduler (Windows) to call the backup endpoint:

   ```bash
   # Example: Daily backup at 2 AM
   0 2 * * * curl -X POST http://localhost:3000/api/admin/scheduled-backup \
     -H "Authorization: Bearer your-secret-key-here"
   ```

   Or use a service like:
   - **cron** (Linux/Mac)
   - **Task Scheduler** (Windows)
   - **GitHub Actions** (for cloud deployments)
   - **Vercel Cron** (for Vercel deployments)

3. **Requirements for Scheduled Backups**

   - At least one admin user must have Microsoft SSO enabled
   - The admin user must have a valid `accessToken`
   - SharePoint must be configured (see `MICROSOFT_SSO_SETUP.md`)

#### Vercel Cron Example

If deploying to Vercel, add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/admin/scheduled-backup",
      "schedule": "0 2 * * *"
    }
  ]
}
```

And update the route to handle Vercel cron headers:

```typescript
// In app/api/admin/scheduled-backup/route.ts
const cronSecret = request.headers.get('authorization')
if (cronSecret !== `Bearer ${process.env.ADMIN_BACKUP_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

## Security Notes

- Only users with `role: "admin"` can access admin routes
- The last admin cannot be demoted to user
- Scheduled backups require a secret token for security
- Database restore creates a backup before restoring (saved as `.pre-restore-{timestamp}`)

## Troubleshooting

### "Forbidden - Admin access required"

- Make sure your user has `role: "admin"` in the database
- Check that you're logged in
- Try logging out and back in

### Backup/Restore Issues

- Ensure the database file path is correct in `DATABASE_URL`
- For restore, make sure the backup file is a valid zip with `database.db` inside
- Restart the server after restoring

### Scheduled Backup Not Working

- Verify `ADMIN_BACKUP_SECRET` is set correctly
- Check that an admin user has Microsoft SSO enabled
- Verify SharePoint permissions are granted
- Check server logs for errors

