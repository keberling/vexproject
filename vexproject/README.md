# VEX Project Management Software

A professional project management system for tracking low voltage installations across the US.

## Features

- **Project Management**: Track projects with customizable milestones and statuses
- **Milestone Tracking**: Monitor progress through various stages (Initial Contact, Quote Sent/Approved, Payments, Part Procurement, etc.)
- **Calendar Integration**: Built-in calendar for scheduling installations and events
- **User Authentication**: Secure login system with JWT and Microsoft SSO (NextAuth.js v5)
- **File Management**: Upload and manage project files and photos with automatic SharePoint integration
- **Theme Support**: Light and dark mode toggle with size mode (small/large)
- **Microsoft Integration**: Full Microsoft SSO authentication, SharePoint file storage, and profile pictures
- **Admin Dashboard**: User management, database backup/restore, and scheduled backups
- **Scheduled Backups**: Automated backups with configurable frequency (10min, 30min, hourly, daily, weekly)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up the database:
```bash
npm run db:generate
npm run db:push
```

The database uses SQLite (embedded, no installation required). The database file will be created at `prisma/dev.db`.

4. Create a `.env` file (if it doesn't exist) and update with your configuration:
   ```env
   # Database
   DATABASE_URL="file:./prisma/dev.db"
   
   # JWT Secret (generate a random secret)
   JWT_SECRET="your-secret-key-here"
   
   # Microsoft SSO (optional but recommended)
   AZURE_AD_CLIENT_ID="your-client-id"
   AZURE_AD_CLIENT_SECRET="your-client-secret"
   AZURE_AD_TENANT_ID="your-tenant-id"
   SHAREPOINT_SITE_ID="your-site-id"
   
   # NextAuth
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-nextauth-secret"
   AUTH_TRUST_HOST="true"
   
   # Admin Backup Secret (for scheduled backups)
   ADMIN_BACKUP_SECRET="your-backup-secret"
   
   # Initial Admin User (email of user to set as admin on startup)
   INITIAL_ADMIN_EMAIL="admin@example.com"
   ```
   
   **Note**: Set `INITIAL_ADMIN_EMAIL` to the email of a user you want to be an admin. The user must exist in the database first (create them by signing up), then they will automatically be set as admin when the server starts or when you run `npm run db:seed`.
   
   See `MICROSOFT_SSO_SETUP.md` for detailed Microsoft SSO setup instructions.

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Production Deployment

For production, use these commands:

```bash
# Build for production
npm run build

# Start production server
npm start
```

See `PRODUCTION_DEPLOYMENT.md` for detailed production deployment instructions.

### Running as a Service on Ubuntu

To run the application as a systemd service on Ubuntu (automatically starts on boot):

1. **Quick setup** (recommended):
   ```bash
   ./setup-service.sh
   ```

2. **Manual setup**: See `UBUNTU_SERVICE_SETUP.md` for detailed instructions.

The setup includes:
- Automatic startup on boot
- Automatic restart on crash
- Log management via systemd
- Easy service management commands

## Default Milestones

- Initial Contact
- Quote Sent
- Quote Approved
- Contract Signed
- Payment Received
- Parts Ordered
- Parts Received
- Installation Scheduled
- Installation In Progress
- Installation Complete
- Final Inspection
- Project Complete

## Microsoft Integration

Microsoft SSO and SharePoint integration are fully enabled. To set up:

1. Configure Microsoft Azure AD app registration (see `MICROSOFT_SSO_SETUP.md` for detailed instructions)
2. Add Microsoft-related environment variables to `.env`:
   - `AZURE_AD_CLIENT_ID`
   - `AZURE_AD_CLIENT_SECRET`
   - `AZURE_AD_TENANT_ID`
   - `SHAREPOINT_SITE_ID` (optional, for SharePoint file storage)
3. Users can sign in with Microsoft SSO
4. Files are automatically uploaded to SharePoint when Microsoft SSO is configured
5. Profile pictures are automatically fetched from Microsoft for SSO users

## Tech Stack

- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: SQLite (Prisma ORM) - Embedded, no installation required
- **Authentication**: JWT and Microsoft SSO (NextAuth.js v5)
- **UI Components**: Radix UI

