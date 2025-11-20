# Production Deployment Guide

## Production Commands

### Building for Production

```bash
npm run build
```

This command:
- Compiles and optimizes your Next.js application
- Creates an optimized production build in the `.next` folder
- Checks for build errors
- Takes a few minutes to complete

### Running Production Server

After building, start the production server:

```bash
npm start
```

This runs the optimized production build on port 3000 (or the port specified in `PORT` environment variable).

## Complete Production Workflow

```bash
# 1. Install dependencies (if not already done)
npm install

# 2. Generate Prisma client
npm run db:generate

# 3. Set up database (if needed)
npm run db:push

# 4. Build for production
npm run build

# 5. Start production server
npm start
```

## Production Environment Variables

Make sure your `.env` file (or production environment variables) includes:

```env
# Database
DATABASE_URL="file:./prisma/dev.db"  # Or your production database URL

# JWT Secret (use a strong, random secret in production)
JWT_SECRET="your-production-secret-key"

# Microsoft Azure AD (if using SSO)
AZURE_AD_CLIENT_ID="your-client-id"
AZURE_AD_CLIENT_SECRET="your-client-secret"
AZURE_AD_TENANT_ID="your-tenant-id"

# NextAuth (v5)
AUTH_URL="https://yourdomain.com"  # Your production domain
AUTH_TRUST_HOST="false"  # Set to "true" only in development
# Legacy (still works)
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="your-production-nextauth-secret"

# SharePoint (recommended for production)
SHAREPOINT_SITE_ID="your-sharepoint-site-id"
SHAREPOINT_DRIVE_ID=""  # Optional, usually not needed

# Admin Backup Secret (for scheduled backups)
ADMIN_BACKUP_SECRET="your-secure-backup-secret"

# Initial Admin User (email of user to set as admin on startup)
INITIAL_ADMIN_EMAIL="admin@example.com"
```

## Production Considerations

### 1. Database
- **SQLite**: Works for small deployments, but consider PostgreSQL or MySQL for production
- Make sure the database file is in a persistent location
- Back up your database regularly

### 2. File Storage
- **Local uploads**: Make sure the `uploads/` directory is writable and persistent
- **SharePoint**: Recommended for production (automatic backups, cloud storage)

### 3. Environment Variables
- Never commit `.env` files to version control
- Use secure secret management in production (Azure Key Vault, AWS Secrets Manager, etc.)
- Rotate secrets regularly

### 4. HTTPS
- Production should always use HTTPS
- Update `NEXTAUTH_URL` to use `https://`
- Update Azure AD redirect URI to use `https://`

### 5. Process Management

For production, use a process manager like PM2:

```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start npm --name "vexproject" -- start

# Or create ecosystem file
pm2 start ecosystem.config.js
```

### 6. Running on a Different Port

```bash
# Set PORT environment variable
PORT=8080 npm start

# Or with PM2
PORT=8080 pm2 start npm --name "vexproject" -- start
```

## Deployment Platforms

### Vercel (Recommended for Next.js)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on push

### Docker

Create a `Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build
RUN npm run db:generate

EXPOSE 3000

CMD ["npm", "start"]
```

### Traditional Server (Linux/Windows)

1. Build on server: `npm run build`
2. Use PM2 or systemd to keep it running
3. Set up reverse proxy (nginx/Apache) for HTTPS
4. Configure firewall rules

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server (hot reload) |
| `npm run build` | Build for production |
| `npm start` | Run production server |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to database |
| `npm run db:studio` | Open Prisma Studio (database GUI) |

## Troubleshooting Production

### Build Fails
- Check for TypeScript errors: `npm run lint`
- Ensure all dependencies are installed: `npm install`
- Check Node.js version (requires 18+)

### Server Won't Start
- Verify `.env` file exists and has all required variables
- Check if port 3000 is already in use
- Ensure database is accessible
- Check logs for specific error messages

### Database Issues
- Make sure Prisma client is generated: `npm run db:generate`
- Verify database file exists and is writable
- Check database path in `DATABASE_URL`

