// Microsoft SSO Integration
// This file contains legacy MSAL code that is no longer used.
// The application now uses NextAuth.js v5 with Azure AD provider.
// See auth.ts for the current authentication implementation.

/*
import { ConfidentialClientApplication } from '@azure/msal-node'

const msalConfig = {
  auth: {
    clientId: process.env.MICROSOFT_CLIENT_ID!,
    authority: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}`,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
  },
}

export async function getMicrosoftAuthUrl(redirectUri: string): Promise<string> {
  const pca = new ConfidentialClientApplication(msalConfig)
  const authCodeUrlParameters = {
    scopes: ['User.Read'],
    redirectUri,
  }
  
  const response = await pca.getAuthCodeUrl(authCodeUrlParameters)
  return response
}

export async function acquireTokenByCode(code: string, redirectUri: string) {
  const pca = new ConfidentialClientApplication(msalConfig)
  const tokenRequest = {
    code,
    scopes: ['User.Read'],
    redirectUri,
  }
  
  const response = await pca.acquireTokenByCode(tokenRequest)
  return response
}
*/

export {} // Placeholder export to make this a module

