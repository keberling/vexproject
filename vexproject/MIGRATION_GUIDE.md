# Database Migration Guide for Production

This guide ensures safe database migrations without data loss.

## Migration Strategy

### 1. Always Use Prisma Migrations

**DO:**
```bash
npx prisma migrate dev --name descriptive_migration_name
```

**DON'T:**
```bash
npx prisma db push  # Only for development, not production
```

### 2. Test Migrations Locally First

1. **Backup your production database** (if testing with production data)
2. **Test the migration** on a copy of production data
3. **Verify data integrity** after migration
4. **Apply to production** only after successful testing

### 3. Current Schema Changes (Project Contact Fields)

The current changes split contact fields into name and email:

**Before:**
- `gcContact` (single string)
- `cdsContact` (single string)
- `franchiseOwnerContact` (single string)

**After:**
- `gcContactName` + `gcContactEmail`
- `cdsContactName` + `cdsContactEmail`
- `franchiseOwnerContactName` + `franchiseOwnerContactEmail`

### 4. Safe Migration Steps

#### Step 1: Backup Database
```bash
# SQLite backup
cp prisma/dev.db prisma/dev.db.backup-$(date +%Y%m%d-%H%M%S)

# Or for production
cp /path/to/production.db /path/to/production.db.backup-$(date +%Y%m%d-%H%M%S)
```

#### Step 2: Run Data Migration Script (if needed)
If you have existing contact data to migrate:
```bash
npx tsx prisma/migrations/migrate-project-fields.ts
```

#### Step 3: Apply Schema Changes
```bash
# Generate migration
npx prisma migrate dev --name update_project_contact_fields

# This will:
# 1. Create a migration file in prisma/migrations/
# 2. Apply the migration to your database
# 3. Regenerate Prisma Client
```

#### Step 4: Verify Migration
```bash
# Check migration status
npx prisma migrate status

# Open Prisma Studio to verify data
npx prisma studio
```

### 5. Production Deployment

#### Option A: Zero-Downtime Migration (Recommended)

1. **Deploy new code** (with migration files)
2. **Run migration** on production:
   ```bash
   npx prisma migrate deploy
   ```
3. **Restart application**

#### Option B: Manual Migration

1. **Stop application**
2. **Backup database**
3. **Run migration**:
   ```bash
   npx prisma migrate deploy
   ```
4. **Start application**

### 6. Rollback Strategy

If a migration fails:

1. **Restore from backup**:
   ```bash
   cp prisma/dev.db.backup-YYYYMMDD-HHMMSS prisma/dev.db
   ```

2. **Revert code** to previous version

3. **Fix migration** and retry

### 7. Best Practices

#### ✅ DO:
- Always backup before migrations
- Test migrations on staging first
- Use descriptive migration names
- Review generated migration SQL
- Keep migration files in version control
- Document breaking changes

#### ❌ DON'T:
- Use `db push` in production
- Delete migration files
- Skip testing migrations
- Migrate without backups
- Make breaking changes without migration scripts

### 8. Current Migration Checklist

For the current project contact fields update:

- [ ] Backup production database
- [ ] Test migration on staging/copy of production data
- [ ] Run data migration script (if needed)
- [ ] Apply schema migration: `npx prisma migrate dev --name update_project_contact_fields`
- [ ] Verify all projects migrated correctly
- [ ] Test application functionality
- [ ] Deploy to production
- [ ] Run `npx prisma migrate deploy` on production
- [ ] Verify production data integrity

### 9. Migration File Location

Migrations are stored in: `prisma/migrations/`

Each migration includes:
- `migration.sql` - SQL statements to apply
- `migration_lock.toml` - Database lock file

### 10. Troubleshooting

**Migration fails:**
- Check error message
- Verify database connection
- Ensure no conflicting migrations
- Check for data conflicts

**Data loss concerns:**
- Always backup first
- Review migration SQL before applying
- Test on copy of production data

**Schema drift:**
- Run `npx prisma migrate status` to check
- Resolve any drift before deploying

## Quick Reference

```bash
# Check migration status
npx prisma migrate status

# Create new migration
npx prisma migrate dev --name migration_name

# Apply migrations (production)
npx prisma migrate deploy

# Reset database (DEVELOPMENT ONLY - DELETES ALL DATA)
npx prisma migrate reset

# Generate Prisma Client after schema changes
npx prisma generate
```

