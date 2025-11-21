#!/bin/bash

# VEX Project Management - Systemd Service Setup Script
# This script helps automate the setup of the application as a systemd service

set -e

echo "=========================================="
echo "VEX Project Management Service Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root for certain operations
if [ "$EUID" -eq 0 ]; then 
   echo -e "${RED}Error: Do not run this script as root. Run as your regular user.${NC}"
   exit 1
fi

# Get current directory
APP_DIR=$(pwd)
USER=$(whoami)
HOME_DIR=$(eval echo ~$USER)

echo "Application directory: $APP_DIR"
echo "User: $USER"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed.${NC}"
    echo "Please install Node.js 18+ first:"
    echo "  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -"
    echo "  sudo apt install -y nodejs"
    exit 1
fi

NODE_VERSION=$(node --version)
echo -e "${GREEN}✓ Node.js found: $NODE_VERSION${NC}"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed.${NC}"
    exit 1
fi

NPM_VERSION=$(npm --version)
echo -e "${GREEN}✓ npm found: $NPM_VERSION${NC}"

# Check if package.json exists
if [ ! -f "$APP_DIR/package.json" ]; then
    echo -e "${RED}Error: package.json not found in current directory.${NC}"
    echo "Please run this script from the application root directory."
    exit 1
fi

echo -e "${GREEN}✓ Application found${NC}"
echo ""

# Check if .env file exists
if [ ! -f "$APP_DIR/.env" ]; then
    echo -e "${YELLOW}Warning: .env file not found.${NC}"
    echo "You'll need to create a .env file before starting the service."
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo -e "${GREEN}✓ .env file found${NC}"
fi

# Check if application is built
if [ ! -d "$APP_DIR/.next" ]; then
    echo -e "${YELLOW}Application not built yet. Building now...${NC}"
    npm run build
    echo -e "${GREEN}✓ Build complete${NC}"
else
    echo -e "${GREEN}✓ Application already built${NC}"
fi

# Get Node.js and npm paths
NODE_PATH=$(which node)
NPM_PATH=$(which npm)

# Verify paths exist
if [ -z "$NODE_PATH" ] || [ ! -f "$NODE_PATH" ]; then
    echo -e "${RED}Error: Could not find Node.js executable${NC}"
    exit 1
fi

if [ -z "$NPM_PATH" ] || [ ! -f "$NPM_PATH" ]; then
    echo -e "${RED}Error: Could not find npm executable${NC}"
    exit 1
fi

echo ""
echo "Detected paths:"
echo "  Node.js: $NODE_PATH"
echo "  npm: $NPM_PATH"
echo ""

# Ask for port (default 3000)
read -p "Enter port number (default: 3000): " PORT
PORT=${PORT:-3000}

# Create service file
SERVICE_FILE="vexproject.service"
echo ""
echo "Creating service file..."

# Use EnvironmentFile to load .env if it exists, otherwise rely on individual Environment variables
ENV_FILE_LINE=""
if [ -f "$APP_DIR/.env" ]; then
    ENV_FILE_LINE="EnvironmentFile=$APP_DIR/.env"
fi

cat > "$SERVICE_FILE" << EOF
[Unit]
Description=VEX Project Management Application
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
Environment=PORT=$PORT
$ENV_FILE_LINE
ExecStart=$NPM_PATH start
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=vexproject

# Security settings
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

echo -e "${GREEN}✓ Service file created: $SERVICE_FILE${NC}"

# Ask if user wants to install the service
echo ""
read -p "Install service to systemd? (requires sudo) (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Installing service..."
    
    # Copy service file to systemd
    sudo cp "$SERVICE_FILE" /etc/systemd/system/
    echo -e "${GREEN}✓ Service file copied to /etc/systemd/system/${NC}"
    
    # Reload systemd
    sudo systemctl daemon-reload
    echo -e "${GREEN}✓ Systemd daemon reloaded${NC}"
    
    # Enable service
    sudo systemctl enable vexproject.service
    echo -e "${GREEN}✓ Service enabled (will start on boot)${NC}"
    
    # Ask if user wants to start the service now
    echo ""
    read -p "Start the service now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo systemctl start vexproject.service
        echo -e "${GREEN}✓ Service started${NC}"
        
        # Wait a moment and check status
        sleep 2
        echo ""
        echo "Service status:"
        sudo systemctl status vexproject.service --no-pager -l
        
        echo ""
        echo -e "${GREEN}=========================================="
        echo "Setup Complete!"
        echo "==========================================${NC}"
        echo ""
        echo "Useful commands:"
        echo "  Check status:  sudo systemctl status vexproject.service"
        echo "  View logs:     sudo journalctl -u vexproject.service -f"
        echo "  Restart:       sudo systemctl restart vexproject.service"
        echo "  Stop:          sudo systemctl stop vexproject.service"
        echo ""
        echo "Your application should be running at: http://localhost:$PORT"
    else
        echo ""
        echo -e "${GREEN}=========================================="
        echo "Setup Complete!"
        echo "==========================================${NC}"
        echo ""
        echo "To start the service, run:"
        echo "  sudo systemctl start vexproject.service"
        echo ""
        echo "Useful commands:"
        echo "  Check status:  sudo systemctl status vexproject.service"
        echo "  View logs:     sudo journalctl -u vexproject.service -f"
    fi
else
    echo ""
    echo -e "${GREEN}=========================================="
    echo "Service file created!"
    echo "==========================================${NC}"
    echo ""
    echo "To install manually:"
    echo "  1. Review the service file: $SERVICE_FILE"
    echo "  2. Copy it: sudo cp $SERVICE_FILE /etc/systemd/system/"
    echo "  3. Reload: sudo systemctl daemon-reload"
    echo "  4. Enable: sudo systemctl enable vexproject.service"
    echo "  5. Start: sudo systemctl start vexproject.service"
fi

echo ""

