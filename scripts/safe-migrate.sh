#!/bin/bash

# Safe Database Migration Script for Production
# This script ensures safe migrations with backups and verification

set -e  # Exit on error

echo "🔒 Safe Database Migration Script"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if database exists
DB_PATH="${DATABASE_URL#file:}"
if [ -z "$DB_PATH" ]; then
    DB_PATH="./prisma/dev.db"
fi

if [ ! -f "$DB_PATH" ]; then
    echo -e "${RED}❌ Database file not found: $DB_PATH${NC}"
    exit 1
fi

# Create backups directory
BACKUP_DIR="./backups"
mkdir -p "$BACKUP_DIR"

# Generate backup filename
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/db-backup-$TIMESTAMP.db"

echo -e "${YELLOW}📦 Step 1: Creating database backup...${NC}"
cp "$DB_PATH" "$BACKUP_FILE"
echo -e "${GREEN}✅ Backup created: $BACKUP_FILE${NC}"
echo ""

# Check migration status
echo -e "${YELLOW}📊 Step 2: Checking migration status...${NC}"
npx prisma migrate status || echo -e "${YELLOW}⚠️  No migrations found or database not initialized${NC}"
echo ""

# Ask for confirmation
read -p "Do you want to proceed with the migration? (yes/no): " -r
echo
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${YELLOW}Migration cancelled${NC}"
    exit 0
fi

# Run migration
echo -e "${YELLOW}🔄 Step 3: Running migration...${NC}"
if [ "$1" == "deploy" ]; then
    echo "Running: npx prisma migrate deploy"
    npx prisma migrate deploy
else
    echo "Running: npx prisma migrate dev"
    read -p "Enter migration name: " -r MIGRATION_NAME
    npx prisma migrate dev --name "$MIGRATION_NAME"
fi

# Verify migration
echo ""
echo -e "${YELLOW}✅ Step 4: Verifying migration...${NC}"
npx prisma migrate status

echo ""
echo -e "${GREEN}✅ Migration completed successfully!${NC}"
echo -e "${GREEN}📦 Backup saved at: $BACKUP_FILE${NC}"
echo ""
echo -e "${YELLOW}💡 To rollback (if needed):${NC}"
echo "   cp $BACKUP_FILE $DB_PATH"

