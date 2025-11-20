# Ubuntu Service Setup Guide

This guide explains how to set up the VEX Project Management application as a systemd service on Ubuntu, so it automatically starts on boot and runs in the background.

## Prerequisites

- Ubuntu 18.04 or later
- Node.js 18+ installed
- npm installed
- Application already built and configured

## Step 1: Install Node.js (if not already installed)

```bash
# Update package index
sudo apt update

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

## Step 2: Prepare Your Application

1. **Clone or copy your application** to a suitable location (e.g., `/opt/vexproject` or `/home/youruser/vexproject`):

```bash
# Example: if your app is in /home/youruser/vexproject
cd /home/youruser/vexproject
```

2. **Install dependencies**:

```bash
npm install
```

3. **Generate Prisma client**:

```bash
npm run db:generate
```

4. **Set up database** (if needed):

```bash
npm run db:push
```

5. **Build the application**:

```bash
npm run build
```

6. **Create and configure `.env` file**:

```bash
# Copy example env if you have one, or create new
nano .env
```

Make sure your `.env` file includes all required variables (see `PRODUCTION_DEPLOYMENT.md`).

## Step 3: Create a System User (Recommended)

For security, it's best to run the service as a non-root user:

```bash
# Create a system user for the application
sudo useradd -r -s /bin/false -d /opt/vexproject vexproject

# Or if you want to use your existing user directory
# Skip this step and use your existing user
```

## Step 4: Set Up Permissions

```bash
# If using dedicated user, change ownership
sudo chown -R vexproject:vexproject /opt/vexproject

# Or if using your user directory
# Make sure your user owns the directory
sudo chown -R $USER:$USER /home/youruser/vexproject

# Ensure the database directory is writable
chmod -R 755 /path/to/your/app/prisma
chmod -R 755 /path/to/your/app/uploads  # if using local uploads
```

## Step 5: Install the Systemd Service

1. **Copy the service file** to systemd directory:

```bash
# Copy the service file (adjust path as needed)
sudo cp vexproject.service /etc/systemd/system/
```

2. **Edit the service file** to match your setup:

```bash
sudo nano /etc/systemd/system/vexproject.service
```

Update the following variables in the service file:
- `WorkingDirectory`: Path to your application directory
- `User`: Your username or the system user you created
- `ExecStart`: Path to node and npm (run `which node` and `which npm` to find paths)
- `Environment`: Add any additional environment variables if needed

3. **Reload systemd** to recognize the new service:

```bash
sudo systemctl daemon-reload
```

## Step 6: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable vexproject.service

# Start the service
sudo systemctl start vexproject.service

# Check status
sudo systemctl status vexproject.service
```

## Step 7: Verify It's Working

1. **Check service status**:

```bash
sudo systemctl status vexproject.service
```

You should see `active (running)` in green.

2. **Check logs**:

```bash
# View recent logs
sudo journalctl -u vexproject.service -n 50

# Follow logs in real-time
sudo journalctl -u vexproject.service -f
```

3. **Test the application**:

Open your browser and navigate to `http://your-server-ip:3000` (or your configured port).

## Service Management Commands

### Start the service
```bash
sudo systemctl start vexproject.service
```

### Stop the service
```bash
sudo systemctl stop vexproject.service
```

### Restart the service
```bash
sudo systemctl restart vexproject.service
```

### Check service status
```bash
sudo systemctl status vexproject.service
```

### View logs
```bash
# Last 50 lines
sudo journalctl -u vexproject.service -n 50

# Follow logs
sudo journalctl -u vexproject.service -f

# Logs since today
sudo journalctl -u vexproject.service --since today

# Logs with timestamps
sudo journalctl -u vexproject.service -n 100 --no-pager
```

### Disable auto-start on boot
```bash
sudo systemctl disable vexproject.service
```

### Enable auto-start on boot
```bash
sudo systemctl enable vexproject.service
```

## Updating the Application

When you need to update the application:

```bash
# 1. Stop the service
sudo systemctl stop vexproject.service

# 2. Navigate to your app directory
cd /path/to/your/app

# 3. Pull latest changes (if using git)
git pull

# 4. Install/update dependencies
npm install

# 5. Generate Prisma client (if schema changed)
npm run db:generate

# 6. Run migrations (if needed)
npm run db:push

# 7. Rebuild the application
npm run build

# 8. Start the service
sudo systemctl start vexproject.service

# 9. Check status
sudo systemctl status vexproject.service
```

## Troubleshooting

### Service won't start

1. **Check the service file syntax**:
```bash
sudo systemctl daemon-reload
sudo systemctl status vexproject.service
```

2. **Check logs for errors**:
```bash
sudo journalctl -u vexproject.service -n 100
```

3. **Verify paths in service file**:
   - Ensure `WorkingDirectory` exists
   - Ensure `ExecStart` paths are correct
   - Run `which node` and `which npm` to verify paths

4. **Check permissions**:
```bash
# Ensure the user has access to the directory
ls -la /path/to/your/app

# Check if database file is writable
ls -la /path/to/your/app/prisma/
```

### Service starts but application doesn't work

1. **Check if port is already in use**:
```bash
sudo netstat -tulpn | grep :3000
# or
sudo ss -tulpn | grep :3000
```

2. **Check environment variables**:
```bash
# Verify .env file exists and has correct values
cat /path/to/your/app/.env
```

3. **Check application logs**:
```bash
sudo journalctl -u vexproject.service -f
```

### Database issues

1. **Ensure database directory is writable**:
```bash
chmod -R 755 /path/to/your/app/prisma
```

2. **Check database path in .env**:
```bash
grep DATABASE_URL /path/to/your/app/.env
```

### Permission denied errors

1. **Check file ownership**:
```bash
ls -la /path/to/your/app
```

2. **Fix ownership if needed**:
```bash
sudo chown -R youruser:youruser /path/to/your/app
```

## Running Behind a Reverse Proxy (Nginx)

For production, you'll likely want to run the application behind Nginx for HTTPS and better performance.

### Install Nginx

```bash
sudo apt install nginx
```

### Configure Nginx

Create a configuration file:

```bash
sudo nano /etc/nginx/sites-available/vexproject
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/vexproject /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Set up SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Firewall Configuration

If you have a firewall enabled, allow the necessary ports:

```bash
# For UFW (Ubuntu Firewall)
sudo ufw allow 3000/tcp  # Direct access (not recommended for production)
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw reload
```

## Additional Notes

- The service will automatically restart if it crashes (see `Restart=always` in service file)
- Logs are managed by systemd and can be viewed with `journalctl`
- The service runs in the background and doesn't require a terminal session
- Make sure to update your `.env` file with production values before starting the service
- Consider setting up log rotation for systemd logs if you expect high log volume

## Quick Setup Script

For convenience, you can use the provided setup script (if available) to automate some of these steps:

```bash
# Make script executable
chmod +x setup-service.sh

# Run the script (adjust as needed)
./setup-service.sh
```

