#!/bin/bash

# Fix Database Permissions Script
# Fixes database permissions issues in /opt/vexproject

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

INSTALL_DIR="/opt/vexproject"
USER=$(whoami)

echo -e "${BLUE}=========================================="
echo "Fix Database Permissions"
echo "==========================================${NC}"
echo ""

# Check if directory exists
if [ ! -d "$INSTALL_DIR" ]; then
    echo -e "${RED}Error: $INSTALL_DIR does not exist${NC}"
    exit 1
fi

cd "$INSTALL_DIR"

# Ensure prisma directory exists
echo -e "${BLUE}Creating prisma directory if needed...${NC}"
mkdir -p "$INSTALL_DIR/prisma"
chmod 755 "$INSTALL_DIR/prisma"
echo -e "${GREEN}✓ Prisma directory ready${NC}"

# Fix ownership
echo ""
echo -e "${BLUE}Fixing ownership...${NC}"
sudo chown -R $USER:$USER "$INSTALL_DIR/prisma"
if [ -f "$INSTALL_DIR/prisma/dev.db" ]; then
    sudo chown $USER:$USER "$INSTALL_DIR/prisma/dev.db"
fi
echo -e "${GREEN}✓ Ownership fixed${NC}"

# Fix permissions
echo ""
echo -e "${BLUE}Setting permissions...${NC}"
chmod 755 "$INSTALL_DIR/prisma"
if [ -f "$INSTALL_DIR/prisma/dev.db" ]; then
    chmod 664 "$INSTALL_DIR/prisma/dev.db"
    echo -e "${GREEN}✓ Database file permissions set${NC}"
else
    echo -e "${YELLOW}⚠ Database file doesn't exist yet${NC}"
fi

# Initialize database if it doesn't exist
if [ ! -f "$INSTALL_DIR/prisma/dev.db" ]; then
    echo ""
    echo -e "${BLUE}Initializing database...${NC}"
    if npm run db:push; then
        echo -e "${GREEN}✓ Database initialized${NC}"
        chmod 664 "$INSTALL_DIR/prisma/dev.db"
    else
        echo -e "${RED}Error: Failed to initialize database${NC}"
        echo "Make sure your .env file has DATABASE_URL set correctly"
        exit 1
    fi
fi

# Verify database is accessible
echo ""
echo -e "${BLUE}Verifying database access...${NC}"
if [ -f "$INSTALL_DIR/prisma/dev.db" ] && [ -r "$INSTALL_DIR/prisma/dev.db" ] && [ -w "$INSTALL_DIR/prisma/dev.db" ]; then
    echo -e "${GREEN}✓ Database is readable and writable${NC}"
else
    echo -e "${RED}Error: Database file is not accessible${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}=========================================="
echo "Database Permissions Fixed!"
echo "==========================================${NC}"
echo ""
echo "The database should now be accessible."
echo ""
echo "If you're running as a service, restart it:"
echo "  sudo systemctl restart vexproject.service"
echo ""


