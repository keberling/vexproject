#!/bin/bash

# VEX Project Management - Complete Installation Script
# Repository: https://github.com/keberling/vexproject.git
# Installs the application to /opt/vexproject and sets up systemd service
# Can be run from anywhere - does everything in one go

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=========================================="
echo "VEX Project Management - Installation"
echo "==========================================${NC}"
echo ""

# Installation directory
INSTALL_DIR="/opt/vexproject"
REPO_URL="https://github.com/keberling/vexproject.git"
USER=$(whoami)

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo -e "${RED}Error: Do not run this script as root. Run as your regular user.${NC}"
   echo "The script will use sudo when needed for /opt directory operations."
   exit 1
fi

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo -e "${RED}Error: git is not installed.${NC}"
    echo "Please install git first:"
    echo "  sudo apt update && sudo apt install -y git"
    exit 1
fi

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
echo ""

# Check if /opt/vexproject already exists
if [ -d "$INSTALL_DIR" ]; then
    echo -e "${YELLOW}Directory $INSTALL_DIR already exists.${NC}"
    if [ -f "$INSTALL_DIR/package.json" ]; then
        echo -e "${YELLOW}It appears the application is already installed.${NC}"
        read -p "Do you want to update it? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}Updating existing installation...${NC}"
            cd "$INSTALL_DIR"
            if [ -d ".git" ]; then
                git pull origin main 2>/dev/null || git pull origin master 2>/dev/null || git pull 2>/dev/null || true
            fi
            npm install
            npm run db:generate 2>/dev/null || true
            npm run build 2>/dev/null || true
            echo -e "${GREEN}✓ Updated${NC}"
            echo ""
            # Check if service is already set up
            if systemctl list-unit-files 2>/dev/null | grep -q "vexproject.service"; then
                echo -e "${GREEN}Service is already set up.${NC}"
                read -p "Restart the service? (y/n) " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    sudo systemctl restart vexproject.service
                    echo -e "${GREEN}✓ Service restarted${NC}"
                    sudo systemctl status vexproject.service --no-pager -l | head -15
                fi
                exit 0
            else
                echo "Service is not set up yet. Continuing with service setup..."
                echo ""
                # Continue with service setup below
            fi
        else
            echo "Installation cancelled."
            exit 0
        fi
    else
        echo -e "${YELLOW}Directory exists but doesn't appear to be the application.${NC}"
        read -p "Remove it and install fresh? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            sudo rm -rf "$INSTALL_DIR"
        else
            echo "Installation cancelled."
            exit 1
        fi
    fi
fi

# Create /opt directory if it doesn't exist
if [ ! -d "/opt" ]; then
    echo "Creating /opt directory..."
    sudo mkdir -p /opt
fi

# Clone the repository
echo -e "${BLUE}Cloning repository to $INSTALL_DIR...${NC}"
sudo mkdir -p "$INSTALL_DIR"
sudo chown $USER:$USER "$INSTALL_DIR"

if git clone "$REPO_URL" "$INSTALL_DIR"; then
    echo -e "${GREEN}✓ Repository cloned${NC}"
else
    echo -e "${RED}Error: Failed to clone repository${NC}"
    exit 1
fi

# Change to installation directory
cd "$INSTALL_DIR"

# Install dependencies
echo ""
echo -e "${BLUE}Installing dependencies...${NC}"
if npm install; then
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${RED}Error: Failed to install dependencies${NC}"
    exit 1
fi

# Generate Prisma client
echo ""
echo -e "${BLUE}Generating Prisma client...${NC}"
if npm run db:generate; then
    echo -e "${GREEN}✓ Prisma client generated${NC}"
else
    echo -e "${YELLOW}Warning: Failed to generate Prisma client${NC}"
fi

# Ensure prisma directory exists and has proper permissions
echo ""
echo -e "${BLUE}Setting up database directory...${NC}"
mkdir -p "$INSTALL_DIR/prisma"
chmod 755 "$INSTALL_DIR/prisma"
echo -e "${GREEN}✓ Database directory ready${NC}"

# Initialize database if it doesn't exist
if [ ! -f "$INSTALL_DIR/prisma/dev.db" ]; then
    echo ""
    echo -e "${BLUE}Initializing database...${NC}"
    if npm run db:push; then
        echo -e "${GREEN}✓ Database initialized${NC}"
    else
        echo -e "${YELLOW}Warning: Database initialization failed. You may need to run 'npm run db:push' manually.${NC}"
    fi
else
    echo -e "${GREEN}✓ Database file already exists${NC}"
fi

