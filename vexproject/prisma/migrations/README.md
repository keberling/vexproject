# Database Migrations

This directory contains database migration scripts and utilities.

## Migration Scripts

### migrate-project-fields.ts

Migrates existing project contact data from single string fields to separate name/email fields.

**Usage:**
```bash
npx tsx prisma/migrations/migrate-project-fields.ts
```

**What it does:**
- Parses existing contact strings (format: "Name <email@example.com>")
- Splits into name and email fields
- Preserves all existing data
- Safe to run multiple times (idempotent)

## Running Migrations

### Development
```bash
npx prisma migrate dev --name migration_name
```

### Production
```bash
npx prisma migrate deploy
```

## Important Notes

- **Always backup** your database before running migrations
- **Test migrations** on a copy of production data first
- **Never delete** migration files after they've been applied
- **Review migration SQL** before applying to production

