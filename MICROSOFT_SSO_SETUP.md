# Microsoft SSO and SharePoint Integration Setup Guide

This guide will help you set up Microsoft Single Sign-On (SSO) and SharePoint file storage for the VEX Project Management application.

## Prerequisites

- A Microsoft 365 account with admin access
- Access to Azure Portal (https://portal.azure.com)
- A SharePoint site where files will be stored

## Step 1: Register Application in Azure AD

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Fill in the details:
   - **Name**: VEX Project Management (or your preferred name)
   - **Supported account types**: **IMPORTANT** - Select **"Accounts in this organizational directory only"** (Single tenant)
     - ⚠️ **Do NOT select "Multi-tenant"** - This app is configured for single-tenant only
     - ⚠️ **Do NOT select "Accounts in any organizational directory"** - This will cause errors
   - **Redirect URI**: 
     - Type: **Web**
     - URI: `http://localhost:3000/api/auth/callback/azure-ad` (for development)
     - For production: `https://yourdomain.com/api/auth/callback/azure-ad`
     - ⚠️ **CRITICAL**: This must match EXACTLY or you'll get "No reply address is registered" error
5. Click **Register**

**Important**: After registration, make sure your app is set to **Single tenant**. You can verify this in:
- **Authentication** > **Supported account types** should show "My organization only"

### Adding Redirect URI After Registration

If you need to add or modify the redirect URI after registration:

1. Go to your app registration in Azure Portal
2. Click **Authentication** in the left menu
3. Under **Platform configurations**, click **Add a platform**
4. Select **Web**
5. Add the redirect URI: `http://localhost:3000/api/auth/callback/azure-ad`
6. Click **Configure**
7. **IMPORTANT**: Make sure the redirect URI is listed under "Redirect URIs" and is enabled

## Step 2: Configure API Permissions

1. In your app registration, go to **API permissions**
2. Click **Add a permission**
3. Select **Microsoft Graph**
4. Select **Delegated permissions**
5. Add the following permissions:
   - `openid` (usually added automatically)
   - `profile` (usually added automatically)
   - `email` (usually added automatically)
   - `User.Read`
   - `Files.ReadWrite.All`
   - `Sites.ReadWrite.All`
   - `offline_access`
6. Click **Add permissions**
7. Click **Grant admin consent** (if you're an admin) to grant permissions for all users

## Step 3: Create Client Secret

1. In your app registration, go to **Certificates & secrets**
2. Click **New client secret**
3. Add a description (e.g., "VEX App Secret")
4. Choose expiration period
5. Click **Add**
6. **IMPORTANT**: Copy the secret value immediately (you won't be able to see it again)

## Step 4: Get Application Details

From your app registration overview page, copy:
- **Application (client) ID**
- **Directory (tenant) ID**

## Step 5: Configure Environment Variables

Create or update your `.env` file with the following:

```env
# Microsoft Azure AD Configuration
AZURE_AD_CLIENT_ID="your-application-client-id"
AZURE_AD_CLIENT_SECRET="your-client-secret-value"
AZURE_AD_TENANT_ID="your-tenant-id"

# NextAuth Configuration
# For NextAuth v5, use AUTH_URL instead of NEXTAUTH_URL
AUTH_URL="http://localhost:3000"
# Trust host in development (set to "true" or "1" for localhost)
AUTH_TRUST_HOST="true"
# Legacy NEXTAUTH_URL (still works but AUTH_URL is preferred)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-a-random-string-here"

# SharePoint Configuration (Optional - leave empty to use default site)
# For most users, you can leave these empty - the app will use your default SharePoint site
# Only set these if you want to use a specific SharePoint site
# See Step 6 below for instructions on how to get these values
SHAREPOINT_SITE_ID=""
SHAREPOINT_DRIVE_ID=""
```

### Generating NEXTAUTH_SECRET

You can generate a secure random string using:
```bash
openssl rand -base64 32
```

Or use an online generator: https://generate-secret.vercel.app/32

## Step 6: Get SharePoint Site Information (Optional)

**Note**: These are optional! If you don't specify them, the app will use your default SharePoint site (OneDrive for Business).

### Option 1: Use Default SharePoint Site (Recommended for most users)
Simply **omit** these environment variables or leave them empty:
```env
# SHAREPOINT_SITE_ID=""
# SHAREPOINT_DRIVE_ID=""
```
The app will automatically use your default SharePoint site.

### Option 2: Use a Specific SharePoint Site

If you want to use a specific SharePoint site (like a team site), you need to get the Site ID:

#### Method 1: From SharePoint Site URL
1. Go to your SharePoint site (e.g., `https://yourcompany.sharepoint.com/sites/YourSiteName`)
2. The Site ID is a GUID that looks like: `abc12345-def6-7890-ghij-klmnopqrstuv`
3. You can find it in the URL when viewing site settings, or use the Microsoft Graph API

#### Method 2: Using Microsoft Graph API (PowerShell)
```powershell
# Connect to Microsoft Graph
Connect-MgGraph -Scopes "Sites.Read.All"

# Get your site ID
$siteUrl = "https://yourcompany.sharepoint.com/sites/YourSiteName"
$site = Get-MgSite -SiteId $siteUrl
$site.Id  # This is your SHAREPOINT_SITE_ID
```

#### Method 3: Using Browser Developer Tools
1. Go to your SharePoint site
2. Open browser Developer Tools (F12)
3. Go to the Network tab
4. Navigate around the site
5. Look for API calls to `/_api/site` or Graph API calls
6. The Site ID will be in the response or URL

#### Method 4: From SharePoint Admin Center
1. Go to SharePoint Admin Center
2. Navigate to **Active sites**
3. Click on your site
4. The Site ID is shown in the site details

### What is the Site ID?
- It's a **GUID** (Globally Unique Identifier), not the URL
- Format: `12345678-1234-1234-1234-123456789abc`
- It uniquely identifies your SharePoint site

### Drive ID (Optional)
The Drive ID is typically the same as the Site ID for most SharePoint sites, or you can leave it empty and the app will use the default drive.

## Step 7: Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to the login page
3. Click **Sign in with Microsoft**
4. Complete the Microsoft authentication flow
5. You should be redirected back to the dashboard

## File Storage Behavior

- **Users with Microsoft SSO**: Files are automatically uploaded to SharePoint in a folder structure: `/Projects/{ProjectName}/`
- **Users without Microsoft SSO**: Files are stored locally in the `uploads/` directory

## Troubleshooting

### "Invalid client secret"
- Make sure you copied the secret value (not the secret ID)
- Check if the secret has expired
- Create a new secret if needed

### "Redirect URI mismatch"
- Ensure the redirect URI in Azure AD matches exactly: `http://localhost:3000/api/auth/callback/azure-ad`
- For production, update both the Azure AD app and your `.env` file

### "Insufficient privileges"
- Make sure you've granted admin consent for all required permissions
- Check that the permissions are "Delegated" (not "Application")

### SharePoint upload fails
- Verify the user has access to the SharePoint site
- Check that `Files.ReadWrite.All` and `Sites.ReadWrite.All` permissions are granted
- The app will fall back to local storage if SharePoint upload fails

### Files not appearing in SharePoint
- Check the SharePoint site's document library
- Files are organized in: `Projects/{ProjectName}/`
- Verify the user has write permissions to the SharePoint site

## Production Deployment

For production:

1. Update the redirect URI in Azure AD to your production domain
2. Update `NEXTAUTH_URL` in your production environment variables
3. Ensure all environment variables are set in your hosting platform
4. Use secure, randomly generated secrets
5. Enable HTTPS (required for secure cookies)

## Security Notes

- Never commit `.env` files to version control
- Rotate client secrets regularly
- Use environment-specific configurations
- Monitor access logs for suspicious activity
- Consider using Azure Key Vault for storing secrets in production

