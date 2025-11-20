#!/bin/bash

# VEX Project Management - Deployment Script
# Updates code from git, rebuilds application, and restarts service
# Preserves database - does NOT run db:push or db:seed
# Can be run from home directory - will auto-detect app location

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=========================================="
echo "VEX Project Management - Deployment"
echo "==========================================${NC}"
echo ""

# Try to find the application directory
# Check common locations
POSSIBLE_DIRS=(
    "/opt/VEXProjects"
    "/home/$USER/vexproject"
    "/home/$USER/VEXProjects"
    "$HOME/vexproject"
    "$HOME/VEXProjects"
    "$(pwd)"
)

APP_DIR=""

# First, check if we're already in the app directory
if [ -f "$(pwd)/package.json" ]; then
    APP_DIR=$(pwd)
    echo -e "${GREEN}✓ Found application in current directory: $APP_DIR${NC}"
else
    # Try to find it in common locations
    for dir in "${POSSIBLE_DIRS[@]}"; do
        if [ -f "$dir/package.json" ]; then
            APP_DIR="$dir"
            echo -e "${GREEN}✓ Found application at: $APP_DIR${NC}"
            break
        fi
    done
fi

# If still not found, ask user
if [ -z "$APP_DIR" ] || [ ! -f "$APP_DIR/package.json" ]; then
    echo -e "${YELLOW}Could not auto-detect application directory.${NC}"
    echo "Please enter the full path to your application directory:"
    read -p "Path: " APP_DIR
    
    if [ ! -f "$APP_DIR/package.json" ]; then
        echo -e "${RED}Error: package.json not found at $APP_DIR${NC}"
        exit 1
    fi
fi

echo -e "${BLUE}Using application directory: $APP_DIR${NC}"
echo ""

# Change to application directory
cd "$APP_DIR"

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Warning: .env file not found in $APP_DIR${NC}"
    echo "Make sure your environment variables are set."
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if git is available
if ! command -v git &> /dev/null; then
    echo -e "${RED}Error: git is not installed.${NC}"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed.${NC}"
    exit 1
fi

NODE_VERSION=$(node --version)
echo -e "${GREEN}✓ Node.js: $NODE_VERSION${NC}"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed.${NC}"
    exit 1
fi

NPM_VERSION=$(npm --version)
echo -e "${GREEN}✓ npm: $NPM_VERSION${NC}"
echo ""

# Step 1: Pull latest code
echo -e "${BLUE}[1/5] Pulling latest code from git...${NC}"
if git pull; then
    echo -e "${GREEN}✓ Code updated${NC}"
else
    echo -e "${RED}Error: Failed to pull code from git${NC}"
    exit 1
fi
echo ""

# Step 2: Install dependencies
echo -e "${BLUE}[2/5] Installing dependencies...${NC}"
if npm install; then
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${RED}Error: Failed to install dependencies${NC}"
    exit 1
fi
echo ""

# Step 3: Generate Prisma client (required after schema changes)
echo -e "${BLUE}[3/5] Generating Prisma client...${NC}"
if npm run db:generate; then
    echo -e "${GREEN}✓ Prisma client generated${NC}"
else
    echo -e "${RED}Error: Failed to generate Prisma client${NC}"
    exit 1
fi
echo ""

# Note: We intentionally skip db:push to preserve database
echo -e "${YELLOW}ℹ Skipping database schema push (preserving existing database)${NC}"
echo ""

# Step 4: Build application
echo -e "${BLUE}[4/5] Building application...${NC}"
if npm run build; then
    echo -e "${GREEN}✓ Build complete${NC}"
else
    echo -e "${RED}Error: Build failed${NC}"
    exit 1
fi
echo ""

# Step 5: Restart service (if systemd service exists)
echo -e "${BLUE}[5/5] Restarting service...${NC}"
if systemctl is-active --quiet vexproject.service 2>/dev/null || systemctl list-units --type=service | grep -q "vexproject.service"; then
    echo "Restarting systemd service..."
    if sudo systemctl restart vexproject.service; then
        echo -e "${GREEN}✓ Service restarted${NC}"
        
        # Wait a moment and check status
        sleep 3
        if systemctl is-active --quiet vexproject.service; then
            echo -e "${GREEN}✓ Service is running${NC}"
            echo ""
            echo "Service status:"
            sudo systemctl status vexproject.service --no-pager -l | head -15
        else
            echo -e "${YELLOW}⚠ Service may not be running. Check status with:${NC}"
            echo "  sudo systemctl status vexproject.service"
            echo ""
            echo "Recent logs:"
            sudo journalctl -u vexproject.service -n 20 --no-pager | tail -10
        fi
    else
        echo -e "${RED}Error: Failed to restart service${NC}"
        echo "You may need to restart manually:"
        echo "  sudo systemctl restart vexproject.service"
    fi
elif command -v pm2 &> /dev/null && pm2 list | grep -q "vexproject"; then
    echo "Restarting PM2 process..."
    if pm2 restart vexproject; then
        echo -e "${GREEN}✓ PM2 process restarted${NC}"
        pm2 status vexproject
    else
        echo -e "${RED}Error: Failed to restart PM2 process${NC}"
    fi
else
    echo -e "${YELLOW}⚠ No service manager detected${NC}"
    echo "You'll need to restart the application manually:"
    echo "  - If using systemd: sudo systemctl restart vexproject.service"
    echo "  - If using PM2: pm2 restart vexproject"
    echo "  - If running manually: Stop current process and run 'npm start'"
fi
echo ""

# Summary
echo -e "${GREEN}=========================================="
echo "Deployment Complete!"
echo "==========================================${NC}"
echo ""
echo "Summary:"
echo "  ✓ Code updated from git"
echo "  ✓ Dependencies installed"
echo "  ✓ Prisma client generated"
echo "  ✓ Application built"
echo "  ✓ Service restarted (if applicable)"
echo ""
echo -e "${YELLOW}Note: Database schema was NOT updated.${NC}"
echo "If you have schema changes, run manually:"
echo "  npm run db:push"
echo ""
echo "Useful commands:"
echo "  Check service status:  sudo systemctl status vexproject.service"
echo "  View logs:             sudo journalctl -u vexproject.service -f"
echo "  View PM2 logs:         pm2 logs vexproject"
echo ""

