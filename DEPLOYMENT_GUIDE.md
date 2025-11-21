# Quick Deployment Guide

## Repository

This project is hosted at: **https://github.com/keberling/vexproject.git**

## Initial Setup (First Time)

**One-Command Installation:**

The `install.sh` script does everything - clones the repo, installs dependencies, and sets up the service. Run it from anywhere:

```bash
# Download the install script
curl -O https://raw.githubusercontent.com/keberling/vexproject/main/install.sh
# Or if you have the repo cloned:
# cd vexproject

# Make it executable and run
chmod +x install.sh
./install.sh
```

**What the install script does:**
- ✅ Clones repository to `/opt/vexproject`
- ✅ Installs all dependencies
- ✅ Generates Prisma client
- ✅ Creates .env file from .env.example (if available)
- ✅ Builds the application
- ✅ Sets up systemd service
- ✅ Optionally starts the service

**Manual Installation (if needed):**

```bash
# Clone directly to /opt
sudo mkdir -p /opt
sudo chown $USER:$USER /opt
git clone https://github.com/keberling/vexproject.git /opt/vexproject
cd /opt/vexproject

# Install dependencies
npm install

# Set up database
npm run db:generate
npm run db:push

# Configure .env file
nano .env

# Run the install script to set up service
./install.sh
```

## Quick Deploy (Recommended)

After initial setup, you can run the deploy script from anywhere:

```bash
./deploy.sh
```

Or if you're in a different directory:

```bash
/opt/vexproject/deploy.sh
```

The script will automatically:
- Find your application at `/opt/vexproject` (or current directory)
- Pull latest code from git (https://github.com/keberling/vexproject.git)
- Install dependencies
- Generate Prisma client
- Build the application
- Restart the service

## First-Time Service Setup

If you haven't set up the service yet:

```bash
# Run the setup script
./setup-service.sh
```

This will:
- Check prerequisites (Node.js, npm)
- Build the application
- Create and install the systemd service
- Optionally start the service

## Manual Deployment Steps

If you prefer to deploy manually:

```bash
# 1. Navigate to installation directory
cd /opt/vexproject

# 2. Pull latest code from GitHub
git pull origin main
# Or if using master branch:
# git pull origin master

# 3. Install dependencies
npm install

# 4. Generate Prisma client
npm run db:generate

# 5. Build for production
npm run build

# 6. Restart service
sudo systemctl restart vexproject.service
```

## Setting Up Git Remote

If your local repository doesn't have the remote configured:

```bash
# Check current remote
git remote -v

# Add the remote if missing
git remote add origin https://github.com/keberling/vexproject.git

# Or update existing remote
git remote set-url origin https://github.com/keberling/vexproject.git

# Verify
git remote -v
```

## Verify Deployment

After deploying, check that everything is working:

```bash
# Check service status
sudo systemctl status vexproject.service

# View recent logs
sudo journalctl -u vexproject.service -n 50

# Follow logs in real-time
sudo journalctl -u vexproject.service -f

# Test the application
curl http://localhost:3000
# Or open in browser: http://your-server-ip:3000
```

## Troubleshooting

### Service won't start
```bash
# Check logs for errors
sudo journalctl -u vexproject.service -n 100

# Verify .env file exists and is configured
cat .env

# Check if port is in use
sudo netstat -tulpn | grep :3000
```

### Build fails
```bash
# Check for TypeScript errors
npm run lint

# Verify Node.js version (needs 18+)
node --version

# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

### Database issues
```bash
# Regenerate Prisma client
npm run db:generate

# Check database file exists
ls -la prisma/dev.db

# Verify database path in .env
grep DATABASE_URL .env
```

## Common Commands

| Command | Purpose |
|---------|---------|
| `./deploy.sh` | Deploy latest changes |
| `sudo systemctl status vexproject.service` | Check service status |
| `sudo systemctl restart vexproject.service` | Restart service |
| `sudo journalctl -u vexproject.service -f` | View live logs |
| `npm run build` | Build application |
| `npm start` | Start manually (not as service) |

## Installation Location

The application is installed to: **`/opt/vexproject`**

This is the standard location for system-wide applications on Linux. The deploy script will automatically find and use this location.

## Notes

- The application installs to `/opt/vexproject` by default
- The deploy script **preserves your database** - it does NOT run `db:push`
- If you have schema changes, run `npm run db:push` manually after deployment
- Make sure your `.env` file is configured before deploying
- The service automatically restarts on crash (configured in systemd)
- Repository: https://github.com/keberling/vexproject.git
- You can run `deploy.sh` from anywhere - it will find `/opt/vexproject` automatically

## Updating from GitHub

To get the latest changes from the repository:

```bash
# Use the deploy script (recommended)
./deploy.sh

# Or manually
cd /opt/vexproject
git pull origin main
./deploy.sh
```

