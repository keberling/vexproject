# Production Troubleshooting Guide

## Site Not Reachable After Code Merge

If your site at `https://project.vexitey.com` is not reachable after merging code, follow these steps:

### Quick Diagnostic Script

Run the troubleshooting script on your server:

```bash
chmod +x troubleshoot.sh
./troubleshoot.sh
```

### Manual Troubleshooting Steps

#### 1. Check Service Status

```bash
# Check if service is running
sudo systemctl status vexproject.service

# If not running, check why
sudo journalctl -u vexproject.service -n 100 --no-pager
```

#### 2. Check Application Logs

```bash
# View recent logs
sudo journalctl -u vexproject.service -f

# Or view last 100 lines
sudo journalctl -u vexproject.service -n 100
```

#### 3. Verify Application is Running

```bash
# Check if port 3000 is listening
sudo netstat -tuln | grep 3000
# or
sudo ss -tuln | grep 3000

# Check for Node.js processes
ps aux | grep node
```

#### 4. Test Local Connection

```bash
# Test if app responds locally
curl http://localhost:3000

# Should return HTML or redirect
```

#### 5. Check Build Status

```bash
# Verify build exists
ls -la .next/

# If missing, rebuild
npm run build
```

#### 6. Check Environment Variables

```bash
# Verify .env file exists and has correct values
cat .env | grep NEXTAUTH_URL
cat .env | grep DATABASE_URL

# NEXTAUTH_URL should be: https://project.vexitey.com
# AUTH_TRUST_HOST should be: false (in production)
```

#### 7. Check Caddy Configuration

```bash
# Check Caddy status
sudo systemctl status caddy

# View Caddyfile
sudo cat /etc/caddy/Caddyfile | grep -A 10 "project.vexitey.com"

# Test Caddy config
sudo caddy validate --config /etc/caddy/Caddyfile

# Reload Caddy if needed
sudo systemctl reload caddy
```

#### 8. Common Issues and Fixes

##### Issue: Service crashed after code merge

**Fix:**
```bash
# Restart the service
sudo systemctl restart vexproject.service

# Check logs for errors
sudo journalctl -u vexproject.service -n 50
```

##### Issue: Build failed or missing

**Fix:**
```bash
# Rebuild the application
npm run build

# If build fails, check for errors
npm run build 2>&1 | tee build.log
```

##### Issue: Database connection error

**Fix:**
```bash
# Verify database file exists
ls -la prisma/dev.db

# Check DATABASE_URL in .env
cat .env | grep DATABASE_URL

# Regenerate Prisma client
npm run db:generate
```

##### Issue: Port conflict

**Fix:**
```bash
# Check what's using port 3000
sudo lsof -i :3000

# Kill conflicting process if needed
sudo kill -9 <PID>

# Restart service
sudo systemctl restart vexproject.service
```

##### Issue: Environment variables missing

**Fix:**
```bash
# Check .env file
cat .env

# Ensure these are set:
# - NEXTAUTH_URL=https://project.vexitey.com
# - AUTH_TRUST_HOST=false
# - DATABASE_URL=file:./prisma/dev.db
# - JWT_SECRET=...
# - NEXTAUTH_SECRET=...
```

##### Issue: Caddy not proxying correctly

**Fix:**
```bash
# Check Caddyfile configuration
sudo cat /etc/caddy/Caddyfile

# Example Caddyfile should have:
# project.vexitey.com {
#     reverse_proxy localhost:3000
# }

# Reload Caddy
sudo systemctl reload caddy

# Or restart
sudo systemctl restart caddy
```

### Complete Recovery Steps

If nothing works, try this complete recovery:

```bash
# 1. Stop service
sudo systemctl stop vexproject.service

# 2. Pull latest code (if not done)
git pull

# 3. Install dependencies
npm install

# 4. Generate Prisma client
npm run db:generate

# 5. Build application
npm run build

# 6. Verify .env file
cat .env

# 7. Start service
sudo systemctl start vexproject.service

# 8. Check status
sudo systemctl status vexproject.service

# 9. Test locally
curl http://localhost:3000

# 10. Reload Caddy
sudo systemctl reload caddy
```

### Getting Help

If issues persist, collect this information:

```bash
# Service status
sudo systemctl status vexproject.service > service-status.txt

# Recent logs
sudo journalctl -u vexproject.service -n 200 > service-logs.txt

# Build output (if rebuilding)
npm run build > build-output.txt 2>&1

# Environment check (remove secrets)
cat .env | sed 's/=.*/=***/' > env-check.txt

# Caddy status
sudo systemctl status caddy > caddy-status.txt
```

### Prevention

To avoid issues after code merges:

1. **Always run the deployment script:**
   ```bash
   ./deploy.sh
   ```

2. **Check service after deployment:**
   ```bash
   sudo systemctl status vexproject.service
   ```

3. **Monitor logs:**
   ```bash
   sudo journalctl -u vexproject.service -f
   ```

4. **Test locally before deploying:**
   ```bash
   npm run build
   npm start
   ```

