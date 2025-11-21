# How to Get Your SharePoint Site ID

## Quick Answer
The `SHAREPOINT_SITE_ID` is a **GUID** (not a URL) that looks like:
```
12345678-1234-1234-1234-123456789abc
```

## Is it Required?
**No!** If you leave it empty or don't set it, the app will use your default SharePoint site (OneDrive for Business). This works for most users.

## Methods to Get the Site ID

### Method 1: Using Microsoft Graph Explorer (Easiest)

1. Go to https://developer.microsoft.com/graph/graph-explorer
2. Sign in with your Microsoft account
3. In the query box, enter:
   ```
   https://graph.microsoft.com/v1.0/sites/{your-site-url}
   ```
   Replace `{your-site-url}` with your SharePoint site URL, for example:
   ```
   https://graph.microsoft.com/v1.0/sites/yourcompany.sharepoint.com:/sites/YourSiteName
   ```
   Or just:
   ```
   https://graph.microsoft.com/v1.0/sites/yourcompany.sharepoint.com
   ```
4. Click **Run query**
5. Look for the `id` field in the response - that's your Site ID!

### Method 2: Using PowerShell

```powershell
# Install Microsoft Graph PowerShell module (if not already installed)
Install-Module Microsoft.Graph -Scope CurrentUser

# Connect to Microsoft Graph
Connect-MgGraph -Scopes "Sites.Read.All"

# Get site ID
$siteUrl = "https://yourcompany.sharepoint.com/sites/YourSiteName"
$site = Get-MgSite -SiteId $siteUrl
Write-Host "Site ID: $($site.Id)"
```

### Method 3: From SharePoint Site Settings

1. Go to your SharePoint site
2. Click the **Settings** gear icon (top right)
3. Click **Site information**
4. The Site ID might be visible in the details, or you can:
   - Right-click and "Inspect" the page
   - Look in the Network tab for API calls
   - The Site ID will be in API responses

### Method 4: Using Browser Console

1. Go to your SharePoint site
2. Open Developer Tools (F12)
3. Go to Console tab
4. Run this JavaScript:
   ```javascript
   _spPageContextInfo.siteId
   ```
   This will display the Site ID

## Example

If your SharePoint site URL is:
```
https://contoso.sharepoint.com/sites/Projects
```

Your Site ID might be something like:
```
abc12345-def6-7890-ghij-klmnopqrstuv
```

## For Most Users

**You don't need to set this!** Just leave it empty:
```env
# SHAREPOINT_SITE_ID=""
```

The app will automatically use your default SharePoint site, which is usually what you want.

