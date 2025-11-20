#!/bin/bash

# Caddy Complete Reset and Setup Script
# Completely removes and reinstalls Caddy, then configures it for project.vexitey.com

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=========================================="
echo "Caddy Complete Reset and Setup"
echo "==========================================${NC}"
echo ""
echo "This script will:"
echo "  1. Stop and remove Caddy"
echo "  2. Clean up all Caddy files"
echo "  3. Reinstall Caddy"
echo "  4. Configure for project.vexitey.com -> 172.16.22.101:3000"
echo "  5. Start Caddy"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# Configuration
DOMAIN="project.vexitey.com"
BACKEND="172.16.22.101:3000"
CADDYFILE="/etc/caddy/Caddyfile"
LOG_DIR="/var/log/caddy"
LOG_FILE="$LOG_DIR/project.vexitey.com.log"

echo ""
echo -e "${BLUE}=========================================="
echo "Step 1: Stopping Caddy"
echo "==========================================${NC}"

# Stop Caddy service
if systemctl is-active --quiet caddy 2>/dev/null; then
    echo "Stopping Caddy service..."
    sudo systemctl stop caddy
    echo -e "${GREEN}✓ Caddy stopped${NC}"
else
    echo -e "${YELLOW}⚠ Caddy service not running${NC}"
fi

# Disable service
if systemctl is-enabled --quiet caddy 2>/dev/null; then
    echo "Disabling Caddy service..."
    sudo systemctl disable caddy
    echo -e "${GREEN}✓ Caddy disabled${NC}"
fi

echo ""
echo -e "${BLUE}=========================================="
echo "Step 2: Removing Caddy"
echo "==========================================${NC}"

# Detect package manager and remove Caddy
if command -v apt &> /dev/null; then
    # Debian/Ubuntu
    echo "Removing Caddy package (apt)..."
    sudo apt remove --purge -y caddy 2>/dev/null || echo -e "${YELLOW}⚠ Caddy package not found via apt${NC}"
    sudo apt autoremove -y 2>/dev/null || true
elif command -v yum &> /dev/null; then
    # CentOS/RHEL
    echo "Removing Caddy package (yum)..."
    sudo yum remove -y caddy 2>/dev/null || echo -e "${YELLOW}⚠ Caddy package not found via yum${NC}"
elif command -v dnf &> /dev/null; then
    # Fedora
    echo "Removing Caddy package (dnf)..."
    sudo dnf remove -y caddy 2>/dev/null || echo -e "${YELLOW}⚠ Caddy package not found via dnf${NC}"
else
    echo -e "${YELLOW}⚠ Could not detect package manager. Skipping package removal.${NC}"
    echo "You may need to remove Caddy manually."
fi

echo ""
echo -e "${BLUE}=========================================="
echo "Step 3: Cleaning Up Files"
echo "==========================================${NC}"

# Remove Caddy files
echo "Removing Caddy configuration and data..."

# Remove systemd service file
if [ -f "/etc/systemd/system/caddy.service" ]; then
    sudo rm -f /etc/systemd/system/caddy.service
    echo -e "${GREEN}✓ Removed systemd service file${NC}"
fi

# Remove Caddyfile
if [ -f "$CADDYFILE" ]; then
    sudo rm -f "$CADDYFILE"
    echo -e "${GREEN}✓ Removed Caddyfile${NC}"
fi

# Remove Caddy data directory (certificates, etc.)
if [ -d "/var/lib/caddy" ]; then
    sudo rm -rf /var/lib/caddy
    echo -e "${GREEN}✓ Removed Caddy data directory${NC}"
fi

# Remove Caddy user (if exists)
if id "caddy" &>/dev/null; then
    sudo userdel caddy 2>/dev/null || true
    echo -e "${GREEN}✓ Removed Caddy user${NC}"
fi

# Reload systemd
sudo systemctl daemon-reload
echo -e "${GREEN}✓ Systemd daemon reloaded${NC}"

echo ""
echo -e "${BLUE}=========================================="
echo "Step 4: Installing Caddy"
echo "==========================================${NC}"