# Ensure database file has proper permissions
if [ -f "$INSTALL_DIR/prisma/dev.db" ]; then
    chmod 664 "$INSTALL_DIR/prisma/dev.db"
    echo -e "${GREEN}✓ Database file permissions set${NC}"
fi

# Check for .env file
echo ""
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠ .env file not found${NC}"
    if [ -f ".env.example" ]; then
        echo "Copying .env.example to .env..."
        cp .env.example .env
        echo -e "${GREEN}✓ Created .env from .env.example${NC}"
        echo -e "${YELLOW}Please edit .env file with your configuration:${NC}"
        echo "  nano $INSTALL_DIR/.env"
    else
        echo -e "${YELLOW}Please create a .env file with your configuration:${NC}"
        echo "  nano $INSTALL_DIR/.env"
    fi
else
    echo -e "${GREEN}✓ .env file found${NC}"
fi

# Make scripts executable
echo ""
echo -e "${BLUE}Making scripts executable...${NC}"
chmod +x deploy.sh setup-service.sh install.sh 2>/dev/null || true
echo -e "${GREEN}✓ Scripts are executable${NC}"

# Build the application
echo ""
echo -e "${BLUE}Building application for production...${NC}"
if npm run build; then
    echo -e "${GREEN}✓ Build complete${NC}"
else
    echo -e "${YELLOW}Warning: Build failed. You may need to configure .env first.${NC}"
    echo -e "${YELLOW}You can build later with: cd $INSTALL_DIR && npm run build${NC}"
fi

# Set up systemd service
echo ""
echo -e "${BLUE}=========================================="
echo "Setting up systemd service"
echo "==========================================${NC}"
echo ""

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

echo "Detected paths:"
echo "  Node.js: $NODE_PATH"
echo "  npm: $NPM_PATH"
echo ""

# Ask for port (default 3000)
read -p "Enter port number (default: 3000): " PORT
PORT=${PORT:-3000}

# Create service file
SERVICE_FILE="$INSTALL_DIR/vexproject.service"
echo ""
echo "Creating service file..."

# Use EnvironmentFile to load .env if it exists
ENV_FILE_LINE=""
if [ -f "$INSTALL_DIR/.env" ]; then
    ENV_FILE_LINE="EnvironmentFile=$INSTALL_DIR/.env"
fi

cat > "$SERVICE_FILE" << EOF
[Unit]
Description=VEX Project Management Application
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$INSTALL_DIR
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
        sudo systemctl status vexproject.service --no-pager -l | head -20
        
        echo ""
        echo -e "${GREEN}=========================================="
        echo "Installation and Setup Complete!"
        echo "==========================================${NC}"
        echo ""
        echo "Your application is running at: http://localhost:$PORT"
        echo ""
        echo "Useful commands:"
        echo "  Check status:  sudo systemctl status vexproject.service"
        echo "  View logs:     sudo journalctl -u vexproject.service -f"
        echo "  Restart:       sudo systemctl restart vexproject.service"
        echo "  Stop:          sudo systemctl stop vexproject.service"
        echo ""
    else
        echo ""
        echo -e "${GREEN}=========================================="
        echo "Installation and Setup Complete!"
        echo "==========================================${NC}"
        echo ""
        echo "To start the service, run:"
        echo "  sudo systemctl start vexproject.service"
        echo ""
        echo "Useful commands:"
        echo "  Check status:  sudo systemctl status vexproject.service"
        echo "  View logs:     sudo journalctl -u vexproject.service -f"
        echo ""
    fi
else
    echo ""
    echo -e "${GREEN}=========================================="
    echo "Installation Complete!"
    echo "==========================================${NC}"
    echo ""
    echo "Application installed to: $INSTALL_DIR"
    echo ""
    echo "To install the service later, run:"
    echo "  cd $INSTALL_DIR"
    echo "  ./setup-service.sh"
    echo ""
    echo "Or manually:"
    echo "  1. Review the service file: $SERVICE_FILE"
    echo "  2. Copy it: sudo cp $SERVICE_FILE /etc/systemd/system/"
    echo "  3. Reload: sudo systemctl daemon-reload"
    echo "  4. Enable: sudo systemctl enable vexproject.service"
    echo "  5. Start: sudo systemctl start vexproject.service"
    echo ""
fi

echo ""
echo -e "${YELLOW}Important: Make sure your .env file is configured!${NC}"
echo "  nano $INSTALL_DIR/.env"
echo ""
echo "If you need to set up the database:"
echo "  cd $INSTALL_DIR"
echo "  npm run db:push"
echo ""

