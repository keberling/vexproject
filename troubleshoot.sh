#!/bin/bash

# VEX Project Management - Troubleshooting Script
# Helps diagnose production issues

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=========================================="
echo "VEX Project Management - Troubleshooting"
echo "==========================================${NC}"
echo ""

# Check service status
echo -e "${BLUE}[1] Checking service status...${NC}"
if systemctl is-active --quiet vexproject.service 2>/dev/null; then
    echo -e "${GREEN}✓ Service is running${NC}"
    systemctl status vexproject.service --no-pager -l | head -20
else
    echo -e "${RED}✗ Service is NOT running${NC}"
    echo "Attempting to get status..."
    systemctl status vexproject.service --no-pager -l | head -20 || true
fi
echo ""

# Check recent logs
echo -e "${BLUE}[2] Checking recent service logs (last 50 lines)...${NC}"
echo -e "${YELLOW}--- Service Logs ---${NC}"
sudo journalctl -u vexproject.service -n 50 --no-pager || echo "Could not read logs"
echo ""

# Check if port is listening
echo -e "${BLUE}[3] Checking if port 3000 is listening...${NC}"
if netstat -tuln 2>/dev/null | grep -q ":3000 " || ss -tuln 2>/dev/null | grep -q ":3000 "; then
    echo -e "${GREEN}✓ Port 3000 is listening${NC}"
    netstat -tuln 2>/dev/null | grep ":3000 " || ss -tuln 2>/dev/null | grep ":3000 "
else
    echo -e "${RED}✗ Port 3000 is NOT listening${NC}"
    echo "The application may not be running or listening on the wrong port."
fi
echo ""

# Check if process is running
echo -e "${BLUE}[4] Checking for Node.js processes...${NC}"
if pgrep -f "next start" > /dev/null || pgrep -f "node.*next" > /dev/null; then
    echo -e "${GREEN}✓ Node.js/Next.js process found${NC}"
    ps aux | grep -E "next|node" | grep -v grep | head -5
else
    echo -e "${RED}✗ No Node.js/Next.js process found${NC}"
fi
echo ""

# Check .env file
echo -e "${BLUE}[5] Checking .env file...${NC}"
if [ -f ".env" ]; then
    echo -e "${GREEN}✓ .env file exists${NC}"
    if grep -q "NEXTAUTH_URL" .env; then
        echo "NEXTAUTH_URL is set"
        grep "NEXTAUTH_URL" .env | sed 's/=.*/=***/'
    else
        echo -e "${YELLOW}⚠ NEXTAUTH_URL not found in .env${NC}"
    fi
    if grep -q "DATABASE_URL" .env; then
        echo "DATABASE_URL is set"
    else
        echo -e "${RED}✗ DATABASE_URL not found in .env${NC}"
    fi
else
    echo -e "${RED}✗ .env file NOT found${NC}"
fi
echo ""

# Check if build exists
echo -e "${BLUE}[6] Checking if application is built...${NC}"
if [ -d ".next" ]; then
    echo -e "${GREEN}✓ Build directory (.next) exists${NC}"
    if [ -f ".next/BUILD_ID" ]; then
        BUILD_ID=$(cat .next/BUILD_ID 2>/dev/null || echo "unknown")
        echo "  Build ID: $BUILD_ID"
    fi
else
    echo -e "${RED}✗ Build directory (.next) NOT found${NC}"
    echo "  Run: npm run build"
fi
echo ""

# Check database
echo -e "${BLUE}[7] Checking database...${NC}"
if [ -f "prisma/dev.db" ]; then
    echo -e "${GREEN}✓ Database file exists${NC}"
    DB_SIZE=$(du -h prisma/dev.db | cut -f1)
    echo "  Size: $DB_SIZE"
else
    echo -e "${YELLOW}⚠ Database file not found at prisma/dev.db${NC}"
    echo "  Check DATABASE_URL in .env"
fi
echo ""

# Check Caddy status
echo -e "${BLUE}[8] Checking Caddy status...${NC}"
if systemctl is-active --quiet caddy 2>/dev/null; then
    echo -e "${GREEN}✓ Caddy service is running${NC}"
    systemctl status caddy --no-pager -l | head -10
else
    echo -e "${YELLOW}⚠ Caddy service status unknown (may not be systemd managed)${NC}"
fi

# Check Caddy config
if [ -f "/etc/caddy/Caddyfile" ]; then
    echo ""
    echo "Caddyfile configuration:"
    echo -e "${YELLOW}--- Caddyfile (project.vexitey.com section) ---${NC}"
    grep -A 10 "project.vexitey.com" /etc/caddy/Caddyfile || echo "project.vexitey.com not found in Caddyfile"
fi
echo ""

# Test local connection
echo -e "${BLUE}[9] Testing local connection to port 3000...${NC}"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200\|301\|302"; then
    echo -e "${GREEN}✓ Application responds on localhost:3000${NC}"
else
    echo -e "${RED}✗ Application does NOT respond on localhost:3000${NC}"
    echo "  This suggests the app is not running or crashed"
fi
echo ""

# Summary and recommendations
echo -e "${BLUE}=========================================="
echo "Troubleshooting Summary"
echo "==========================================${NC}"
echo ""
echo "Common fixes:"
echo "  1. Restart service: sudo systemctl restart vexproject.service"
echo "  2. Check logs: sudo journalctl -u vexproject.service -f"
echo "  3. Rebuild: npm run build"
echo "  4. Check Caddy: sudo systemctl restart caddy"
echo "  5. Verify .env has correct NEXTAUTH_URL (should be https://project.vexitey.com)"
echo ""