# Detect OS and install Caddy
if command -v apt &> /dev/null; then
    # Debian/Ubuntu
    echo "Installing Caddy (Debian/Ubuntu method)..."
    
    # Add Caddy repository
    sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
    
    sudo apt update
    sudo apt install -y caddy
    
elif command -v yum &> /dev/null; then
    # CentOS/RHEL
    echo "Installing Caddy (CentOS/RHEL method)..."
    sudo yum install -y yum-plugin-copr
    sudo yum copr enable -y @caddy/caddy
    sudo yum install -y caddy
    
elif command -v dnf &> /dev/null; then
    # Fedora
    echo "Installing Caddy (Fedora method)..."
    sudo dnf install -y 'dnf-command(copr)'
    sudo dnf copr enable -y @caddy/caddy
    sudo dnf install -y caddy
    
else
    echo -e "${RED}Error: Could not detect package manager${NC}"
    echo "Please install Caddy manually:"
    echo "  Visit: https://caddyserver.com/docs/install"
    exit 1
fi

# Verify installation
if command -v caddy &> /dev/null; then
    CADDY_VERSION=$(caddy version)
    echo -e "${GREEN}✓ Caddy installed: $CADDY_VERSION${NC}"
else
    echo -e "${RED}Error: Caddy installation failed${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}=========================================="
echo "Step 5: Creating Caddyfile"
echo "==========================================${NC}"

# Create log directory with proper permissions
echo "Creating log directory..."
sudo mkdir -p "$LOG_DIR"
sudo chown caddy:caddy "$LOG_DIR" 2>/dev/null || {
    # If caddy user doesn't exist yet, create it or use root
    if ! id "caddy" &>/dev/null; then
        echo "Caddy user doesn't exist, will be created during installation"
        sudo chown root:root "$LOG_DIR"
    else
        sudo chown caddy:caddy "$LOG_DIR"
    fi
}
sudo chmod 755 "$LOG_DIR"
echo -e "${GREEN}✓ Log directory created: $LOG_DIR${NC}"

# Create Caddyfile
echo "Creating Caddyfile..."
sudo tee "$CADDYFILE" > /dev/null <<EOF
$DOMAIN {
    reverse_proxy $BACKEND {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
        header_up Connection {>Connection}
        header_up Upgrade {>Upgrade}
    }

    log {
        output file $LOG_FILE
        format json
    }
}
EOF

echo -e "${GREEN}✓ Caddyfile created at $CADDYFILE${NC}"
echo ""
echo "Caddyfile contents:"
echo "----------------------------------------"
sudo cat "$CADDYFILE"
echo "----------------------------------------"

echo ""
echo -e "${BLUE}=========================================="
echo "Step 6: Validating Configuration"
echo "==========================================${NC}"

# Validate Caddyfile
if sudo caddy validate --config "$CADDYFILE"; then
    echo -e "${GREEN}✓ Caddyfile is valid${NC}"
else
    echo -e "${RED}Error: Caddyfile validation failed${NC}"
    exit 1
fi

# Format Caddyfile
sudo caddy fmt --overwrite "$CADDYFILE"
echo -e "${GREEN}✓ Caddyfile formatted${NC}"

echo ""
echo -e "${BLUE}=========================================="
echo "Step 7: Testing Backend Connection"
echo "==========================================${NC}"

# Test backend connectivity
echo "Testing connection to $BACKEND..."
if curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://$BACKEND" | grep -qE "200|301|302|404"; then
    echo -e "${GREEN}✓ Backend is reachable${NC}"
else
    echo -e "${YELLOW}⚠ Warning: Could not reach backend at $BACKEND${NC}"
    echo "  Make sure the application is running on the backend server"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo -e "${BLUE}=========================================="
echo "Step 8: Configuring Firewall"
echo "=========================================="

# Check and configure firewall
if command -v ufw &> /dev/null; then
    echo "Configuring UFW firewall..."
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    echo -e "${GREEN}✓ Firewall rules added${NC}"
elif command -v firewall-cmd &> /dev/null; then
    echo "Configuring firewalld..."
    sudo firewall-cmd --permanent --add-service=http
    sudo firewall-cmd --permanent --add-service=https
    sudo firewall-cmd --reload
    echo -e "${GREEN}✓ Firewall rules added${NC}"
