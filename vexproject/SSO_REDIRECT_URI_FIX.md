# Fix: "No reply address is registered for the application"

This error occurs when the redirect URI is not configured in your Azure AD app registration.

## Quick Fix:

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click on your app (VEXProject or your app name)
4. Click **Authentication** in the left menu
5. Under **Platform configurations**, you should see a section for **Web**
6. If you don't see a Web platform, click **Add a platform** and select **Web**
7. In the **Redirect URIs** section, add:
   ```
   http://localhost:3000/api/auth/callback/azure-ad
   ```
8. Click **Save**

## Important Notes:

- The redirect URI must match **EXACTLY** (including `http://` vs `https://`)
- For development: `http://localhost:3000/api/auth/callback/azure-ad`
- For production: `https://yourdomain.com/api/auth/callback/azure-ad`
- Make sure there are no trailing slashes
- The URI is case-sensitive

## Verify It's Working:

After adding the redirect URI:
1. Save the changes in Azure Portal
2. Wait a few seconds for changes to propagate
3. Try signing in with Microsoft again
4. The error should be resolved

## If You Still Get the Error:

1. Double-check the redirect URI matches exactly
2. Make sure you saved the changes in Azure Portal
3. Clear your browser cache and cookies
4. Try in an incognito/private window
5. Wait 1-2 minutes for Azure AD changes to propagate

