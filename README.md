# VEX Project Management Software

A professional project management system for tracking low voltage installations across the US.

## Features

- **Project Management**: Track projects with customizable milestones and statuses
- **Milestone Tracking**: Monitor progress through various stages (Initial Contact, Quote Sent/Approved, Payments, Part Procurement, etc.)
- **Calendar Integration**: Built-in calendar for scheduling installations and events
- **User Authentication**: Secure login system with JWT authentication
- **File Management**: Upload and manage project files and photos
- **Theme Support**: Light and dark mode toggle
- **Microsoft Integration Ready**: Placeholder support for Microsoft SSO and SharePoint (disabled by default)

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

3. Create a `.env` file from `.env.example`:
```bash
cp .env.example .env
```

4. Update the `.env` file with your configuration (especially `JWT_SECRET`)

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

Microsoft SSO and SharePoint integration are disabled by default. To enable:

1. Uncomment the Microsoft-related environment variables in `.env`
2. Add your Microsoft App credentials
3. Install required packages:
   ```bash
   npm install @azure/msal-node @azure/msal-browser @microsoft/microsoft-graph-client @azure/identity
   ```
4. Uncomment the integration code in:
   - `lib/microsoft-auth.ts` for SSO authentication
   - `lib/sharepoint.ts` for file uploads
   - Update the authentication routes to use Microsoft SSO
   - Update the file upload API to use SharePoint

## Tech Stack

- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: SQLite (Prisma ORM)
- **Authentication**: JWT (with Microsoft SSO placeholder)
- **UI Components**: Radix UI