else
    echo -e "${YELLOW}⚠ No firewall detected. Make sure ports 80 and 443 are open.${NC}"
fi

echo ""
echo -e "${BLUE}=========================================="
echo "Step 9: Starting Caddy"
echo "=========================================="

# Fix log directory permissions after Caddy user is created
echo "Fixing log directory permissions..."
if id "caddy" &>/dev/null; then
    sudo chown -R caddy:caddy "$LOG_DIR"
    sudo chmod 755 "$LOG_DIR"
    echo -e "${GREEN}✓ Log directory permissions fixed${NC}"
else
    echo -e "${YELLOW}⚠ Caddy user not found, using root for logs${NC}"
fi

# Enable and start Caddy
echo "Enabling Caddy service..."
sudo systemctl enable caddy
echo -e "${GREEN}✓ Caddy enabled${NC}"

echo "Starting Caddy service..."
sudo systemctl start caddy
echo -e "${GREEN}✓ Caddy started${NC}"

# Wait a moment for startup
sleep 2

# Check status
if systemctl is-active --quiet caddy; then
    echo -e "${GREEN}✓ Caddy is running${NC}"
else
    echo -e "${RED}Error: Caddy failed to start${NC}"
    echo "Checking logs..."
    sudo journalctl -u caddy -n 20 --no-pager
    exit 1
fi

echo ""
echo -e "${BLUE}=========================================="
echo "Step 10: Verification"
echo "=========================================="

# Check if ports are listening
echo "Checking if ports 80 and 443 are listening..."
if netstat -tuln 2>/dev/null | grep -qE ':80 |:443 ' || ss -tuln 2>/dev/null | grep -qE ':80 |:443 '; then
    echo -e "${GREEN}✓ Ports 80 and 443 are listening${NC}"
    netstat -tuln 2>/dev/null | grep -E ':80|:443' || ss -tuln 2>/dev/null | grep -E ':80|:443'
else
    echo -e "${YELLOW}⚠ Ports 80 and 443 may not be listening${NC}"
fi

# Check DNS
echo ""
echo "Checking DNS resolution..."
DNS_IP=$(dig +short "$DOMAIN" | head -1)
if [ -n "$DNS_IP" ]; then
    SERVER_IP=$(hostname -I | awk '{print $1}')
    echo "  DNS resolves to: $DNS_IP"
    echo "  This server IP: $SERVER_IP"
    if [ "$DNS_IP" = "$SERVER_IP" ] || ip addr show | grep -q "$DNS_IP"; then
        echo -e "${GREEN}✓ DNS is pointing to this server${NC}"
    else
        echo -e "${YELLOW}⚠ DNS may not be pointing to this server${NC}"
        echo "  Update DNS to point $DOMAIN to this server's IP"
    fi
else
    echo -e "${YELLOW}⚠ Could not resolve DNS for $DOMAIN${NC}"
    echo "  Make sure DNS is configured correctly"
fi

# Show service status
echo ""
echo "Caddy service status:"
sudo systemctl status caddy --no-pager -l | head -15

echo ""
echo -e "${GREEN}=========================================="
echo "Caddy Reset Complete!"
echo "==========================================${NC}"
echo ""
echo "Configuration:"
echo "  Domain: $DOMAIN"
echo "  Backend: http://$BACKEND"
echo "  Caddyfile: $CADDYFILE"
echo "  Log file: $LOG_FILE"
echo ""
echo "Useful commands:"
echo "  Check status:  sudo systemctl status caddy"
echo "  View logs:     sudo journalctl -u caddy -f"
echo "  View log file: sudo tail -f $LOG_FILE"
echo "  Reload:        sudo systemctl reload caddy"
echo "  Restart:       sudo systemctl restart caddy"
echo ""
echo "Test your site:"
echo "  curl -I https://$DOMAIN"
echo "  curl -I http://$DOMAIN"
echo ""

